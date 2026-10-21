import { randomBytes } from "node:crypto";
import type { Transaction, WriteBatch } from "firebase-admin/firestore";
import { adminDb, adminRtdb } from "@/lib/firebase/admin";
import type { Trip } from "@/lib/types";
import { ApiError } from "./http";

export async function loadTrip(id: string): Promise<Trip> {
  const snap = await adminDb().doc(`trips/${id}`).get();
  if (!snap.exists) throw new ApiError(404, "Trip not found.");
  return { ...snap.data(), id } as Trip;
}

export interface NotificationInput {
  userId: string;
  tripId: string;
  tripCode: string;
  /** Short heading for the phone notification, for example "Trip started". */
  title: string;
  message: string;
}

/**
 * Queues an in-app notification inside a transaction or batch.
 * After the write commits, pass the same input to `sendPush` so the user's phones get it too.
 */
export function addNotification(writer: Transaction | WriteBatch, input: NotificationInput) {
  const ref = adminDb().collection("notifications").doc();
  const data = { ...input, readAt: null, createdAt: Date.now() };
  // Transaction and WriteBatch share the same set() shape.
  (writer as WriteBatch).set(ref, data);
}

/** Random, unguessable token for the public tracking link (32 URL-safe characters). */
export function newTrackingToken() {
  return randomBytes(24).toString("base64url");
}

/**
 * Mirrors who may read and write a trip's GPS data into the Realtime Database,
 * because its security rules cannot read Firestore.
 */
export async function syncTripAccess(trip: Pick<Trip, "id" | "ownerId" | "driverId" | "status">) {
  await adminRtdb().ref(`tripAccess/${trip.id}`).set({
    ownerId: trip.ownerId,
    driverId: trip.driverId,
    status: trip.status,
  });
}

/** Public tracking record, read only by the server for /api/track/[token]. */
export async function syncTrackingToken(trip: Trip) {
  if (!trip.trackingToken) return;
  await adminRtdb().ref(`tokens/${trip.trackingToken}`).update({
    tripId: trip.id,
    status: trip.status,
    source: trip.source,
    destination: trip.destination,
    startedAt: trip.startedAt,
    completedAt: trip.completedAt,
  });
}
