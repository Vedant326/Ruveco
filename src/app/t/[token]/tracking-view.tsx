"use client";

import { Ban, CircleCheck, Clock, Link2Off, MapPin, Package, Phone, Radio, User, WifiOff } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { TruckArt } from "@/components/brand/illustrations";
import { Logo } from "@/components/brand/logo";
import { goodsQuantity, goodsWeight } from "@/components/trip/goods-card";
import { TripMap } from "@/components/trip-map";
import { FullLoader, StatusBadge } from "@/components/ui/misc";
import { STALE_AFTER_MS, TRACK_REFRESH_MS } from "@/lib/constants";
import { cx, fmtDateTime, fmtDuration, fmtKm, fmtPhone, fmtTime, timeAgo } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { useTrack } from "@/lib/live";
import type { TrackDetails } from "@/lib/types";

function Message({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-surface p-6">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-white p-7 text-center shadow-card">
        <Logo className="mx-auto" />
        <span className="mx-auto mt-6 grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">{icon}</span>
        <h1 className="mt-4 text-lg font-bold text-ink">{title}</h1>
        <p className="mt-1.5 text-sm text-muted">{text}</p>
      </div>
    </div>
  );
}

/** Who is bringing the delivery (driver, with a call button) and what it carries. */
function DeliveryDetails({ details }: { details: TrackDetails }) {
  const hasGoods = details.goodsDescription || details.goods.length > 0;
  return (
    <div className="mt-5 space-y-5 border-t border-line pt-5">
      {details.driverName && (
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-700 text-white">
            <User className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted">Driver</p>
            <p className="truncate text-sm font-bold text-ink">{details.driverName}</p>
            {details.driverPhone && <p className="text-sm text-muted">{fmtPhone(details.driverPhone)}</p>}
            <p className="truncate text-xs text-muted">
              {[details.vehicleNumber, details.companyName].filter(Boolean).join(" · ")}
            </p>
          </div>
          {details.driverPhone && (
            <a
              href={`tel:+91${details.driverPhone}`}
              aria-label={`Call ${details.driverName}`}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-brand-50 px-4 text-sm font-bold text-brand-700 hover:bg-brand-100"
            >
              <Phone className="h-4 w-4" /> Call
            </a>
          )}
        </div>
      )}

      {hasGoods && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink">
            <Package className="h-4 w-4 text-brand-600" /> Goods
          </p>
          {details.goodsDescription && <p className="mb-2 rounded-2xl bg-brand-50/70 p-3 text-sm text-ink">{details.goodsDescription}</p>}
          {details.goods.length > 0 && (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              {details.goods.map((g, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span className="min-w-0 break-words font-semibold text-ink">{g.item}</span>
                  <span className="shrink-0 text-right tabular-nums text-muted">
                    {[goodsWeight(g), goodsQuantity(g)].filter((v) => v !== "–").join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Receiver's page: status, ETA, map, the driver and the goods. No login, no navigation.
 * The private link passes its own [endpoint], the viewer's [authToken], and [onDenied] for when
 * the viewer is not (or no longer) on the owner's list.
 */
export function TrackingView({
  endpoint,
  authToken,
  onDenied,
}: { endpoint?: string; authToken?: () => Promise<string | null>; onDenied?: () => void } = {}) {
  const { token } = useParams<{ token: string }>();
  const track = useTrack(token, TRACK_REFRESH_MS, true, { endpoint, authToken });
  const now = useNow(10_000);

  useEffect(() => {
    if (track.phase === "denied") onDenied?.();
  }, [track.phase, onDenied]);

  if (track.phase === "invalid") {
    return <Message icon={<Link2Off className="h-6 w-6" />} title="This link is not valid" text="It may have expired, or the address was copied incorrectly. Ask the sender for a new link." />;
  }
  if (track.phase === "denied") {
    return <Message icon={<Link2Off className="h-6 w-6" />} title="You don't have access to this link" text="Ask the sender to add your phone number to this private link." />;
  }
  if (track.phase === "loading" || !track.data) {
    return track.offline ? (
      <Message icon={<WifiOff className="h-6 w-6" />} title="Could not load tracking" text="Check your internet connection. This page keeps trying on its own." />
    ) : (
      <FullLoader />
    );
  }

  const { data } = track;
  if (data.status === "cancelled") {
    return <Message icon={<Ban className="h-6 w-6" />} title="This trip was cancelled" text="Please contact the sender for details." />;
  }

  const live = data.status === "in_progress";
  const completed = data.status === "completed";
  const stale = live && (!data.latest || now - data.latest.t > STALE_AFTER_MS);

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="flex items-center justify-between bg-white px-4 py-3.5 shadow-card">
        <Logo size="sm" />
        <StatusBadge status={data.status} />
      </header>

      <div className="rv-map-raised relative min-h-[46dvh] flex-1">
        <TripMap
          source={data.source}
          destination={data.destination}
          vehicle={live ? data.latest : null}
          route={completed ? [] : track.route}
          path={track.path}
          className="absolute inset-0"
        />
        {track.offline && (
          <span className="absolute left-1/2 top-3 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-amber-50/95 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-card">
            <WifiOff className="h-3.5 w-3.5" /> Reconnecting
          </span>
        )}
      </div>

      <section className="relative z-10 -mt-6 rounded-t-[28px] bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-[0_-12px_32px_-16px_rgb(45_6_107/0.25)]">
        <div className="mx-auto max-w-xl">
          {completed ? (
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-600">
                <CircleCheck className="h-7 w-7" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold text-ink">This trip is completed</h1>
                {data.completedAt && <p className="text-sm text-muted">Delivered {fmtDateTime(data.completedAt)}</p>}
              </div>
            </div>
          ) : stale ? (
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-600">
                <Radio className="h-7 w-7" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold text-ink">Waiting for location update</h1>
                <p className="text-sm text-muted">
                  {data.latest ? `Last known position at ${fmtTime(data.latest.t)} (${timeAgo(data.latest.t, now)})` : "The driver has just started. The vehicle will appear shortly."}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-20 shrink-0 place-items-center rounded-2xl bg-brand-50 px-2">
                <TruckArt type={track.details?.vehicleType ?? "MCV"} moving className="w-full" />
              </span>
              <div className="min-w-0">
                {data.eta ? (
                  <>
                    <h1 className="text-xl font-extrabold text-ink">Arriving in {fmtDuration(Math.max(60, (data.eta.arrivalAt - now) / 1000))}</h1>
                    <p className="text-sm text-muted">
                      <Clock className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
                      Around {fmtTime(data.eta.arrivalAt)} · {fmtKm(data.eta.distanceKm)} to go
                    </p>
                  </>
                ) : (
                  <h1 className="text-xl font-extrabold text-ink">On the way</h1>
                )}
              </div>
            </div>
          )}

          {live && data.latest && (
            <p className={cx("mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold", stale ? "bg-amber-50 text-amber-800" : "bg-brand-50 text-brand-700")}>
              <span className={cx("h-1.5 w-1.5 rounded-full", stale ? "bg-amber-500" : "animate-pulse bg-brand-600")} />
              Updated {timeAgo(data.latest.t, now)}
            </p>
          )}

          <ol className="relative mt-5 space-y-4 border-t border-line pt-5">
            <span className="absolute bottom-3 left-[11px] top-8 border-l-2 border-dashed border-brand-200" aria-hidden />
            <li className="relative flex gap-3">
              <span className="z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-400 text-[11px] font-extrabold text-white ring-4 ring-white">A</span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted">From</p>
                <p className="text-sm font-semibold text-ink">{data.source.address}</p>
              </div>
            </li>
            <li className="relative flex gap-3">
              <span className="z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-950 text-[11px] font-extrabold text-white ring-4 ring-white">B</span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted">To</p>
                <p className="text-sm font-semibold text-ink">{data.destination.address}</p>
              </div>
            </li>
          </ol>

          {track.details && <DeliveryDetails details={track.details} />}

          <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted">
            <MapPin className="h-3 w-3" /> Live tracking by Ruveco
          </p>
        </div>
      </section>
    </div>
  );
}
