"use client";

import { Check, Clock, Copy, Globe, LockKeyhole, Phone, Plus, Share2, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { useOwnerData } from "@/components/data-providers";
import { LiveMap } from "@/components/trip/live-map";
import { Button } from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-class";
import { Input } from "@/components/ui/field";
import { Card, EmptyState, SkeletonList, StatusBadge } from "@/components/ui/misc";
import { api, errorMessage } from "@/lib/api";
import { PHONE_RE } from "@/lib/constants";
import { cx, fmtDuration, fmtKm, fmtPhone, fmtTime } from "@/lib/format";
import { useTrack } from "@/lib/live";
import type { Trip } from "@/lib/types";

/** Copy and Share buttons for a tracking link. */
function LinkActions({ link, text }: { link: string; text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Tracking link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Press and hold the link to copy it.");
    }
  };

  const share = async () => {
    if (navigator.share) {
      // The person closing the share menu is not an error.
      await navigator.share({ title: "Ruveco tracking link", text, url: link }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`, "_blank", "noopener");
    }
  };

  return (
    <>
      <p className="mt-3 select-all break-all rounded-2xl bg-brand-50 p-3 text-sm font-semibold text-brand-800">{link}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button variant="secondary" icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={copy}>
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button icon={<Share2 className="h-4 w-4" />} onClick={share}>
          Share
        </Button>
      </div>
    </>
  );
}

/**
 * Private link: only the phone numbers listed here can open it, after an OTP sent to that number.
 * The list is saved on every change; the link is made when the first number is saved.
 */
function PrivateLinkPanel({ trip }: { trip: Trip }) {
  const phones = trip.privateViewers ?? [];
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const save = async (next: string[], key: string) => {
    setBusy(key);
    try {
      await api(`/api/trips/${trip.id}/private-link`, { body: { phones: next } });
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const add = async () => {
    if (!PHONE_RE.test(phone)) return setError("Enter a valid 10-digit mobile number");
    if (phones.includes(phone)) return setError("This number is already added");
    setError(null);
    if (await save([...phones, phone], "add")) setPhone("");
  };

  const link = trip.privateToken && phones.length > 0 ? `${window.location.origin}/p/${trip.privateToken}` : null;

  return (
    <>
      <p className="mt-0.5 text-sm text-muted">
        Only the phone numbers below can open this link. They verify with an OTP sent to their number.
      </p>

      <div className="mt-3 flex gap-2">
        <span className="relative block min-w-0 flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 border-r border-line pr-3 text-sm font-semibold text-ink">+91</span>
          <Input
            value={phone}
            type="tel"
            inputMode="numeric"
            placeholder="98765 43210"
            aria-label="Phone number to allow"
            invalid={Boolean(error)}
            className="pl-[4.2rem] font-semibold tracking-wide"
            onChange={(e) => {
              setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
            }}
          />
        </span>
        <Button icon={<Plus className="h-4 w-4" />} loading={busy === "add"} onClick={add}>
          Add
        </Button>
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}

      {phones.length > 0 && (
        <ul className="mt-3 space-y-2">
          {phones.map((p) => (
            <li key={p} className="flex items-center gap-3 rounded-2xl border border-line px-3 py-2">
              <Phone className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="flex-1 text-sm font-semibold text-ink">{fmtPhone(p)}</span>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Remove ${fmtPhone(p)}`}
                loading={busy === p}
                disabled={busy !== null}
                icon={<X className="h-4 w-4" />}
                onClick={() => save(phones.filter((x) => x !== p), p)}
              />
            </li>
          ))}
        </ul>
      )}

      {link ? (
        <LinkActions link={link} text={`Track your delivery (vehicle ${trip.vehicleNumber}) on Ruveco. Verify with your phone number to open it:`} />
      ) : (
        <p className="mt-3 rounded-2xl bg-brand-50/70 p-3 text-sm text-muted">Add at least one phone number to get the private link.</p>
      )}
    </>
  );
}

export default function TrackTripPage() {
  const { id } = useParams<{ id: string }>();
  const { trips } = useOwnerData();
  const trip = trips.items.find((t) => t.id === id);
  // Same ETA the receiver sees, refreshed every minute.
  const track = useTrack(trip?.trackingToken, 60_000, false);
  const [mode, setMode] = useState<"public" | "private">("public");

  if (trips.loading) return <SkeletonList rows={3} />;
  if (!trip || !trip.trackingToken) {
    return (
      <Card>
        <EmptyState
          title="Tracking is not available"
          text="The tracking link is created when the driver starts the trip."
          action={
            <Link href={trip ? `/owner/trips/${trip.id}` : "/owner/trips"} className={buttonClass("secondary")}>
              Back
            </Link>
          }
        />
      </Card>
    );
  }

  const link = `${window.location.origin}/t/${trip.trackingToken}`;
  const eta = track.data?.eta;

  return (
    <div className="space-y-4">
      <PageHeader title={`Track ${trip.tripCode}`} subtitle={`${trip.driverName} · ${trip.vehicleNumber}`} back={`/owner/trips/${trip.id}`} right={<StatusBadge status={trip.status} />} />

      <LiveMap trip={trip} className="h-[52dvh] min-h-80" />

      {trip.status === "in_progress" && (
        <Card className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white">
            <Clock className="h-6 w-6" />
          </span>
          {eta ? (
            <div>
              <p className="text-lg font-extrabold text-ink">Arriving in {fmtDuration(eta.seconds)}</p>
              <p className="text-sm text-muted">
                Around {fmtTime(eta.arrivalAt)} · {fmtKm(eta.distanceKm)} to go
              </p>
            </div>
          ) : (
            <p className="text-sm font-medium text-muted">ETA appears once the first location arrives</p>
          )}
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold text-ink">Tracking link</h2>
          {/* Public (anyone with the link) or private (listed phone numbers, with an OTP). */}
          <div className="inline-flex rounded-full bg-brand-50 p-1" role="tablist" aria-label="Link type">
            {(
              [
                ["public", "Public", Globe],
                ["private", "Private", LockKeyhole],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => setMode(value)}
                className={cx(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                  mode === value ? "bg-brand-700 text-white shadow-card" : "text-brand-700 hover:bg-brand-100",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>

        {mode === "public" ? (
          <>
            <p className="mt-0.5 text-sm text-muted">
              Share this with the receiver. It opens with no login and stops working 48 hours after the trip is completed.
            </p>
            <LinkActions link={link} text={`Track your delivery (vehicle ${trip.vehicleNumber}) live on Ruveco:`} />
          </>
        ) : (
          <PrivateLinkPanel trip={trip} />
        )}
      </Card>
    </div>
  );
}
