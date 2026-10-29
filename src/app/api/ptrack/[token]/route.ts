import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { ApiError, handle, requireSession } from "@/lib/server/http";
import { mayView, tripByPrivateToken } from "@/lib/server/private-link";
import { buildTrackResponse, trackDetails } from "@/lib/server/track";
import type { LngLat, TrackResponse } from "@/lib/types";

type Ctx = { params: Promise<{ token: string }> };

/**
 * Private tracking data: the same as the public link, but only for a phone number on the owner's
 * list, proven by a phone sign-in (OTP). Checked on every refresh, so a number the owner removes
 * loses access at once.
 */
export const GET = handle(async (req: NextRequest, ctx: Ctx) => {
  const { token } = await ctx.params;
  const full = req.nextUrl.searchParams.get("full") === "1";
  const session = await requireSession(req);
  const trip = await tripByPrivateToken(token);
  if (!trip) throw new ApiError(404, "This link is not valid.");
  if (!mayView(trip, session.phone)) throw new ApiError(403, "You don't have access to this link.");

  if (trip.trackingToken) {
    const body = await buildTrackResponse(trip.trackingToken, full);
    if (!body) throw new ApiError(404, "This link is not valid.");
    return body;
  }

  // Not started yet (or cancelled before starting): the route and the delivery details, no position.
  const body: TrackResponse = {
    valid: true,
    status: trip.status,
    source: trip.source,
    destination: trip.destination,
    latest: null,
    eta: null,
    startedAt: null,
    completedAt: null,
    serverTime: Date.now(),
  };
  if (full) {
    const flat = ((await adminDb().doc(`tripRoutes/${trip.id}`).get()).get("coords") as number[] | undefined) ?? [];
    const route: LngLat[] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) route.push([flat[i], flat[i + 1]]);
    body.route = route;
    body.path = [];
    body.details = trackDetails(trip);
  }
  return body;
});
