import { adminDb } from "@/lib/firebase/admin";
import { handle, requireSession } from "@/lib/server/http";

// Called after every sign-in. Creates the user record the first time.
export const POST = handle(async (req) => {
  const session = await requireSession(req);
  const ref = adminDb().doc(`users/${session.uid}`);
  const snap = await ref.get();
  if (snap.exists) return { profile: { ...snap.data(), uid: session.uid } };

  const profile = {
    phone: session.phone,
    email: session.email,
    displayName: session.name,
    role: null,
    companyName: null,
    profileComplete: false,
    createdAt: Date.now(),
  };
  await ref.set(profile);
  return { profile: { ...profile, uid: session.uid } };
});
