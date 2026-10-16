import { adminDb } from "@/lib/firebase/admin";
import { handle, requireRole } from "@/lib/server/http";
import type { DriverSummary } from "@/lib/types";

// Driver search for the Create Trip form. Returns only name and phone,
// so owners never see license or photo data.
export const GET = handle(async (req) => {
  await requireRole(req, "owner");
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 40);

  const drivers = adminDb().collection("drivers");
  const field = /^\d+$/.test(q) ? "phone" : "nameLower";
  const query = q
    ? drivers.where(field, ">=", q).where(field, "<=", `${q}`).orderBy(field)
    : drivers.orderBy("nameLower");
  const snap = await query.limit(20).get();

  const results: DriverSummary[] = snap.docs.map((doc) => ({
    uid: doc.id,
    name: doc.get("name"),
    phone: doc.get("phone"),
  }));
  return { drivers: results };
});
