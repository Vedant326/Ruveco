"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cx } from "@/lib/format";
import { Button } from "./button";
import { Input, inputClass } from "./field";
import { Spinner } from "./misc";
import { Sheet } from "./sheet";

export interface Option {
  value: string;
  label: string;
  sub?: string;
}

/**
 * Dropdown with a search box, opened as a sheet so it is easy to use on a phone.
 * Pass `onSearch` to load options from the server; otherwise options are filtered locally.
 */
export function SearchSelect({
  value,
  onChange,
  options,
  title,
  placeholder,
  searchPlaceholder = "Search",
  onSearch,
  loading,
  emptyText = "Nothing found",
  allowCustom,
  invalid,
  icon,
}: {
  value: Option | null;
  onChange: (option: Option) => void;
  options: Option[];
  title: string;
  placeholder: string;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  loading?: boolean;
  emptyText?: string;
  /** Adds an "Other" row where the user types their own value. */
  allowCustom?: boolean;
  invalid?: boolean;
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const shown = onSearch
    ? options
    : options.filter((o) => !q || o.label.toLowerCase().includes(q) || o.sub?.toLowerCase().includes(q));

  const openSheet = () => {
    setQuery("");
    setCustom(null);
    onSearch?.("");
    setOpen(true);
  };
  const pick = (option: Option) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className={cx(inputClass, "flex cursor-pointer items-center gap-3 text-left", invalid && "border-rose-400")}
      >
        {icon && <span className="shrink-0 text-brand-500">{icon}</span>}
        <span className={cx("min-w-0 flex-1 truncate", !value && "text-muted/60")}>{value ? value.label : placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            autoFocus
            value={query}
            placeholder={searchPlaceholder}
            className="pl-11"
            onChange={(e) => {
              setQuery(e.target.value);
              onSearch?.(e.target.value);
            }}
          />
        </div>

        <ul className="mt-3 min-h-40 space-y-1">
          {loading && (
            <li className="grid place-items-center py-8">
              <Spinner />
            </li>
          )}
          {!loading && shown.length === 0 && <li className="py-8 text-center text-sm text-muted">{emptyText}</li>}
          {!loading &&
            shown.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => pick(option)}
                  className={cx(
                    "flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-brand-50",
                    value?.value === option.value && "bg-brand-50",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{option.label}</span>
                    {option.sub && <span className="block truncate text-xs text-muted">{option.sub}</span>}
                  </span>
                  {value?.value === option.value && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
                </button>
              </li>
            ))}
        </ul>

        {allowCustom && (
          <div className="mt-2 border-t border-line pt-3">
            {custom === null ? (
              <button
                type="button"
                onClick={() => setCustom(query)}
                className="w-full cursor-pointer rounded-2xl px-3 py-3 text-left text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                Other (type a name)
              </button>
            ) : (
              <div className="flex gap-2">
                <Input autoFocus value={custom} maxLength={60} placeholder="Type the name" onChange={(e) => setCustom(e.target.value)} />
                <Button disabled={!custom.trim()} onClick={() => pick({ value: custom.trim(), label: custom.trim() })}>
                  Use
                </Button>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}
