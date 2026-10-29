import type { NextRequest } from "next/server";
import { ApiError, handle, loadProfile, requireSession } from "@/lib/server/http";
import { loadTrip } from "@/lib/server/trips";

type Ctx = { params: Promise<{ id: string }> };

/**
 * The trip owner's company, name and phone, for the trip's driver, who cannot read the owner's
 * account directly. Always the owner's current details, so it works for older trips too.
 */
export const GET = handle(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await requireSession(req);
  const trip = await loadTrip(id);
  // Same answer as "not found" so trip IDs cannot be probed.
  if (trip.ownerId !== session.uid && trip.driverId !== session.uid) throw new ApiError(404, "Trip not found.");

  const owner = await loadProfile(trip.ownerId);
  return {
    companyName: owner?.companyName || trip.companyName || "",
    ownerName: owner?.displayName ?? "",
    ownerPhone: owner?.phone ?? "",
  };
});
