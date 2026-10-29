import { adminDb } from "@/lib/firebase/admin";
import type { Trip } from "@/lib/types";

/** The trip a private tracking link belongs to, or null. */
export async function tripByPrivateToken(token: string): Promise<Trip | null> {
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return null;
  const snap = await adminDb().collection("trips").where("privateToken", "==", token).limit(1).get();
  const doc = snap.docs[0];
  return doc ? ({ ...doc.data(), id: doc.id } as Trip) : null;
}

/** Whether this 10-digit phone number may open the trip's private link. */
export function mayView(trip: Trip, phone: string | null) {
  return Boolean(phone && (trip.privateViewers ?? []).includes(phone));
}
