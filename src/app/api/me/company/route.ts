import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { handle, requireRole } from "@/lib/server/http";

const schema = z.object({
  companyName: z.string().trim().min(1, "Enter your company name").max(100, "Company name is too long"),
});

export const POST = handle(async (req) => {
  const { session } = await requireRole(req, "owner");
  const { companyName } = schema.parse(await req.json());
  await adminDb().doc(`users/${session.uid}`).update({ companyName, profileComplete: true });
});
