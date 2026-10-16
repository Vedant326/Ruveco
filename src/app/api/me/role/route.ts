import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { ApiError, handle, requireSession } from "@/lib/server/http";

const schema = z.object({ role: z.enum(["owner", "driver"]) });

// One role per account, fixed after the first choice.
export const POST = handle(async (req) => {
  const session = await requireSession(req);
  const { role } = schema.parse(await req.json());
  const ref = adminDb().doc(`users/${session.uid}`);

  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "Account not found. Please sign in again.");
    const current = snap.data()?.role;
    if (current && current !== role) {
      throw new ApiError(409, `This account is already registered as ${current === "owner" ? "an owner" : "a driver"}.`);
    }
    tx.update(ref, { role });
  });
});
