"use client";

import { doc, updateDoc } from "firebase/firestore";
import { ArrowLeft, Bell, BellRing, Building2, LogOut, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { fb } from "@/lib/firebase/client";
import { cx, fmtPhone, timeAgo } from "@/lib/format";
import { useLiveQuery, useNow } from "@/lib/hooks";
import type { AppNotification } from "@/lib/types";
import { useAuth } from "./auth-provider";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shorter label for the phone tab bar, where space is tight. */
  shortLabel?: string;
  exact?: boolean;
}

function isActive(pathname: string, item: NavItem, items: NavItem[]) {
  if (item.exact) return pathname === item.href;
  if (!pathname.startsWith(item.href)) return false;
  // A longer matching item wins, so /owner/trips/new highlights Create, not Trips.
  return !items.some((other) => other !== item && other.href.length > item.href.length && pathname.startsWith(other.href));
}

/** Header with bell and account menu, top navigation on desktop, bottom tab bar on phones. */
export function AppShell({ nav, tripHref, children }: { nav: NavItem[]; tripHref: (tripId: string) => string; children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const now = useNow(60_000);

  const { items } = useLiveQuery<AppNotification>("notifications", "userId", user?.uid);
  const notifications = useMemo(() => [...items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 50), [items]);
  const unread = notifications.filter((n) => !n.readAt);

  // Toast for notifications that arrive while the app is open.
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!items.length && !seen.current) return;
    if (!seen.current) {
      seen.current = new Set(items.map((n) => n.id));
      return;
    }
    for (const n of items) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (!n.readAt) toast(n.message, { icon: <BellRing className="h-4 w-4 text-brand-600" /> });
    }
  }, [items]);

  const markRead = (ids: string[]) =>
    Promise.all(ids.map((id) => updateDoc(doc(fb().db, "notifications", id), { readAt: Date.now() }))).catch(() => {});

  const openNotification = (n: AppNotification) => {
    if (!n.readAt) void markRead([n.id]);
    setBellOpen(false);
    router.push(tripHref(n.tripId));
  };

  const isOwner = profile?.role === "owner";
  // Owners: their own name, with the company below it. Older owner accounts may have no name yet.
  const name = isOwner ? profile?.displayName || profile?.companyName : profile?.displayName;
  const initial = (name ?? "R").trim().charAt(0).toUpperCase();

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-4">
          <Link href={nav[0].href} aria-label="Home">
            <Logo size="sm" />
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = isActive(pathname, item, nav);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                    active ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-brand-50/60 hover:text-ink",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBellOpen(true)}
              aria-label={`Notifications, ${unread.length} unread`}
              className="relative grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100"
            >
              <Bell className="h-5 w-5" />
              {unread.length > 0 && (
                <motion.span
                  key={unread.length}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-white"
                >
                  {unread.length > 9 ? "9+" : unread.length}
                </motion.span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Account"
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-brand-700 text-sm font-bold text-white"
            >
              {initial}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-5 md:pb-12">{children}</main>

      {/* Bottom tab bar (phones) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
          {nav.map((item) => {
            const active = isActive(pathname, item, nav);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold",
                  active ? "text-brand-700" : "text-muted",
                )}
              >
                {active && <motion.span layoutId="tab-dot" className="absolute top-0 h-1 w-8 rounded-b-full bg-brand-600" />}
                <item.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                {item.shortLabel ?? item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <Sheet open={bellOpen} onClose={() => setBellOpen(false)} title="Notifications">
        {notifications.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No notifications yet</p>
        ) : (
          <>
            {unread.length > 0 && (
              <button
                type="button"
                onClick={() => markRead(unread.map((n) => n.id))}
                className="mb-2 cursor-pointer text-xs font-semibold text-brand-700"
              >
                Mark all as read
              </button>
            )}
            <ul className="space-y-1.5">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(n)}
                    className={cx(
                      "flex w-full cursor-pointer gap-3 rounded-2xl p-3 text-left hover:bg-brand-50",
                      !n.readAt && "bg-brand-50/70",
                    )}
                  >
                    <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-line" : "bg-brand-600")} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{n.message}</span>
                      <span className="mt-0.5 block text-xs text-muted">{timeAgo(n.createdAt, now)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Sheet>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Account">
        <div className="flex items-center gap-3 rounded-2xl bg-brand-50 p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-700 text-lg font-bold text-white">{initial}</span>
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{name}</p>
            {isOwner && profile?.displayName && (
              <p className="flex min-w-0 items-center gap-1 text-sm font-semibold text-brand-700">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{profile.companyName}</span>
              </p>
            )}
            {isOwner && profile?.address && <p className="line-clamp-2 text-sm text-muted">{profile.address}</p>}
            <p className="truncate text-sm text-muted">{fmtPhone(profile?.phone) || profile?.email}</p>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-brand-600">{profile?.role}</p>
          </div>
        </div>
        <Button variant="outline" block className="mt-4" icon={<LogOut className="h-4 w-4" />} onClick={signOut}>
          Sign out
        </Button>
      </Sheet>
    </div>
  );
}

/** Title row for inner pages, with an optional back button. */
export function PageHeader({ title, subtitle, back, right }: { title: string; subtitle?: ReactNode; back?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      {back && (
        <Link
          href={back}
          aria-label="Back"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-white text-ink hover:bg-brand-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-extrabold tracking-tight text-ink">{title}</h1>
        {subtitle && <div className="mt-0.5 truncate text-sm text-muted">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}
