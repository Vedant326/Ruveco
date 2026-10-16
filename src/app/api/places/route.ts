import { ApiError, handle, requireSession } from "@/lib/server/http";
import type { Place } from "@/lib/types";

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | undefined>;
}

// Rough bounding box of India: minLng, minLat, maxLng, maxLat.
const INDIA_BBOX = "68.1,6.5,97.4,35.7";

// Place suggestions from Photon (OpenStreetMap). Free, no key.
export const GET = handle(async (req) => {
  await requireSession(req);
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 3) return { places: [] };

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=7&lang=en&bbox=${INDIA_BBOX}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!res?.ok) throw new ApiError(502, "Place search is not available right now. Please try again.");
  const data = (await res.json()) as { features?: PhotonFeature[] };

  const seen = new Set<string>();
  const places: Place[] = [];
  for (const feature of data.features ?? []) {
    const p = feature.properties;
    if (p.countrycode && p.countrycode !== "IN") continue;
    const parts = [p.name, p.street, p.locality, p.district, p.city, p.county, p.state, p.postcode].filter(
      (part, i, all): part is string => Boolean(part) && all.indexOf(part) === i,
    );
    const address = parts.join(", ");
    if (!address || seen.has(address)) continue;
    seen.add(address);
    const [lng, lat] = feature.geometry.coordinates;
    places.push({ address, lat, lng });
  }
  return { places };
});
