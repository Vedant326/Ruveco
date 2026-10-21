import { adminDb, adminMessaging } from "@/lib/firebase/admin";
import type { NotificationInput } from "./trips";

// Errors that mean the phone uninstalled the app or its installation ID is no longer valid.
const STALE_DEVICE_CODES = new Set(["messaging/installation-id-not-registered", "messaging/invalid-argument"]);

/**
 * Sends each in-app notification as a phone notification too, to every phone the user
 * is signed in on. Phones are stored by their Firebase Installation ID (FID) in the
 * `devices` collection, written by /api/me/device.
 * Never throws: a failed push must not fail the trip action that caused it.
 */
export async function sendPush(notes: NotificationInput[]) {
  if (!notes.length || process.env.NEXT_PUBLIC_USE_EMULATORS === "1") return;
  try {
    await Promise.all(notes.map(sendOne));
  } catch (err) {
    console.error("[push]", err);
  }
}

async function sendOne(note: NotificationInput) {
  const db = adminDb();
  const devices = await db.collection("devices").where("uid", "==", note.userId).get();
  const fids = devices.docs.map((doc) => doc.id);
  if (!fids.length) return;

  const result = await adminMessaging().sendEachForMulticast({
    fids,
    notification: { title: note.title, body: note.message },
    data: { tripId: note.tripId, tripCode: note.tripCode },
    android: {
      priority: "high",
      notification: {
        channelId: "trip_updates",
        icon: "ic_stat_ruveco",
        color: "#4F0BB8",
        // A newer update for the same trip replaces the older one in the tray.
        tag: note.tripId,
      },
    },
    apns: { payload: { aps: { sound: "default" } } },
  });

  const stale = result.responses.flatMap((r, i) => (!r.success && STALE_DEVICE_CODES.has(r.error?.code ?? "") ? [fids[i]] : []));
  await Promise.all(stale.map((fid) => db.doc(`devices/${fid}`).delete()));
}
