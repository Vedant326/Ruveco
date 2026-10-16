import { unstable_rethrow } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { ETA_REFRESH_MS, LINK_EXPIRY_MS } from "@/lib/constants";
import { adminDb, adminRtdb } from "@/lib/firebase/admin";
import { downsample, getRoute } from "@/lib/server/routing";
import type { LngLat, Place, TrackResponse, TripStatus } from "@/lib/types";

type Ctx = { params: Promise<{ token: string }> };

interface TokenRecord {
  tripId: string;
  status: TripStatus;
  source: Place;
  destination: Place;
  startedAt?: number | null;
  completedAt?: number | null;
  eta?: TrackResponse["eta"];
}

const invalid = () => NextResponse.json({ valid: false }, { status: 404 });

/**
 * Public tracking data. No login: the unguessable token is the only key.
 * Returns status, ETA and map data only, never driver or vehicle details.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const full = req.nextUrl.searchParams.get("full") === "1";
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return invalid();

  try {
    const rtdb = adminRtdb();
    const tokenRef = rtdb.ref(`tokens/${token}`);
    const record = (await tokenRef.get()).val() as TokenRecord | null;
    if (!record) return invalid();

    const now = Date.now();
    // The link stops working 48 hours after the trip is completed.
    if (record.status === "completed" && record.completedAt && now > record.completedAt + LINK_EXPIRY_MS) {
      return invalid();
    }

    const latest = (await rtdb.ref(`tracking/${record.tripId}/latest`).get()).val() as
      | { lat: number; lng: number; t: number }
      | null;

    // ETA is recalculated at most every 5 minutes, and only while someone is watching.
    let eta = record.eta ?? null;
    if (record.status === "in_progress" && latest && (!eta || now - eta.at > ETA_REFRESH_MS)) {
      const route = await getRoute(latest, record.destination);
      eta = {
        seconds: Math.round(route.durationSec),
        distanceKm: Math.round(route.distanceKm * 10) / 10,
        arrivalAt: now + Math.round(route.durationSec) * 1000,
        at: now,
      };
      await tokenRef.child("eta").set(eta);
    }

    const body: TrackResponse = {
      valid: true,
      status: record.status,
      source: record.source,
      destination: record.destination,
      latest: record.status === "in_progress" && latest ? { lat: latest.lat, lng: latest.lng, t: latest.t } : null,
      eta: record.status === "in_progress" ? eta : null,
      startedAt: record.startedAt ?? null,
      completedAt: record.completedAt ?? null,
      serverTime: now,
    };

    // The first request also gets the planned route and the path driven so far.
    if (full) {
      const [routeSnap, pointsSnap] = await Promise.all([
        adminDb().doc(`tripRoutes/${record.tripId}`).get(),
        rtdb.ref(`tracking/${record.tripId}/points`).orderByKey().limitToLast(5000).get(),
      ]);
      const flat = (routeSnap.get("coords") as number[] | undefined) ?? [];
      const route: LngLat[] = [];
      for (let i = 0; i + 1 < flat.length; i += 2) route.push([flat[i], flat[i + 1]]);
      const path: LngLat[] = [];
      pointsSnap.forEach((child) => {
        const p = child.val() as { lat: number; lng: number };
        path.push([p.lng, p.lat]);
      });
      body.route = route;
      body.path = downsample(path, 800);
    }

    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    unstable_rethrow(err);
    console.error("[api] track", err);
    return NextResponse.json({ error: "Tracking is not available right now." }, { status: 500 });
  }
}
