"use client";

import { CircleCheck, MapPinOff, Play, Radio, Square, WifiOff } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { TruckArt } from "@/components/brand/illustrations";
import { useDriverData } from "@/components/data-providers";
import { DocumentsCard } from "@/components/trip/documents";
import { GoodsCard } from "@/components/trip/goods-card";
import { RouteCard } from "@/components/trip/route-card";
import { TripMap } from "@/components/trip-map";
import { Button } from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-class";
import { Card, Detail, EmptyState, ErrorState, SectionTitle, SkeletonList, StatusBadge } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { api, errorMessage } from "@/lib/api";
import { cx, fmtDateTime, fmtTime } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { clearTripQueue, requestLocationPermission } from "@/lib/tracker";
import type { Trip } from "@/lib/types";

function StartTrip({ trip, blocked }: { trip: Trip; blocked: boolean }) {
  const [open, setOpen] = useState(false);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    setDenied(false);
    try {
      // No location permission, no trip: the trip is not started.
      if (!(await requestLocationPermission())) {
        setDenied(true);
        return;
      }
      await api(`/api/trips/${trip.id}/start`, { method: "POST" });
      toast.success("Trip started. Location sharing is on.");
      setOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="sticky bottom-20 z-20 md:bottom-4">
        <Button block size="lg" disabled={blocked} icon={<Play className="h-5 w-5 fill-current" />} onClick={() => setOpen(true)}>
          Start trip
        </Button>
        {blocked && <p className="mt-2 text-center text-xs font-medium text-muted">End your active trip before starting this one.</p>}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Start this trip?" description="Your location will be shared until the trip ends.">
        <div className="rounded-2xl bg-brand-50 p-4">
          <TruckArt type={trip.vehicleType} moving className="mx-auto w-44" />
          <p className="mt-2 text-center text-sm font-semibold text-ink">
            {trip.tripCode} · {trip.vehicleNumber}
          </p>
        </div>
        <p className="mt-3 text-sm text-muted">Keep this app open and the screen on while driving. Your phone stops sharing location when the screen is locked.</p>

        {denied && (
          <div className="mt-3 flex gap-3 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
            <MapPinOff className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              <span className="font-bold">Location is blocked, so the trip was not started.</span> Tap the lock icon in the address bar, set
              Location to Allow, turn on GPS, then try again.
            </p>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <Button variant="outline" block onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button block loading={busy} onClick={start}>
            Start
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function ActiveTrip({ trip }: { trip: Trip }) {
  const router = useRouter();
  const { tracker } = useDriverData();
  const now = useNow(10_000);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const end = async () => {
    setBusy(true);
    try {
      // Send anything still waiting on the phone, but do not block ending on a bad network.
      await Promise.race([tracker.flushNow(), new Promise((resolve) => setTimeout(resolve, 6000))]);
      await api(`/api/trips/${trip.id}/end`, { method: "POST" });
      clearTripQueue(trip.id);
      toast.success(`Trip ${trip.tripCode} completed`);
      router.push("/driver");
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  };

  const waiting = tracker.queued > 1;

  return (
    <>
      <div className="relative h-72 overflow-hidden rounded-3xl border border-line/70 shadow-card sm:h-96">
        <TripMap source={trip.source} destination={trip.destination} vehicle={tracker.position} className="absolute inset-0" />
      </div>

      <Card className={cx("flex items-center gap-3", tracker.error && "border-amber-300 bg-amber-50")}>
        <span className={cx("relative grid h-12 w-12 shrink-0 place-items-center rounded-full text-white", tracker.error ? "bg-amber-500" : "bg-emerald-500")}>
          {!tracker.error && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ring" />}
          {tracker.error ? <MapPinOff className="relative h-5 w-5" /> : <Radio className="relative h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-ink">Location sharing: {tracker.error ? "PAUSED" : "ON"}</p>
          <p className="text-sm text-muted">
            {tracker.error ?? (tracker.lastSentAt ? `Last sent at ${fmtTime(tracker.lastSentAt)}` : "Getting your position…")}
          </p>
          {waiting && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <WifiOff className="h-3.5 w-3.5" /> {tracker.queued} points saved on phone, will send when the network is back
            </p>
          )}
        </div>
      </Card>

      <p className="rounded-2xl bg-brand-50 p-3 text-xs font-medium text-brand-800">
        Keep this app open with the screen on. Started {trip.startedAt ? fmtDateTime(trip.startedAt) : ""}
        {tracker.lastSentAt && now - tracker.lastSentAt > 60_000 ? " · no update sent in the last minute" : ""}
      </p>

      <RouteCard trip={trip} />
      <GoodsCard trip={trip} editable />
      <DocumentsCard trip={trip} canAdd />

      <div className="sticky bottom-20 z-20 md:bottom-4">
        <Button variant="danger" block size="lg" icon={<Square className="h-4 w-4 fill-current" />} onClick={() => setOpen(true)}>
          End trip
        </Button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="End this trip?" description="Location sharing stops and the trip is marked Completed.">
        <div className="mt-2 flex gap-3">
          <Button variant="outline" block onClick={() => setOpen(false)}>
            Not yet
          </Button>
          <Button variant="danger" block loading={busy} onClick={end}>
            End trip
          </Button>
        </div>
      </Sheet>
    </>
  );
}

export default function DriverTripPage() {
  const { id } = useParams<{ id: string }>();
  const { trips, activeTrip } = useDriverData();
  const trip = trips.items.find((t) => t.id === id);

  if (trips.loading) return <SkeletonList rows={4} />;
  if (trips.error) return <ErrorState message="This trip could not be loaded." onRetry={trips.retry} />;
  if (!trip) {
    return (
      <Card>
        <EmptyState
          title="Trip not found"
          text="It may have been assigned to another driver."
          action={
            <Link href="/driver" className={buttonClass("secondary")}>
              Back to trips
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={trip.tripCode} subtitle={trip.companyName} back="/driver" right={<StatusBadge status={trip.status} />} />

      {trip.status === "in_progress" ? (
        <ActiveTrip trip={trip} />
      ) : (
        <>
          {trip.status === "completed" && (
            <div className="flex items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              <CircleCheck className="h-5 w-5 shrink-0" /> Completed{trip.completedAt ? ` on ${fmtDateTime(trip.completedAt)}` : ""}
            </div>
          )}
          {trip.status === "cancelled" && (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm">
              <p className="font-bold text-rose-700">This trip was cancelled</p>
              {trip.cancelReason && <p className="mt-1 text-rose-700/90">Reason: {trip.cancelReason}</p>}
            </div>
          )}

          <RouteCard trip={trip} />

          <Card>
            <SectionTitle>Vehicle</SectionTitle>
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-24 shrink-0 place-items-center rounded-2xl bg-brand-50 px-2">
                <TruckArt type={trip.vehicleType} className="w-full" />
              </span>
              <dl className="grid flex-1 grid-cols-2 gap-3">
                <Detail label="Truck no.">{trip.vehicleNumber}</Detail>
                <Detail label="Truck type">{trip.vehicleType}</Detail>
              </dl>
            </div>
          </Card>

          <GoodsCard trip={trip} editable={trip.status === "scheduled"} />
          <DocumentsCard trip={trip} canAdd />

          {trip.status === "scheduled" && <StartTrip trip={trip} blocked={Boolean(activeTrip)} />}
        </>
      )}
    </div>
  );
}
