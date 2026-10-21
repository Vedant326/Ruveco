import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { handle, requireSession } from "@/lib/server/http";

// The phone's Firebase Installation ID (FID): letters, digits, "_" and "-", so safe as a document ID.
const token = z.string().min(10).max(200).regex(/^[\w-]+$/, "Invalid device ID");
const registerSchema = z.object({ token, platform: z.enum(["android", "ios"]).default("android") });
const removeSchema = z.object({ token });

/** The mobile app registers its installation ID after sign-in, and again whenever it changes. */
export const POST = handle(async (req) => {
  const session = await requireSession(req);
  const body = registerSchema.parse(await req.json());
  // Keyed by device, so a phone that switches accounts only notifies the new account.
  await adminDb().doc(`devices/${body.token}`).set({ uid: session.uid, platform: body.platform, updatedAt: Date.now() });
});

/** Called on sign-out, so the phone stops getting this account's notifications. */
export const DELETE = handle(async (req) => {
  const session = await requireSession(req);
  const body = removeSchema.parse(await req.json());
  const ref = adminDb().doc(`devices/${body.token}`);
  const snap = await ref.get();
  if (snap.exists && snap.get("uid") === session.uid) await ref.delete();
});
