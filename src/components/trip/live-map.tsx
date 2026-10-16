"use client";

import { Radio } from "lucide-react";
import { TripMap } from "@/components/trip-map";
import { STALE_AFTER_MS } from "@/lib/constants";
import { cx, timeAgo } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { useLiveTrip } from "@/lib/live";
import type { Trip } from "@/lib/types";

/** Live GPS map for the owner: route line, path driven and the vehicle's latest position. */
export function LiveMap({ trip, className }: { trip: Trip; className?: string }) {
  const live = useLiveTrip(trip.id);
  const now = useNow(10_000);
  const running = trip.status === "in_progress";
  const stale = running && live.latest ? now - live.latest.t > STALE_AFTER_MS : false;

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
    </div>
  );
}
