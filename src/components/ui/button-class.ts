import { cx } from "@/lib/format";

const VARIANTS = {
  primary: "bg-brand-600 text-white shadow-float hover:bg-brand-700 disabled:bg-brand-300 disabled:shadow-none",
  secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-50",
  outline: "border border-line bg-white text-ink hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50",
  ghost: "text-brand-700 hover:bg-brand-50 disabled:opacity-50",
  danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300",
  white: "bg-white text-brand-700 shadow-float hover:bg-brand-50 disabled:opacity-60",
};

const SIZES = {
  sm: "h-9 gap-1.5 rounded-xl px-3 text-sm",
  md: "h-12 gap-2 rounded-2xl px-5 text-[15px]",
  lg: "h-14 gap-2.5 rounded-2xl px-6 text-base",
};

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

/** Button styles as a class string, so links can look like buttons in Server Components too. */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", block = false) {
  return cx(
    "inline-flex cursor-pointer items-center justify-center font-semibold transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    // Full-width buttons can shrink, so two of them share a row instead of overflowing it.
    block ? "w-full min-w-0" : "shrink-0",
  );
}
