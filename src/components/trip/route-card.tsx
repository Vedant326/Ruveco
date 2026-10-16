import { Clock, Route as RouteIcon } from "lucide-react";
import { Card } from "@/components/ui/misc";
import { fmtDateTime, fmtDuration, fmtKm } from "@/lib/format";
import type { Trip } from "@/lib/types";

/** Source and destination as a vertical timeline, with times and distance. */
export function RouteCard({ trip }: { trip: Pick<Trip, "source" | "destination" | "pickupAt" | "deliveryAt" | "distanceKm" | "durationMin"> }) {
  return (
    <Card>
      <ol className="relative space-y-5">
        <span className="absolute bottom-6 left-[11px] top-6 border-l-2 border-dashed border-brand-200" aria-hidden />
        <li className="relative flex gap-3">
          <span className="z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-400 text-[11px] font-extrabold text-white ring-4 ring-white">
            A
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Pickup · {fmtDateTime(trip.pickupAt)}</p>
            <p className="mt-0.5 text-sm font-semibold text-ink">{trip.source.address}</p>
          </div>
        </li>
        <li className="relative flex gap-3">
          <span className="z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-950 text-[11px] font-extrabold text-white ring-4 ring-white">
            B
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Delivery · {fmtDateTime(trip.deliveryAt)}</p>
            <p className="mt-0.5 text-sm font-semibold text-ink">{trip.destination.address}</p>
          </div>
        </li>
      </ol>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">
          <RouteIcon className="h-3.5 w-3.5" /> {fmtKm(trip.distanceKm)}
        </span>
        {trip.durationMin > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">
            <Clock className="h-3.5 w-3.5" /> about {fmtDuration(trip.durationMin * 60)} driving
          </span>
        )}
      </div>
    </Card>
  );
}
