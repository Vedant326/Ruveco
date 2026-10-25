import { adminDb } from "@/lib/firebase/admin";
import { handle, requireSession } from "@/lib/server/http";

// Registered transport companies, for the driver's "Your company" dropdown. Names only.
export const GET = handle(async (req) => {
  await requireSession(req);
  const db = adminDb();
  const snap = await db.collection("companies").orderBy("nameLower").limit(1000).get();

  // Companies registered before the owner name field existed: use the owner's account name.
  const older = snap.docs.filter((doc) => !doc.get("ownerName"));
  const users = older.length ? await db.getAll(...older.map((doc) => db.doc(`users/${doc.get("ownerId")}`))) : [];
  const accountName = new Map(users.map((u) => [u.id, (u.get("displayName") as string | null) ?? ""]));

  return {
    companies: snap.docs.map((doc) => ({
      id: doc.id,
      name: doc.get("name") as string,
      ownerName: ((doc.get("ownerName") as string | undefined) ?? accountName.get(doc.get("ownerId")) ?? "").trim(),
    })),
  };
});
