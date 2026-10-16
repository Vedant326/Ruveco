import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/format";

export const inputClass =
  "h-12 w-full rounded-2xl border border-line bg-white px-4 text-[15px] text-ink outline-none transition " +
  "placeholder:text-muted/60 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:bg-brand-50/60 disabled:text-muted";

/** Label, required asterisk, and the error shown in red under the field. */
export function Field({
  label,
  required,
  error,
  hint,
  children,
  className,
  as: Tag = "label",
}: {
  /** Use "div" for controls that open their own dialog, so label clicks do not re-trigger them. */
  as?: "label" | "div";
  label?: string;
  required?: boolean;
  error?: string | null;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tag className={cx("block", className)}>
      {label && (
        <span className="mb-1.5 flex items-center justify-between text-sm font-semibold text-ink">
          <span>
            {label}
            {required && <span className="ml-0.5 text-rose-500">*</span>}
          </span>
          {hint && <span className="text-xs font-medium text-muted">{hint}</span>}
        </span>
      )}
      {children}
      {error && <span className="mt-1.5 block text-xs font-medium text-rose-600">{error}</span>}
    </Tag>
  );
}

export function Input({ className, invalid, ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  return <input className={cx(inputClass, invalid && "border-rose-400 focus:border-rose-500 focus:ring-rose-100", className)} {...props} />;
}

export function Textarea({ className, invalid, ...props }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      className={cx(inputClass, "h-auto min-h-24 resize-none py-3", invalid && "border-rose-400", className)}
      {...props}
    />
  );
}

export function Select({ className, invalid, children, ...props }: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <span className="relative block">
      <select className={cx(inputClass, "appearance-none pr-10", invalid && "border-rose-400", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </span>
  );
}
