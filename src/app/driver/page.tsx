"use client";

import { ChevronRight, Radio, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { TruckArt } from "@/components/brand/illustrations";
import { useDriverData } from "@/components/data-providers";
import { Card, EmptyState, ErrorState, SectionTitle, SkeletonList, StatusBadge } from "@/components/ui/misc";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { fmtDateTime, fmtKm, timeAgo } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import type { Trip } from "@/lib/types";

/** Assigned trip row: Driver name, Truck no., Distance, Truck type, Pickup time, Drop time. */
function AssignedTripCard({ trip, driverName }: { trip: Trip; driverName: string }) {
  const place = (address: string) => address.split(",")[0];
  return (
    <Link href={`/driver/trips/${trip.id}`} className="group block rounded-3xl border border-line/70 bg-white p-4 shadow-card transition-colors hover:border-brand-300">
      <div className="flex items-start gap-3">
        <span className="grid h-14 w-16 shrink-0 place-items-center rounded-2xl bg-brand-50 px-1.5">
          <TruckArt type={trip.vehicleType} moving={trip.status === "in_progress"} className="w-full" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[15px] font-bold tracking-wide text-ink">{trip.vehicleNumber}</p>
            <StatusBadge status={trip.status} />
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
            <span className="min-w-0 truncate">{place(trip.source.address)}</span>
            <span className="shrink-0 text-brand-400">→</span>
            <span className="min-w-0 truncate">{place(trip.destination.address)}</span>
          </p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 text-xs sm:grid-cols-3">
        <div className="min-w-0">
          <dt className="text-muted">Driver name</dt>
          <dd className="truncate font-semibold text-ink">{driverName}</dd>
        </div>
        <div>
          <dt className="text-muted">Truck type</dt>
          <dd className="font-semibold text-ink">{trip.vehicleType}</dd>
        </div>
        <div>
          <dt className="text-muted">Distance</dt>
          <dd className="font-semibold text-ink">{fmtKm(trip.distanceKm)}</dd>
        </div>
        <div>
          <dt className="text-muted">Pickup time</dt>
          <dd className="font-semibold text-ink">{fmtDateTime(trip.pickupAt)}</dd>
        </div>
        <div>
          <dt className="text-muted">Drop time</dt>
          <dd className="font-semibold text-ink">{fmtDateTime(trip.deliveryAt)}</dd>
        </div>
        <div className="flex items-end justify-end">
          <ChevronRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
        </div>
      </dl>
    </Link>
  );
}

export default function DriverHomePage() {
  const { profile } = useAuth();
  const { trips, activeTrip, tracker } = useDriverData();
  const now = useNow();

  const name = profile?.displayName ?? "";
  const assigned = trips.items.filter((t) => t.status === "scheduled");

  return (
    <div className="space-y-6">
      <FadeIn>
        <section className="brand-gradient relative overflow-hidden rounded-[28px] p-5 text-white shadow-float sm:p-7">
          <p className="text-sm font-medium text-white/75">Hello</p>
          <h1 className="mt-0.5 max-w-[58%] truncate text-2xl font-extrabold tracking-tight">{name}</h1>
          <TruckArt type="MCV" tone="brand" moving={Boolean(activeTrip)} className="pointer-events-none absolute right-3 top-4 w-32 sm:right-6 sm:w-52" />
          <p className="relative mt-10 text-sm text-white/85">
            {activeTrip
              ? "You have a trip in progress."
              : assigned.length
                ? `${assigned.length} trip${assigned.length > 1 ? "s" : ""} waiting for you.`
                : "No trips assigned right now."}
          </p>
        </section>
      </FadeIn>

      {activeTrip && (
        <FadeIn delay={0.05}>
          <Link href={`/driver/trips/${activeTrip.id}`} className="block rounded-3xl border-2 border-brand-500 bg-white p-4 shadow-float">
            <div className="flex items-center gap-3">
              <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
                <span className="absolute inset-0 rounded-full bg-brand-500 animate-ring" />
                <Radio className="relative h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-brand-700">Active trip · {activeTrip.tripCode}</p>
                <p className="truncate text-sm text-muted">
                  {tracker.error
                    ? tracker.error
                    : `Location sharing: ON${tracker.lastSentAt ? ` · sent ${timeAgo(tracker.lastSentAt, now)}` : ""}`}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-brand-600" />
            </div>
          </Link>
        </FadeIn>
      )}

      <section>
        <SectionTitle
          action={
            <button type="button" onClick={trips.retry} className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand-700">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          }
        >
          Assigned trips
        </SectionTitle>
        {trips.loading ? (
          <SkeletonList />
        ) : trips.error ? (
          <ErrorState message="Your trips could not be loaded." onRetry={trips.retry} />
        ) : assigned.length === 0 && !activeTrip ? (
          <Card>
            <EmptyState title="No trip assigned yet" text="When an owner assigns you a trip, it shows up here and you get a notification." />
          </Card>
        ) : (
          <Stagger className="space-y-3">
            {activeTrip && (
              <StaggerItem>
                <AssignedTripCard trip={activeTrip} driverName={name} />
              </StaggerItem>
            )}
            {assigned.map((trip) => (
              <StaggerItem key={trip.id}>
                <AssignedTripCard trip={trip} driverName={name} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  );
}
