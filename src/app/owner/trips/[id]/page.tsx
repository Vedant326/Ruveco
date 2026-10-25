"use client";

import { Ban, IndianRupee, Navigation, Phone, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { TruckArt } from "@/components/brand/illustrations";
import { useOwnerData } from "@/components/data-providers";
import { DocumentsCard } from "@/components/trip/documents";
import { FeedbackCard } from "@/components/trip/feedback-card";
import { GoodsCard } from "@/components/trip/goods-card";
import { LiveMap } from "@/components/trip/live-map";
import { RouteCard } from "@/components/trip/route-card";
import { Button } from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-class";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Card, Detail, EmptyState, ErrorState, SectionTitle, SkeletonList, StatusBadge } from "@/components/ui/misc";
import { FadeIn } from "@/components/ui/motion";
import { Sheet } from "@/components/ui/sheet";
import { api, errorMessage } from "@/lib/api";
import { cx, fmtDate, fmtDateTime, fmtPhone, fmtRupees } from "@/lib/format";
import type { Trip } from "@/lib/types";

/** Fuel filled and its cost (entered by the driver, read-only here) and the payment received (the owner's). */
function FiguresCard({ trip }: { trip: Trip }) {
  const [payment, setPayment] = useState(trip.paymentReceived?.toString() ?? "");
  const [busy, setBusy] = useState(false);

  const dirty = payment !== (trip.paymentReceived?.toString() ?? "");
  const save = async () => {
    setBusy(true);
    try {
      await api(`/api/trips/${trip.id}/figures`, {
        body: { paymentReceived: payment === "" ? null : Number(payment) },
      });
      toast.success("Payment saved");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const numeric = (value: string) => value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");

  return (
    <Card>
      <SectionTitle>Trip figures</SectionTitle>
      <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-brand-50/60 p-3">
        <Detail label="Fuel filled">{trip.totalFuel != null ? `${trip.totalFuel} litres` : "–"}</Detail>
        <Detail label="Fuel cost">{trip.fuelCost != null ? fmtRupees(trip.fuelCost) : "–"}</Detail>
        <p className="col-span-2 text-xs text-muted">
          {trip.totalFuel == null && trip.fuelCost == null ? "The driver enters fuel during or after the trip." : "Entered by the driver."}
        </p>
      </dl>
      <div className="mt-4">
        <Field label="Payment received" hint="₹">
          <span className="relative block">
            <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
            <Input value={payment} inputMode="decimal" placeholder="Optional" className="pl-11" onChange={(e) => setPayment(numeric(e.target.value))} />
          </span>
        </Field>
      </div>
      {dirty && (
        <Button size="sm" className="mt-3" loading={busy} onClick={save}>
          Save payment
        </Button>
      )}
    </Card>
  );
}

function CancelTrip({ trip }: { trip: Trip }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!reason.trim()) return setError("Enter a reason for cancelling");
    setBusy(true);
    try {
      await api(`/api/trips/${trip.id}/cancel`, { body: { reason: reason.trim() } });
      toast.success(`Trip ${trip.tripCode} cancelled`);
      setOpen(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" block size="lg" className="text-rose-600" icon={<Ban className="h-5 w-5" />} onClick={() => setOpen(true)}>
        Cancel trip
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`Cancel trip ${trip.tripCode}?`} description="The driver will be told. This cannot be undone.">
        <Field label="Cancel reason" required error={error} hint={`${reason.length}/200`}>
          <Textarea
            value={reason}
            maxLength={200}
            rows={3}
            autoFocus
            placeholder="Why is this trip being cancelled?"
            invalid={Boolean(error)}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
          />
        </Field>
        <div className="mt-5 flex gap-3">
          <Button variant="outline" block onClick={() => setOpen(false)}>
            Back
          </Button>
          <Button variant="danger" block loading={busy} onClick={confirm}>
            Confirm cancel
          </Button>
        </div>
      </Sheet>
    </>
  );
}

export default function OwnerTripPage() {
  const { id } = useParams<{ id: string }>();
  const { trips } = useOwnerData();
  const trip = trips.items.find((t) => t.id === id);

  if (trips.loading) return <SkeletonList rows={4} />;
  if (trips.error) return <ErrorState message="This trip could not be loaded." onRetry={trips.retry} />;
  if (!trip) {
    return (
      <Card>
        <EmptyState
          title="Trip not found"
          text="It may belong to another account."
          action={
            <Link href="/owner/trips" className={buttonClass("secondary")}>
              Back to trips
            </Link>
          }
        />
      </Card>
    );
  }

  const open = trip.status === "scheduled" || trip.status === "in_progress";

  return (
    <div className="space-y-4">
      <PageHeader title={trip.tripCode} subtitle={`Trip date ${fmtDate(trip.date)}`} back="/owner/trips" right={<StatusBadge status={trip.status} />} />

      {trip.status === "cancelled" && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm">
          <p className="font-bold text-rose-700">Cancelled{trip.cancelledAt ? ` on ${fmtDateTime(trip.cancelledAt)}` : ""}</p>
          <p className="mt-1 text-rose-700/90">Reason: {trip.cancelReason}</p>
        </div>
      )}

      {trip.status === "in_progress" && (
        <FadeIn>
          <Link href={`/owner/trips/${trip.id}/track`} className={cx(buttonClass("primary", "lg", true))}>
            <Navigation className="h-5 w-5" /> Track trip
          </Link>
        </FadeIn>
      )}

      {trip.status === "completed" && <FeedbackCard trip={trip} side="owner" />}

      {trip.status !== "cancelled" && <LiveMap trip={trip} className="h-64 sm:h-80" />}

      <RouteCard trip={trip} />

      <Card>
        <SectionTitle>Vehicle and driver</SectionTitle>
        <div className="flex items-center gap-3">
          <span className="grid h-16 w-24 shrink-0 place-items-center rounded-2xl bg-brand-50 px-2">
            <TruckArt type={trip.vehicleType} moving={trip.status === "in_progress"} className="w-full" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold tracking-wide text-ink">{trip.vehicleNumber}</p>
            <p className="truncate text-sm text-muted">
              {trip.vehicleType} · {trip.vehicleCompany}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-700 text-white">
            <User className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{trip.driverName}</p>
            <p className="text-sm text-muted">{fmtPhone(trip.driverPhone)}</p>
          </div>
          <a href={`tel:+91${trip.driverPhone}`} aria-label={`Call ${trip.driverName}`} className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100">
            <Phone className="h-5 w-5" />
          </a>
        </div>
      </Card>

      <Card>
        <SectionTitle>Receiver</SectionTitle>
        <dl className="grid grid-cols-2 gap-4">
          <Detail label="Name">{trip.receiverName}</Detail>
          <Detail label="Phone">
            <a href={`tel:+91${trip.receiverPhone}`} className="text-brand-700">
              {fmtPhone(trip.receiverPhone)}
            </a>
          </Detail>
        </dl>
      </Card>

      <GoodsCard trip={trip} editable={open} />
      <DocumentsCard trip={trip} canAdd />
      <FiguresCard key={String(trip.paymentReceived)} trip={trip} />

      {(trip.startedAt || trip.completedAt) && (
        <Card>
          <dl className="grid grid-cols-2 gap-4">
            {trip.startedAt && <Detail label="Started">{fmtDateTime(trip.startedAt)}</Detail>}
            {trip.completedAt && <Detail label="Completed">{fmtDateTime(trip.completedAt)}</Detail>}
          </dl>
        </Card>
      )}

      {trip.status === "scheduled" && <CancelTrip trip={trip} />}
    </div>
  );
}
