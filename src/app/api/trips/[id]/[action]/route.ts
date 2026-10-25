import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ALLOWED_FILE_TYPES, DOC_TYPES, GOODS_UNITS } from "@/lib/constants";
import { adminBucket, adminDb } from "@/lib/firebase/admin";
import { ApiError, handle, loadProfile, requireSession, type Session } from "@/lib/server/http";
import { sendPush } from "@/lib/server/push";
import {
  addNotification,
  loadTrip,
  newTrackingToken,
  syncTrackingToken,
  syncTripAccess,
  type NotificationInput,
} from "@/lib/server/trips";
import type { Trip, TripDocument, TripFeedback } from "@/lib/types";

type Ctx = { params: Promise<{ id: string; action: string }> };

const cancelSchema = z.object({
  reason: z.string().trim().min(1, "Enter a reason for cancelling").max(200),
});

const goodsSchema = z.object({
  goods: z
    .array(
      z.object({
        item: z.string().trim().min(1, "Enter the item name").max(80),
        quantity: z.number().positive("Quantity must be more than 0").max(1_000_000),
        unit: z.enum(GOODS_UNITS),
      }),
    )
    .max(50, "A trip can have up to 50 goods items"),
});

// Payment received: the owner's figure.
const figuresSchema = z.object({
  paymentReceived: z.number().min(0).max(100_000_000).nullable(),
});

// Fuel filled (litres) and what it cost (₹): the driver's figures, shown to the owner.
const fuelSchema = z.object({
  totalFuel: z.number().min(0).max(100_000).nullable(),
  fuelCost: z.number().min(0).max(10_000_000).nullable(),
});

const documentSchema = z.object({
  type: z.enum(["eway", "gst", "other"]),
  name: z.string().trim().max(60).default(""),
  fileName: z.string().trim().min(1).max(200),
  path: z.string().min(1),
});

const feedbackSchema = z.object({
  rating: z.number().int().min(1, "Choose a rating").max(5),
  comment: z.string().trim().max(500, "Feedback is too long").default(""),
});

/** Status only ever changes here, never from a form. */
export const POST = handle(async (req: NextRequest, ctx: Ctx) => {
  const { id, action } = await ctx.params;
  const session = await requireSession(req);
  const trip = await loadTrip(id);

  const isOwner = trip.ownerId === session.uid;
  const isDriver = trip.driverId === session.uid;
  // Same answer as "not found" so trip IDs cannot be probed.
  if (!isOwner && !isDriver) throw new ApiError(404, "Trip not found.");

  switch (action) {
    case "start":
      if (!isDriver) throw new ApiError(403, "Only the assigned driver can start this trip.");
      return startTrip(trip);
    case "end":
      if (!isDriver) throw new ApiError(403, "Only the assigned driver can end this trip.");
      return endTrip(trip);
    case "cancel":
      if (!isOwner) throw new ApiError(403, "Only the owner can cancel this trip.");
      return cancelTrip(trip, cancelSchema.parse(await req.json()).reason);
    case "goods":
      return saveGoods(trip, goodsSchema.parse(await req.json()).goods);
    case "figures":
      if (!isOwner) throw new ApiError(403, "Only the owner can edit the payment received.");
      await adminDb().doc(`trips/${id}`).update(figuresSchema.parse(await req.json()));
      return;
    case "fuel":
      if (!isDriver) throw new ApiError(403, "Only the assigned driver can enter fuel.");
      if (trip.status !== "in_progress" && trip.status !== "completed") {
        throw new ApiError(409, "Fuel can be entered once the trip has started.");
      }
      await adminDb().doc(`trips/${id}`).update(fuelSchema.parse(await req.json()));
      return;
    case "document":
      return addDocument(trip, session, documentSchema.parse(await req.json()));
    case "feedback":
      return addFeedback(trip, session, isOwner ? "owner" : "driver", feedbackSchema.parse(await req.json()));
    default:
      throw new ApiError(404, "Unknown action.");
  }
});

async function startTrip(trip: Trip) {
  const db = adminDb();
  const ref = db.doc(`trips/${trip.id}`);

  // Safe to call twice: a retry after a dropped connection just re-syncs.
  const notes: NotificationInput[] = [];
  if (trip.status !== "in_progress") {
    if (trip.status !== "scheduled") throw new ApiError(409, "Only a scheduled trip can be started.");

    const others = await db.collection("trips").where("driverId", "==", trip.driverId).get();
    if (others.docs.some((doc) => doc.id !== trip.id && doc.get("status") === "in_progress")) {
      throw new ApiError(409, "You already have a trip in progress. End it before starting another.");
    }

    const started = { status: "in_progress" as const, startedAt: Date.now(), trackingToken: newTrackingToken() };
    const note: NotificationInput = {
      userId: trip.ownerId,
      tripId: trip.id,
      tripCode: trip.tripCode,
      title: "Trip started",
      message: `Trip ${trip.tripCode} has started. Driver ${trip.driverName}, vehicle ${trip.vehicleNumber}`,
    };
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      if (fresh.get("status") !== "scheduled") throw new ApiError(409, "Only a scheduled trip can be started.");
      tx.update(ref, started);
      addNotification(tx, note);
    });
    Object.assign(trip, started);
    notes.push(note);
  }

  await Promise.all([syncTripAccess(trip), syncTrackingToken(trip), sendPush(notes)]);
  return { status: trip.status };
}

