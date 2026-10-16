"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { useOwnerData } from "@/components/data-providers";
import { TripCard } from "@/components/trip/trip-card";
import { Button } from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-class";
import { Input } from "@/components/ui/field";
import { Card, EmptyState, ErrorState, SkeletonList } from "@/components/ui/misc";
import { STATUS_META } from "@/lib/constants";
import { cx } from "@/lib/format";
import type { TripStatus } from "@/lib/types";

const FILTERS: { value: TripStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  ...(Object.keys(STATUS_META) as TripStatus[]).map((s) => ({ value: s, label: STATUS_META[s].label })),
];
const PAGE_SIZE = 20;

export default function TripListPage() {
  const { trips } = useOwnerData();
  const [filter, setFilter] = useState<TripStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState(1);

  const q = query.trim().toLowerCase();
  // Newest trip date first.
  const matching = trips.items
    .filter((t) => filter === "all" || t.status === filter)
    .filter((t) => !q || t.vehicleNumber.toLowerCase().includes(q) || t.driverName.toLowerCase().includes(q) || t.tripCode.toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date) || b.pickupAt - a.pickupAt);
  const shown = matching.slice(0, pages * PAGE_SIZE);

  return (
    <>
      <PageHeader
        title="Trip Details"
        subtitle={trips.loading ? "Loading" : `${trips.items.length} trip${trips.items.length === 1 ? "" : "s"}`}
        back="/owner"
        right={
          // Phones already have the Create button in the tab bar.
          <span className="hidden md:block">
            <Link href="/owner/trips/new" className={buttonClass("primary", "sm")}>
              <Plus className="h-4 w-4" /> Create Trip
            </Link>
          </span>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          placeholder="Search vehicle number or driver"
          className="pl-11"
          onChange={(e) => {
            setQuery(e.target.value);
            setPages(1);
          }}
        />
      </div>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Filter by status">
        {FILTERS.map((f) => {
          const count = f.value === "all" ? trips.items.length : trips.items.filter((t) => t.status === f.value).length;
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
        ) : trips.items.length === 0 ? (
          <Card>
            <EmptyState
              title="No trips yet"
              text="Create your first trip and assign it to a driver."
              action={
                <Link href="/owner/trips/new" className={buttonClass()}>
                  <Plus className="h-4 w-4" /> Create Trip
                </Link>
              }
            />
          </Card>
        ) : matching.length === 0 ? (
          <Card>
            <EmptyState title="No trips match" text="Try another status or search." />
          </Card>
        ) : (
          <div className="space-y-3">
            {shown.map((trip) => (
              <TripCard key={trip.id} trip={trip} href={`/owner/trips/${trip.id}`} />
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
