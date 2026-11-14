import { FieldValue, type DocumentReference, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminAuth, adminBucket, adminDb, adminRtdb } from "@/lib/firebase/admin";
import { ApiError, loadProfile } from "./http";
import { sendPush } from "./push";
import { addNotification, syncTripAccess, type NotificationInput } from "./trips";

/**
 * Deletes an account and its data, exactly as promised on /delete-account:
 * - Everyone: profile, sign-in account, notifications, registered devices.
 * - Drivers: license and face photos, and the GPS history of trips they drove. Their trips stay in the
 *   company's records; scheduled ones are cancelled so the owner can reassign them.
 * - Owners: company, vehicles with documents, and all their trips with documents, routes, GPS and links.
 *   Their drivers' accounts stay, unlinked from the company (the app then asks them to pick a company).
 *
 * Every step is a delete or an unlink, so if anything fails the request can simply be sent again.
 * The sign-in account is removed last for that reason.
 */
export async function deleteAccount(uid: string) {
  const db = adminDb();
  const profile = await loadProfile(uid);

  const [ownedTrips, drivenTrips] = await Promise.all([
    db.collection("trips").where("ownerId", "==", uid).get(),
    db.collection("trips").where("driverId", "==", uid).get(),
  ]);
  // A running trip still has a phone sending GPS; ending it first keeps its records consistent.
  if ([...ownedTrips.docs, ...drivenTrips.docs].some((d) => d.get("status") === "in_progress")) {
    throw new ApiError(409, "A trip is still in progress. End it before deleting your account.");
  }

  await cancelDriverScheduledTrips(drivenTrips.docs.filter((d) => d.get("ownerId") !== uid));
  await deleteDriverLocationHistory(drivenTrips.docs.map((d) => d.id));
  await deleteOwnedTrips(ownedTrips.docs);
  await deleteOwnerFleet(uid);
  await deletePersonalData(uid);

  try {
    await adminAuth().deleteUser(uid);
  } catch (err) {
    if ((err as { code?: string }).code !== "auth/user-not-found") throw err;
  }
  console.info(`[account] deleted ${uid} (${profile?.role ?? "no role"})`);
}

/** Scheduled trips assigned to a deleted driver are cancelled, and the owner is told. */
async function cancelDriverScheduledTrips(trips: QueryDocumentSnapshot[]) {
  const scheduled = trips.filter((d) => d.get("status") === "scheduled");
  if (!scheduled.length) return;

  const db = adminDb();
  const batch = db.batch();
  const notes: NotificationInput[] = [];
  const now = Date.now();
  for (const doc of scheduled) {
    batch.update(doc.ref, { status: "cancelled", cancelReason: "The driver deleted their account", cancelledAt: now });
    const note: NotificationInput = {
      userId: doc.get("ownerId"),
      tripId: doc.id,
      tripCode: doc.get("tripCode"),
      title: "Trip cancelled",
      message: `Trip ${doc.get("tripCode")} was cancelled because ${doc.get("driverName") || "the driver"} deleted their account.`,
    };
    addNotification(batch, note);
    notes.push(note);
  }
  await batch.commit();
  await Promise.all([
    ...scheduled.map((d) => syncTripAccess({ id: d.id, ownerId: d.get("ownerId"), driverId: d.get("driverId"), status: "cancelled" })),
    sendPush(notes),
  ]);
}

/** GPS points recorded on the driver's phone. The trip record itself stays with the company. */
async function deleteDriverLocationHistory(tripIds: string[]) {
  const rtdb = adminRtdb();
  await Promise.all(tripIds.map((id) => rtdb.ref(`tracking/${id}`).remove()));
}

/** An owner's trips and everything hanging off them. */
async function deleteOwnedTrips(trips: QueryDocumentSnapshot[]) {
  if (!trips.length) return;
  const db = adminDb();
  const rtdb = adminRtdb();
  const bucket = adminBucket();

  const refs: DocumentReference[] = [];
  for (const doc of trips) refs.push(doc.ref, db.doc(`tripRoutes/${doc.id}`));
  // Drivers' notifications about these trips would open a trip that no longer exists.
  for (let i = 0; i < trips.length; i += 30) {
    const ids = trips.slice(i, i + 30).map((d) => d.id);
    const notes = await db.collection("notifications").where("tripId", "in", ids).get();
    refs.push(...notes.docs.map((d) => d.ref));
  }

  await Promise.all(
    trips.map(async (doc) => {
      const token = doc.get("trackingToken") as string | null;
      await Promise.all([
        bucket.deleteFiles({ prefix: `trips/${doc.id}/` }),
        rtdb.ref(`tracking/${doc.id}`).remove(),
        rtdb.ref(`tripAccess/${doc.id}`).remove(),
        token ? rtdb.ref(`tokens/${token}`).remove() : null,
      ]);
    }),
  );
  await deleteDocs(refs);
}

/** An owner's company and vehicles. Their drivers are unlinked, not deleted. */
async function deleteOwnerFleet(uid: string) {
  const db = adminDb();
  const [companies, vehicles, drivers] = await Promise.all([
    db.collection("companies").where("ownerId", "==", uid).get(),
    db.collection("vehicles").where("ownerId", "==", uid).get(),
    db.collection("drivers").where("ownerId", "==", uid).get(),
  ]);
  if (companies.empty && vehicles.empty && drivers.empty) return;

  const writer = db.bulkWriter();
  const unlink = { companyId: FieldValue.delete(), companyName: FieldValue.delete() };
  const ops: Promise<unknown>[] = [];
  for (const d of drivers.docs) {
    ops.push(writer.update(d.ref, { ...unlink, ownerId: FieldValue.delete(), updatedAt: Date.now() }));
    // set+merge, so a driver without a users record (should not happen) cannot fail the whole request.
    ops.push(writer.set(db.doc(`users/${d.id}`), unlink, { merge: true }));
  }
  for (const d of [...companies.docs, ...vehicles.docs]) ops.push(writer.delete(d.ref));
  await writer.close();
  await Promise.all(ops);
  await adminBucket().deleteFiles({ prefix: `vehicles/${uid}/` });
}

/** Everything that belongs to the person themselves. */
async function deletePersonalData(uid: string) {
  const db = adminDb();
  const [notifications, devices] = await Promise.all([
    db.collection("notifications").where("userId", "==", uid).get(),
    db.collection("devices").where("uid", "==", uid).get(),
  ]);
  await adminBucket().deleteFiles({ prefix: `drivers/${uid}/` });
  await deleteDocs([
    ...notifications.docs.map((d) => d.ref),
    ...devices.docs.map((d) => d.ref),
    db.doc(`drivers/${uid}`),
    db.doc(`users/${uid}`),
  ]);
}

async function deleteDocs(refs: DocumentReference[]) {
  if (!refs.length) return;
  const writer = adminDb().bulkWriter();
  // BulkWriter.close() does not fail when a write fails, so each write's result is checked.
  const ops = refs.map((ref) => writer.delete(ref));
  await writer.close();
  await Promise.all(ops);
}
