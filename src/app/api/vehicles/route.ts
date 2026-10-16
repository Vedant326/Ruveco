import { z } from "zod";
import { normalizePlate, PLATE_RE } from "@/lib/constants";
import { adminDb } from "@/lib/firebase/admin";
import { ApiError, handle, requireRole } from "@/lib/server/http";

const schema = z.object({
  number: z.string().transform(normalizePlate).pipe(z.string().regex(PLATE_RE, "Enter a valid vehicle number like MH12AB1234")),
  type: z.enum(["LCV", "MCV", "HCV"], "Choose a vehicle type"),
  company: z.string().trim().min(1, "Choose a vehicle company").max(60),
});

export const POST = handle(async (req) => {
  const { session } = await requireRole(req, "owner");
  const body = schema.parse(await req.json());

  // The document ID makes the number unique per owner.
  const ref = adminDb().doc(`vehicles/${session.uid}_${body.number}`);
  try {
    await ref.create({ ownerId: session.uid, ...body, createdAt: Date.now() });
  } catch (err) {
    if ((err as { code?: number }).code === 6) throw new ApiError(409, "This vehicle is already added");
    throw err;
  }
  return { id: ref.id };
});
