"use client";

import { Check, Clock, Copy, Share2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { useOwnerData } from "@/components/data-providers";
import { LiveMap } from "@/components/trip/live-map";
import { Button } from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-class";
import { Card, EmptyState, SkeletonList, StatusBadge } from "@/components/ui/misc";
import { fmtDuration, fmtKm, fmtTime } from "@/lib/format";
import { useTrack } from "@/lib/live";

export default function TrackTripPage() {
  const { id } = useParams<{ id: string }>();
  const { trips } = useOwnerData();
  const trip = trips.items.find((t) => t.id === id);
  // Same ETA the receiver sees, refreshed every minute.
  const track = useTrack(trip?.trackingToken, 60_000, false);
  const [copied, setCopied] = useState(false);

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
    const text = `Track your delivery (vehicle ${trip.vehicleNumber}) live on Ruveco:`;
    if (navigator.share) {
      // The person closing the share menu is not an error.
      await navigator.share({ title: "Ruveco tracking link", text, url: link }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`, "_blank", "noopener");
    }
  };

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
        <h2 className="text-[15px] font-bold text-ink">Tracking link</h2>
        <p className="mt-0.5 text-sm text-muted">
          Share this with the receiver. It opens with no login and stops working 48 hours after the trip is completed.
        </p>
        <p className="mt-3 select-all break-all rounded-2xl bg-brand-50 p-3 text-sm font-semibold text-brand-800">{link}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button variant="secondary" icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={copy}>
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button icon={<Share2 className="h-4 w-4" />} onClick={share}>
            Share
          </Button>
        </div>
      </Card>
    </div>
  );
}
