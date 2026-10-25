import { adminDb } from "@/lib/firebase/admin";
import { handle, requireSession } from "@/lib/server/http";

// Registered transport companies, for the driver's "Your company" dropdown. Names only.
export const GET = handle(async (req) => {
  await requireSession(req);
  const snap = await adminDb().collection("companies").orderBy("nameLower").limit(1000).get();
  return { companies: snap.docs.map((doc) => ({ id: doc.id, name: doc.get("name") as string })) };
});
