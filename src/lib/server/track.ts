import { ETA_REFRESH_MS, LINK_EXPIRY_MS } from "@/lib/constants";
import { adminDb, adminRtdb } from "@/lib/firebase/admin";
import { downsample, getRoute } from "@/lib/server/routing";
import type { LngLat, Place, TrackDetails, TrackResponse, Trip, TripStatus } from "@/lib/types";

interface TokenRecord {
  tripId: string;
  status: TripStatus;
  source: Place;
  destination: Place;
  startedAt?: number | null;
  completedAt?: number | null;
  eta?: TrackResponse["eta"];
}

/** What the receiver sees about the delivery: driver, vehicle and goods (no IDs). */
export function trackDetails(trip: Trip): TrackDetails {
  return {
    companyName: trip.companyName ?? "",
    driverName: trip.driverName ?? "",
    driverPhone: trip.driverPhone ?? "",
    vehicleNumber: trip.vehicleNumber ?? "",
    vehicleType: trip.vehicleType,
    goodsDescription: trip.goodsDescription ?? "",
    goods: (trip.goods ?? []).map(({ item, weight, weightUnit, quantity, unit }) => ({ item, weight, weightUnit, quantity, unit })),
  };
}

/**
 * Tracking data for a trip's tracking token: status, ETA and map data; with [full] (the first
 * request) also the planned route, the path driven so far, the driver and the goods.
 * Null when the token is unknown or the link has expired. Used by the public and the private link.
 */
export async function buildTrackResponse(token: string, full: boolean): Promise<TrackResponse | null> {
  const rtdb = adminRtdb();
  const tokenRef = rtdb.ref(`tokens/${token}`);
  const record = (await tokenRef.get()).val() as TokenRecord | null;
  if (!record) return null;

  const now = Date.now();
  // The link stops working 48 hours after the trip is completed.
  if (record.status === "completed" && record.completedAt && now > record.completedAt + LINK_EXPIRY_MS) {
    return null;
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

  // The first request also gets the planned route, the path driven so far and the delivery details.
  if (full) {
    const [routeSnap, pointsSnap, tripSnap] = await Promise.all([
      adminDb().doc(`tripRoutes/${record.tripId}`).get(),
      rtdb.ref(`tracking/${record.tripId}/points`).orderByKey().limitToLast(5000).get(),
      adminDb().doc(`trips/${record.tripId}`).get(),
    ]);
    const trip = tripSnap.data() as Trip | undefined;
    if (trip) body.details = trackDetails(trip);
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

  return body;
}
