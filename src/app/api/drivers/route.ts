import { adminDb } from "@/lib/firebase/admin";
import { handle, requireRole } from "@/lib/server/http";
import type { DriverSummary } from "@/lib/types";

// Driver search for the Create Trip form: only drivers who registered under this owner's company.
// Returns only name and phone, so owners never see license or photo data.
export const GET = handle(async (req) => {
  const { session } = await requireRole(req, "owner");
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 40);

  // One company has a few hundred drivers at most, so they are filtered here (no extra index needed).
  const snap = await adminDb().collection("drivers").where("ownerId", "==", session.uid).get();
  const byPhone = /^\d+$/.test(q);
  const results: DriverSummary[] = snap.docs
    .filter((doc) => !q || (byPhone ? String(doc.get("phone") ?? "").includes(q) : String(doc.get("nameLower") ?? "").includes(q)))
    .sort((a, b) => String(a.get("nameLower") ?? "").localeCompare(String(b.get("nameLower") ?? "")))
    .slice(0, 20)
    .map((doc) => ({ uid: doc.id, name: doc.get("name"), phone: doc.get("phone") }));
  return { drivers: results };
});
