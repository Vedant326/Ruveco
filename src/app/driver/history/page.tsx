"use client";

import { Search, Star } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { useDriverData } from "@/components/data-providers";
import { TripCard } from "@/components/trip/trip-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Card, EmptyState, ErrorState, SkeletonList } from "@/components/ui/misc";
import { cx, fmtKm } from "@/lib/format";

type Filter = "all" | "completed" | "cancelled";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];
const PAGE_SIZE = 20;

/** The driver's past trips: completed and cancelled, newest first. */
export default function DriverHistoryPage() {
  const { trips } = useDriverData();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState(1);

  const past = trips.items.filter((t) => t.status === "completed" || t.status === "cancelled");
  const completed = past.filter((t) => t.status === "completed");
  const ratings = completed.map((t) => t.feedback?.owner?.rating).filter((r): r is number => typeof r === "number");
  const stats = [
    { label: "Completed", value: String(completed.length) },
    { label: "Distance", value: fmtKm(completed.reduce((sum, t) => sum + t.distanceKm, 0)) },
    { label: "Owner rating", value: ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "–", star: ratings.length > 0 },
  ];

  const q = query.trim().toLowerCase();
  const matching = past
    .filter((t) => filter === "all" || t.status === filter)
    .filter((t) => !q || t.tripCode.toLowerCase().includes(q) || t.vehicleNumber.toLowerCase().includes(q) || t.companyName.toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date) || b.pickupAt - a.pickupAt);
  const shown = matching.slice(0, pages * PAGE_SIZE);

  return (
    <>
      <PageHeader title="Trip History" subtitle={trips.loading ? "Loading" : `${past.length} past trip${past.length === 1 ? "" : "s"}`} back="/driver" />

      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line/70 bg-white p-3 shadow-card">
            <p className="flex items-center gap-1 text-lg font-extrabold text-ink">
              {s.value}
              {s.star && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
            </p>
            <p className="text-xs font-medium text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          placeholder="Search trip, vehicle or company"
          className="pl-11"
          onChange={(e) => {
            setQuery(e.target.value);
            setPages(1);
          }}
        />
      </div>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Filter by status">
        {FILTERS.map((f) => {
          const count = f.value === "all" ? past.length : past.filter((t) => t.status === f.value).length;
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setFilter(f.value);
                setPages(1);
              }}
              className={cx(
                "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                active ? "bg-brand-700 text-white" : "border border-line bg-white text-muted hover:border-brand-300",
              )}
            >
              {f.label}
              <span className={cx("rounded-full px-1.5 text-xs", active ? "bg-white/20" : "bg-brand-50 text-brand-700")}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {trips.loading ? (
          <SkeletonList rows={4} />
        ) : trips.error ? (
          <ErrorState message="Your trips could not be loaded." onRetry={trips.retry} />
        ) : past.length === 0 ? (
          <Card>
            <EmptyState title="No past trips yet" text="Trips you complete show up here, with the owner's feedback." />
          </Card>
        ) : matching.length === 0 ? (
          <Card>
            <EmptyState title="No trips match" text="Try another status or search." />
          </Card>
        ) : (
          <div className="space-y-3">
            {shown.map((trip) => (
              <TripCard key={trip.id} trip={trip} href={`/driver/trips/${trip.id}`} forDriver />
            ))}
            {shown.length < matching.length && (
              <Button variant="outline" block onClick={() => setPages((p) => p + 1)}>
                Show more ({matching.length - shown.length} left)
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
