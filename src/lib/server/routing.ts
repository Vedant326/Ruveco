import type { LngLat } from "@/lib/types";

export interface RouteResult {
  distanceKm: number;
  durationSec: number;
  coords: LngLat[];
  provider: "ors" | "osrm" | "estimate";
}

interface Point {
  lat: number;
  lng: number;
}

export function haversineKm(a: Point, b: Point) {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Keeps at most `max` points, always including the first and last. */
export function downsample<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const step = (items.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => items[Math.round(i * step)]);
}

// OpenRouteService (run by HeiGIT) with the truck profile. Free key: about 2,000 requests a day.
async function orsRoute(from: Point, to: Point): Promise<RouteResult> {
  const res = await fetch("https://api.heigit.org/openrouteservice/v2/directions/driving-hgv/geojson", {
    method: "POST",
    headers: { Authorization: process.env.ORS_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
      radiuses: [5000, 5000],
    }),
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) throw new Error(`ORS ${res.status}`);
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) throw new Error("ORS returned no route");
  return {
    distanceKm: feature.properties.summary.distance / 1000,
    durationSec: feature.properties.summary.duration,
    coords: feature.geometry.coordinates as LngLat[],
    provider: "ors",
  };
}

// Public OSRM demo server: no key, car speeds only, so the time is padded for trucks.
async function osrmRoute(from: Point, to: Point): Promise<RouteResult> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("OSRM returned no route");
  return {
    distanceKm: route.distance / 1000,
    durationSec: route.duration * 1.3,
    coords: route.geometry.coordinates as LngLat[],
    provider: "osrm",
  };
}

function estimateRoute(from: Point, to: Point): RouteResult {
  const distanceKm = haversineKm(from, to) * 1.3;
  return {
    distanceKm,
    durationSec: (distanceKm / 40) * 3600,
    coords: [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ],
    provider: "estimate",
  };
}

/** Road distance, travel time and line between two points. Never throws. */
export async function getRoute(from: Point, to: Point): Promise<RouteResult> {
  if (process.env.ORS_API_KEY) {
    try {
      return await orsRoute(from, to);
    } catch (err) {
      console.warn("[routing] ORS failed, trying OSRM", err);
    }
  }
  try {
    return await osrmRoute(from, to);
  } catch (err) {
    console.warn("[routing] OSRM failed, using straight-line estimate", err);
    return estimateRoute(from, to);
  }
}
