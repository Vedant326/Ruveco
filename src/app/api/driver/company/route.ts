import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { loadCompany } from "@/lib/server/companies";
import { ApiError, handle, requireRole } from "@/lib/server/http";

const schema = z.object({ companyId: z.string().min(1, "Choose your company") });

// For drivers who completed their profile before choosing a company was required.
export const POST = handle(async (req) => {
  const { session, profile } = await requireRole(req, "driver");
  if (!profile.profileComplete) throw new ApiError(409, "Complete your driver profile first.");
  const company = await loadCompany(schema.parse(await req.json()).companyId);

  const db = adminDb();
  const batch = db.batch();
  batch.update(db.doc(`drivers/${session.uid}`), {
    ownerId: company.ownerId,
    companyId: company.id,
    companyName: company.name,
    updatedAt: Date.now(),
  });
  batch.update(db.doc(`users/${session.uid}`), { companyId: company.id, companyName: company.name });
  await batch.commit();
});
