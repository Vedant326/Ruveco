import { z } from "zod";
import { PHONE_RE } from "@/lib/constants";
import { adminDb } from "@/lib/firebase/admin";
import { todayIST } from "@/lib/format";
import { ApiError, handle, requireRole } from "@/lib/server/http";
import { downsample, getRoute } from "@/lib/server/routing";
import { addNotification, syncTripAccess } from "@/lib/server/trips";
import type { Trip } from "@/lib/types";

const place = z.object({
  address: z.string().trim().min(1).max(300),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const schema = z
  .object({
    vehicleId: z.string().min(1, "Choose a vehicle"),
    driverId: z.string().min(1, "Choose a driver"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
    source: place,
    destination: place,
    pickupAt: z.number().int().positive(),
    deliveryAt: z.number().int().positive(),
    receiverName: z.string().trim().min(1, "Enter the receiver name").max(80),
    receiverPhone: z.string().regex(PHONE_RE, "Enter a valid 10-digit receiver phone"),
    goodsDescription: z.string().trim().max(200).default(""),
  })
  .refine((v) => v.deliveryAt > v.pickupAt, "Delivery time must be after pickup time")
  .refine(
    (v) => v.source.lat !== v.destination.lat || v.source.lng !== v.destination.lng,
    "Destination must be different from source",
  );

export const POST = handle(async (req) => {
  const { session, profile } = await requireRole(req, "owner");
  const body = schema.parse(await req.json());
  if (body.date < todayIST()) throw new ApiError(400, "Trip date cannot be in the past");

  const db = adminDb();
  const [vehicleSnap, driverSnap] = await Promise.all([
    db.doc(`vehicles/${body.vehicleId}`).get(),
    db.doc(`drivers/${body.driverId}`).get(),
  ]);
  if (!vehicleSnap.exists || vehicleSnap.get("ownerId") !== session.uid) {
    throw new ApiError(400, "Choose one of your registered vehicles");
  }
  if (!driverSnap.exists) throw new ApiError(400, "Choose a registered driver");

  const route = await getRoute(body.source, body.destination);
  const tripRef = db.collection("trips").doc();
  const counterRef = db.doc("counters/trips");

  const trip: Omit<Trip, "id" | "tripCode"> = {
    ownerId: session.uid,
    companyName: profile.companyName ?? "",
    vehicleId: vehicleSnap.id,
    vehicleNumber: vehicleSnap.get("number"),
    vehicleType: vehicleSnap.get("type"),
    vehicleCompany: vehicleSnap.get("company"),
    driverId: driverSnap.id,
    driverName: driverSnap.get("name"),
    driverPhone: driverSnap.get("phone"),
    date: body.date,
    source: body.source,
    destination: body.destination,
    pickupAt: body.pickupAt,
    deliveryAt: body.deliveryAt,
    receiverName: body.receiverName,
    receiverPhone: body.receiverPhone,
    goodsDescription: body.goodsDescription,
    goods: [],
    documents: [],
    status: "scheduled",
    cancelReason: null,
    distanceKm: Math.round(route.distanceKm * 10) / 10,
    durationMin: Math.round(route.durationSec / 60),
    totalFuel: null,
    paymentReceived: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    trackingToken: null,
    createdAt: Date.now(),
  };

  const tripCode = await db.runTransaction(async (tx) => {
    const counter = await tx.get(counterRef);
    const next = ((counter.get("value") as number | undefined) ?? 0) + 1;
    const code = `RV-${String(next).padStart(5, "0")}`;
    tx.set(counterRef, { value: next });
    tx.set(tripRef, { ...trip, tripCode: code });
    // Planned route line, kept apart from the trip so lists stay light.
    tx.set(db.doc(`tripRoutes/${tripRef.id}`), {
      ownerId: trip.ownerId,
      driverId: trip.driverId,
      coords: downsample(route.coords, 300).flat(),
    });
    addNotification(tx, {
      userId: trip.driverId,
      tripId: tripRef.id,
      tripCode: code,
      message: `New trip ${code} assigned to you. Vehicle ${trip.vehicleNumber}.`,
    });
    return code;
  });

  await syncTripAccess({ id: tripRef.id, ownerId: trip.ownerId, driverId: trip.driverId, status: "scheduled" });
  return { id: tripRef.id, tripCode };
});
