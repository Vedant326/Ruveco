import { CircleAlert, LoaderCircle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyArt } from "@/components/brand/illustrations";
import { LogoMark } from "@/components/brand/logo";
import { STATUS_META } from "@/lib/constants";
import { cx } from "@/lib/format";
import type { TripStatus } from "@/lib/types";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-3xl border border-line/70 bg-white p-4 shadow-card sm:p-5", className)}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-bold text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function StatusBadge({ status, className }: { status: TripStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold", meta.className, className)}>
      <span className={cx("h-1.5 w-1.5 rounded-full", meta.dot, status === "in_progress" && "animate-pulse")} />
      {meta.label}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cx("h-5 w-5 animate-spin text-brand-600", className)} />;
}

/** Full-screen loader used while the session is being checked. */
export function FullLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <LogoMark className="h-14 w-14 animate-pulse" />
        <Spinner />
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton h-24 rounded-3xl" />
      ))}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <EmptyArt />
      <h3 className="mt-5 text-base font-bold text-ink">{title}</h3>
      {text && <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-rose-50 text-rose-600">
        <CircleAlert className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-bold text-ink">Could not load this</h3>
      <p className="mt-1 max-w-xs text-sm text-muted">{message ?? "Check your connection and try again."}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-brand-50 px-4 text-sm font-semibold text-brand-700 hover:bg-brand-100"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      )}
    </div>
  );
}

/** Label and value pair used on detail pages. */
export function Detail({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-ink">{children}</dd>
    </div>
  );
}
