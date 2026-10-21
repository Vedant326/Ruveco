import type { BaseMessage } from "firebase-admin/messaging";
import { adminDb, adminMessaging } from "@/lib/firebase/admin";
import type { NotificationInput } from "./trips";

/**
 * Sends each in-app notification as a phone notification too, to every phone the user is
 * signed in on. Phones are stored in the `devices` collection (written by /api/me/device),
 * keyed by their Firebase Installation ID, with the classic FCM token as a backup.
 * Never throws: a failed push must not fail the trip action that caused it.
 */
export async function sendPush(notes: NotificationInput[]) {
  if (!notes.length || process.env.NEXT_PUBLIC_USE_EMULATORS === "1") return;
  try {
    await Promise.all(notes.map(sendOne));
  } catch (err) {
    console.error("[push] failed", err);
  }
}

async function sendOne(note: NotificationInput) {
  const db = adminDb();
  const devices = (await db.collection("devices").where("uid", "==", note.userId).get()).docs;
  if (!devices.length) {
    console.log(`[push] "${note.title}" ${note.tripCode}: user has no registered phone`);
    return;
  }

  const message: BaseMessage = {
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
  };
  const messaging = adminMessaging();

  // 1. Send to each phone's installation ID.
  const byFid = await messaging.sendEachForMulticast({ ...message, fids: devices.map((d) => d.id) });
  let delivered = byFid.successCount;
  const retry: { index: number; token: string; fidCode: string }[] = [];
  const stale: string[] = [];
  byFid.responses.forEach((r, i) => {
    if (r.success) return;
    const fidCode = r.error?.code ?? "unknown";
    const token = devices[i].get("fcmToken") as string | undefined;
    if (token) retry.push({ index: i, token, fidCode });
    else {
      console.error(`[push] phone ${i + 1} failed: ${fidCode} ${r.error?.message ?? ""}`);
      if (fidCode === "messaging/installation-id-not-registered") stale.push(devices[i].id);
    }
  });

  // 2. Fall back to the classic FCM token for phones the first send missed.
  if (retry.length) {
    const byToken = await messaging.sendEachForMulticast({ ...message, tokens: retry.map((x) => x.token) });
    delivered += byToken.successCount;
    byToken.responses.forEach((r, j) => {
      if (r.success) return;
      const { index, fidCode } = retry[j];
      const tokenCode = r.error?.code ?? "unknown";
      console.error(`[push] phone ${index + 1} failed: ${fidCode}; backup token: ${tokenCode} ${r.error?.message ?? ""}`);
      // Only forget a phone when Firebase says both of its addresses are gone (app uninstalled).
      if (fidCode === "messaging/installation-id-not-registered" && tokenCode === "messaging/registration-token-not-registered") {
        stale.push(devices[index].id);
      }
    });
  }

  console.log(`[push] "${note.title}" ${note.tripCode}: sent to ${delivered} of ${devices.length} phone(s)`);
  await Promise.all(stale.map((id) => db.doc(`devices/${id}`).delete()));
}
