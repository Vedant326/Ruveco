"use client";

import { Check, History, House, ListChecks, LogOut, Plus, Truck, User } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell, type NavItem } from "./app-shell";
import { useAuth } from "./auth-provider";
import { TruckScene } from "./brand/illustrations";
import { Logo } from "./brand/logo";
import { DriverDataProvider, OwnerDataProvider } from "./data-providers";
import { Gate } from "./gate";
import { cx } from "@/lib/format";

const OWNER_NAV: NavItem[] = [
  { href: "/owner", label: "Home", icon: House, exact: true },
  { href: "/owner/trips", label: "Trips", icon: ListChecks },
  { href: "/owner/trips/new", label: "Create Trip", shortLabel: "Create", icon: Plus },
  { href: "/owner/vehicles", label: "Vehicles", icon: Truck },
];

const DRIVER_NAV: NavItem[] = [
  { href: "/driver", label: "Trips", icon: ListChecks, exact: true },
  { href: "/driver/history", label: "History", icon: History },
  { href: "/driver/profile", label: "Profile", icon: User },
];

export function OwnerShell({ children }: { children: ReactNode }) {
  return (
    <Gate area="member">
      <OwnerDataProvider>
        <AppShell nav={OWNER_NAV} tripHref={(id) => `/owner/trips/${id}`}>
          {children}
        </AppShell>
      </OwnerDataProvider>
    </Gate>
  );
}

export function DriverShell({ children }: { children: ReactNode }) {
  return (
    <Gate area="member">
      <DriverDataProvider>
        <AppShell nav={DRIVER_NAV} tripHref={(id) => `/driver/trips/${id}`}>
          {children}
        </AppShell>
      </DriverDataProvider>
    </Gate>
  );
}

/** The three sign-up steps, with the current one worked out from the URL. */
function useOnboardingSteps() {
  const { profile } = useAuth();
  const pathname = usePathname();
  const detail = profile?.role === "owner" ? "Company name" : profile?.role === "driver" ? "Driver profile" : "Your details";
  const steps = ["Choose your role", detail, "Start using Ruveco"];
  const current = pathname.startsWith("/onboarding/role") ? 0 : 1;
  return { steps, current };
}

function StepList({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="space-y-5">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-4">
            <span
              className={cx(
                "grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold",
                done && "bg-white text-brand-700",
                active && "bg-white text-brand-700 ring-4 ring-white/25",
                !done && !active && "border-2 border-white/30 text-white/60",
              )}
            >
              {done ? <Check className="h-5 w-5" /> : i + 1}
            </span>
            <span className={cx("text-base font-semibold", active || done ? "text-white" : "text-white/60")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function SignOutButton({ tone }: { tone: "light" | "dark" }) {
  const { signOut } = useAuth();
  return (
    <button
      type="button"
      onClick={signOut}
      className={cx(
        "inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold",
        tone === "light" ? "text-white/80 hover:text-white" : "text-muted hover:text-ink",
      )}
    >
      <LogOut className="h-4 w-4" /> Sign out
    </button>
  );
}

/**
 * Sign-up steps. Phones: purple header with the white card sliding over it.
 * Laptops: purple side panel with the step list, and a wide form area on the right.
 */
export function OnboardingShell({ children }: { children: ReactNode }) {
  return (
    <Gate area="member">
      <OnboardingLayout>{children}</OnboardingLayout>
    </Gate>
  );
}

function OnboardingLayout({ children }: { children: ReactNode }) {
  const { steps, current } = useOnboardingSteps();

  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[minmax(340px,5fr)_8fr]">
      {/* Side panel (laptops) */}
      <aside className="brand-gradient sticky top-0 hidden h-dvh flex-col overflow-hidden px-10 pt-10 text-white lg:flex">
        <Logo tone="light" />
        <div className="mt-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-200">
            Step {current + 1} of {steps.length}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight">Let&apos;s set up your account</h2>
          <p className="mt-2 max-w-sm text-white/75">It takes about a minute. You only do this once.</p>
          <div className="mt-10">
            <StepList steps={steps} current={current} />
          </div>
        </div>
        <TruckScene className="-mx-10 mt-auto h-56 shrink-0" />
      </aside>

      {/* Header (phones and tablets) */}
      <div className="brand-gradient px-5 pb-16 pt-5 lg:hidden">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
          <Logo tone="light" size="sm" />
          <SignOutButton tone="light" />
        </div>
        <p className="mx-auto mt-4 w-full max-w-2xl text-xs font-semibold uppercase tracking-wider text-brand-200">
          Step {current + 1} of {steps.length} · {steps[current]}
        </p>
      </div>

      <main className="flex flex-col">
        <div className="hidden justify-end px-10 pt-8 lg:flex">
          <SignOutButton tone="dark" />
        </div>
        <div className="mx-auto -mt-10 w-full max-w-2xl flex-1 px-4 pb-10 lg:mt-0 lg:max-w-3xl lg:px-10 lg:pb-14 lg:pt-6">
          <div className="rounded-[28px] border border-line/70 bg-white p-5 shadow-card sm:p-8 lg:p-10">{children}</div>
        </div>
      </main>
    </div>
  );
}
