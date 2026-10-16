"use client";

import { ArrowRight, ListChecks, Plus, Truck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { TruckArt } from "@/components/brand/illustrations";
import { useOwnerData } from "@/components/data-providers";
import { TripCard } from "@/components/trip/trip-card";
import { ErrorState, SectionTitle, SkeletonList } from "@/components/ui/misc";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { cx } from "@/lib/format";

function ActionCard({ href, icon: Icon, title, text, primary }: { href: string; icon: LucideIcon; title: string; text: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={cx(
        "group flex h-full items-center gap-4 rounded-3xl border p-4 shadow-card transition-colors sm:flex-col sm:items-start sm:p-5",
        primary ? "border-brand-600 bg-brand-600 text-white hover:bg-brand-700" : "border-line/70 bg-white hover:border-brand-300",
      )}
    >
      <span className={cx("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", primary ? "bg-white/15 text-white" : "bg-brand-50 text-brand-600")}>
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cx("block text-base font-bold", primary ? "text-white" : "text-ink")}>{title}</span>
        <span className={cx("block text-sm", primary ? "text-white/80" : "text-muted")}>{text}</span>
      </span>
      <ArrowRight className={cx("h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1 sm:hidden", primary ? "text-white" : "text-brand-500")} />
    </Link>
  );
}

export default function OwnerHomePage() {
  const { profile } = useAuth();
  const { trips, vehicles } = useOwnerData();

  const live = trips.items.filter((t) => t.status === "in_progress");
  const scheduled = trips.items.filter((t) => t.status === "scheduled").sort((a, b) => a.pickupAt - b.pickupAt);
  const stats = [
    { label: "In progress", value: live.length },
    { label: "Scheduled", value: scheduled.length },
    { label: "Vehicles", value: vehicles.items.length },
  ];

  return (
    <div className="space-y-6">
      <FadeIn>
        <section className="brand-gradient relative overflow-hidden rounded-[28px] p-5 text-white shadow-float sm:p-7">
          <p className="text-sm font-medium text-white/75">Welcome back</p>
          <h1 className="mt-0.5 max-w-[58%] truncate text-2xl font-extrabold tracking-tight sm:text-3xl">{profile?.companyName}</h1>
          <TruckArt type="HCV" tone="brand" moving={live.length > 0} className="pointer-events-none absolute right-3 top-5 w-32 sm:right-6 sm:top-4 sm:w-60" />
          <dl className="relative mt-12 grid grid-cols-3 gap-2 sm:mt-16 sm:max-w-md">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/12 p-3 backdrop-blur-sm">
                <dd className="text-2xl font-extrabold tabular-nums">{trips.loading ? "–" : s.value}</dd>
                <dt className="text-xs font-medium text-white/75">{s.label}</dt>
              </div>
            ))}
          </dl>
        </section>
      </FadeIn>

      <Stagger className="grid gap-3 sm:grid-cols-3">
        <StaggerItem>
          <ActionCard href="/owner/trips/new" icon={Plus} title="Create Trip" text="Assign a vehicle and driver" primary />
        </StaggerItem>
        <StaggerItem>
          <ActionCard href="/owner/vehicles" icon={Truck} title="Add Vehicle" text="Register and view vehicles" />
        </StaggerItem>
        <StaggerItem>
          <ActionCard href="/owner/trips" icon={ListChecks} title="Trip Details" text="All trips and their status" />
        </StaggerItem>
      </Stagger>

      {trips.loading && <SkeletonList rows={2} />}
      {trips.error && <ErrorState message="Your trips could not be loaded." onRetry={trips.retry} />}

      {live.length > 0 && (
        <section>
          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-600" />
              </span>
              Live now
            </span>
          </SectionTitle>
          <div className="space-y-3">
            {live.map((trip) => (
              <TripCard key={trip.id} trip={trip} href={`/owner/trips/${trip.id}`} />
            ))}
          </div>
        </section>
      )}

      {scheduled.length > 0 && (
        <section>
          <SectionTitle
            action={
              <Link href="/owner/trips" className="text-sm font-semibold text-brand-700">
                See all
              </Link>
            }
          >
            Coming up
          </SectionTitle>
          <div className="space-y-3">
            {scheduled.slice(0, 3).map((trip) => (
              <TripCard key={trip.id} trip={trip} href={`/owner/trips/${trip.id}`} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