async function endTrip(trip: Trip) {
  const db = adminDb();
  const ref = db.doc(`trips/${trip.id}`);

  const notes: NotificationInput[] = [];
  if (trip.status !== "completed") {
    if (trip.status !== "in_progress") throw new ApiError(409, "Only a trip in progress can be ended.");

    const ended = { status: "completed" as const, completedAt: Date.now() };
    const note: NotificationInput = {
      userId: trip.ownerId,
      tripId: trip.id,
      tripCode: trip.tripCode,
      title: "Trip completed",
      message: `Trip ${trip.tripCode} is completed. Driver ${trip.driverName}, vehicle ${trip.vehicleNumber}`,
    };
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      if (fresh.get("status") !== "in_progress") throw new ApiError(409, "Only a trip in progress can be ended.");
      tx.update(ref, ended);
      addNotification(tx, note);
    });
    Object.assign(trip, ended);
    notes.push(note);
  }

  // Closing access stops any further GPS writes for this trip.
  await Promise.all([syncTripAccess(trip), syncTrackingToken(trip), sendPush(notes)]);
  return { status: trip.status };
}

async function cancelTrip(trip: Trip, reason: string) {
  const db = adminDb();
  const ref = db.doc(`trips/${trip.id}`);

  const note: NotificationInput = {
    userId: trip.driverId,
    tripId: trip.id,
    tripCode: trip.tripCode,
    title: "Trip cancelled",
    message: `Trip ${trip.tripCode} was cancelled by ${trip.companyName || "the owner"}.`,
  };
  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    if (fresh.get("status") !== "scheduled") throw new ApiError(409, "Only a scheduled trip can be cancelled.");
    tx.update(ref, { status: "cancelled", cancelReason: reason, cancelledAt: Date.now() });
    addNotification(tx, note);
  });

  await Promise.all([syncTripAccess({ ...trip, status: "cancelled" }), sendPush([note])]);
  return { status: "cancelled" };
}

async function saveGoods(trip: Trip, goods: z.infer<typeof goodsSchema>["goods"]) {
  if (trip.status === "completed" || trip.status === "cancelled") {
    throw new ApiError(409, "Goods cannot be changed after a trip is closed.");
  }
  await adminDb()
    .doc(`trips/${trip.id}`)
    .update({ goods: goods.map((g) => ({ id: randomUUID(), ...g })) });
}

async function addDocument(trip: Trip, session: Session, input: z.infer<typeof documentSchema>) {
  if (input.type === "other" && !input.name) throw new ApiError(400, "Enter a name for this document");
  if (!input.path.startsWith(`trips/${trip.id}/`)) throw new ApiError(400, "Invalid file. Please upload it again.");
  if (trip.documents.length >= 30) throw new ApiError(409, "A trip can have up to 30 documents.");

  const file = adminBucket().file(input.path);
  const [exists] = await file.exists();
  if (!exists) throw new ApiError(400, "Upload did not finish. Please try again.");
  const [meta] = await file.getMetadata();
  if (!ALLOWED_FILE_TYPES.includes(meta.contentType ?? "")) {
    throw new ApiError(400, "Only PDF, JPG or PNG files are allowed.");
  }

  const profile = await loadProfile(session.uid);
  const document: TripDocument = {
    id: randomUUID(),
    type: input.type,
    name: input.type === "other" ? input.name : DOC_TYPES.find((d) => d.value === input.type)!.label,
    fileName: input.fileName,
    path: input.path,
    uploadedBy: session.uid,
    uploadedByName:
      trip.ownerId === session.uid ? profile?.companyName || "Owner" : profile?.displayName || trip.driverName,
    uploadedAt: Date.now(),
  };
  await adminDb()
    .doc(`trips/${trip.id}`)
    .update({ documents: FieldValue.arrayUnion(document) });
  return { document };
}

/** Rating and comment after a completed trip. Each side gives it once, and the other side is told. */
async function addFeedback(trip: Trip, session: Session, side: "owner" | "driver", input: z.infer<typeof feedbackSchema>) {
  if (trip.status !== "completed") throw new ApiError(409, "Feedback can be given after the trip is completed.");

  const db = adminDb();
  const ref = db.doc(`trips/${trip.id}`);
  const profile = await loadProfile(session.uid);
  const feedback: TripFeedback = {
    rating: input.rating,
    comment: input.comment,
    byName: side === "owner" ? profile?.displayName || trip.companyName || "Owner" : profile?.displayName || trip.driverName,
    at: Date.now(),
  };
  const note: NotificationInput = {
    userId: side === "owner" ? trip.driverId : trip.ownerId,
    tripId: trip.id,
    tripCode: trip.tripCode,
    title: "New trip feedback",
    message: `${feedback.byName} rated trip ${trip.tripCode} ${feedback.rating} out of 5.`,
  };

  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    if (fresh.get(`feedback.${side}`)) throw new ApiError(409, "You already gave feedback for this trip.");
    tx.update(ref, { [`feedback.${side}`]: feedback });
    addNotification(tx, note);
  });
  await sendPush([note]);
  return { feedback };
}
