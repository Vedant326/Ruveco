import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { companyKey } from "@/lib/server/companies";
import { ApiError, handle, requireRole } from "@/lib/server/http";

const schema = z.object({
  companyName: z
    .string()
    .trim()
    .min(1, "Enter your company name")
    .max(100, "Company name is too long")
    .transform((name) => name.replace(/\s+/g, " ")),
});

// Each owner account (phone number) has one company, and each company name is registered once.
export const POST = handle(async (req) => {
  const { session } = await requireRole(req, "owner");
  const { companyName } = schema.parse(await req.json());
  const id = companyKey(companyName);
  if (id.length < 2) throw new ApiError(400, "Enter a valid company name");

  const db = adminDb();
  const userRef = db.doc(`users/${session.uid}`);
  const companyRef = db.doc(`companies/${id}`);
  await db.runTransaction(async (tx) => {
    const [user, company] = await Promise.all([tx.get(userRef), tx.get(companyRef)]);
    const current = user.get("companyId") as string | undefined;
    if (current && current !== id) {
      throw new ApiError(409, `This account is already registered for ${user.get("companyName")}. One account can have one company.`);
    }
    if (company.exists && company.get("ownerId") !== session.uid) {
      throw new ApiError(409, "This company name is already registered. Enter a different name, for example with your city.");
    }
    tx.set(companyRef, {
      name: companyName,
      nameLower: companyName.toLowerCase(),
      ownerId: session.uid,
      createdAt: (company.get("createdAt") as number | undefined) ?? Date.now(),
    });
    tx.update(userRef, { companyName, companyId: id, profileComplete: true });
  });
});
