"use client";

import { Gauge, Radio } from "lucide-react";
import { TripMap } from "@/components/trip-map";
import { STALE_AFTER_MS } from "@/lib/constants";
import { cx, timeAgo } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { useLiveTrip } from "@/lib/live";
import type { LivePoint, Trip } from "@/lib/types";

/**
 * The vehicle's speed from its latest GPS point (the phone reports metres per second).
 * Below 3 km/h counts as stopped, since GPS drifts a little even when parked. Null when unknown.
 */
function speedLabel(point: LivePoint | null) {
  if (point?.spd == null || point.spd < 0) return null;
  const kmh = Math.round(point.spd * 3.6);
  return kmh < 3 ? "Stopped" : `${kmh} km/h`;
}

/** Live GPS map for the owner: route line, path driven and the vehicle's latest position. */
export function LiveMap({ trip, className }: { trip: Trip; className?: string }) {
  const live = useLiveTrip(trip.id);
  const now = useNow(10_000);
  const running = trip.status === "in_progress";
  const stale = running && live.latest ? now - live.latest.t > STALE_AFTER_MS : false;
  // Only for a fresh point: an old speed would mislead, and the badge above already says it is waiting.
  const speed = running && !stale ? speedLabel(live.latest) : null;

  return (
    <div className={cx("relative overflow-hidden rounded-3xl border border-line/70 shadow-card", className)}>
      <TripMap
        source={trip.source}
        destination={trip.destination}
        vehicle={running ? live.latest : null}
        route={live.route}
        path={live.path}
        className="absolute inset-0"
      />
      {running && (
        <span
          className={cx(
            "absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-card backdrop-blur",
            stale || !live.latest ? "bg-amber-50/95 text-amber-800" : "bg-white/95 text-brand-700",
          )}
        >
          <Radio className={cx("h-3.5 w-3.5", !stale && live.latest && "animate-pulse")} />
          {!live.latest ? "Waiting for first location" : stale ? `Waiting for location update · last ${timeAgo(live.latest.t, now)}` : `Updated ${timeAgo(live.latest.t, now)}`}
        </span>
      )}
      {speed && (
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-sm font-extrabold text-ink shadow-card backdrop-blur">
          <Gauge className="h-4 w-4 text-brand-600" />
          {speed}
        </span>
      )}
    </div>
  );
}
