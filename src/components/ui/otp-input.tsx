"use client";

import { useState } from "react";
import { cx } from "@/lib/format";

/**
 * Six OTP boxes backed by one invisible input. A single real input is what makes typing,
 * backspace, paste and SMS auto-fill behave the same on every phone keyboard.
 */
export function OtpInput({ value, onChange, invalid }: { value: string; onChange: (value: string) => void; invalid?: boolean }) {
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, 5);

  return (
    <div className="relative">
      <input
        value={value}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="6-digit OTP"
        maxLength={6}
        autoFocus
        // 16px text stops iOS zooming in on focus; the input itself is invisible.
        className="absolute inset-0 z-10 h-full w-full cursor-text rounded-2xl text-base opacity-0"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onFocus={(e) => {
          setFocused(true);
          e.target.setSelectionRange(e.target.value.length, e.target.value.length);
        }}
        onBlur={() => setFocused(false)}
        // Keep the caret at the end so digits are always added or removed in order.
        onSelect={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
      />
      <div className="flex justify-between gap-2" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className={cx(
              "grid h-14 w-full min-w-0 place-items-center rounded-2xl border bg-white text-xl font-bold text-ink transition",
              focused && i === active ? "border-brand-500 ring-4 ring-brand-100" : invalid ? "border-rose-400" : value[i] ? "border-brand-300" : "border-line",
            )}
          >
            {value[i] ?? (focused && i === active && <span className="h-6 w-0.5 animate-pulse rounded bg-brand-600" />)}
          </div>
        ))}
      </div>
    </div>
  );
}
