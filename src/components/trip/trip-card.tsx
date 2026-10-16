import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { TruckArt } from "@/components/brand/illustrations";
import { StatusBadge } from "@/components/ui/misc";
import { fmtDate } from "@/lib/format";
import type { Trip } from "@/lib/types";

function shortPlace(address: string) {
  return address.split(",")[0];
}

/**
 * One row of the owner's trip list: Date, Driver name, Vehicle company,
 * Vehicle type, Vehicle number and Status. Tapping it opens the trip.
 */
export function TripCard({ trip, href }: { trip: Trip; href: string }) {
  return (
    <Link
      href={href}
      className="group block rounded-3xl border border-line/70 bg-white p-4 shadow-card transition-colors hover:border-brand-300"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-14 w-16 shrink-0 place-items-center rounded-2xl bg-brand-50 px-1.5">
          <TruckArt type={trip.vehicleType} moving={trip.status === "in_progress"} className="w-full" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[15px] font-bold text-ink">{trip.vehicleNumber}</p>
            <StatusBadge status={trip.status} />
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
            <span className="min-w-0 truncate">{shortPlace(trip.source.address)}</span>
            <span className="shrink-0 text-brand-400">→</span>
            <span className="min-w-0 truncate">{shortPlace(trip.destination.address)}</span>
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-muted">Date</dt>
          <dd className="font-semibold text-ink">{fmtDate(trip.date)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted">Driver</dt>
          <dd className="truncate font-semibold text-ink">{trip.driverName}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted">Vehicle company</dt>
          <dd className="truncate font-semibold text-ink">{trip.vehicleCompany}</dd>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <dt className="text-muted">Vehicle type</dt>
            <dd className="font-semibold text-ink">{trip.vehicleType}</dd>
          </div>
          <ChevronRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
        </div>
      </dl>
    </Link>
  );
}
