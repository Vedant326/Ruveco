"use client";

import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { cx } from "@/lib/format";
import type { Place } from "@/lib/types";
import { Input } from "./ui/field";
import { Spinner } from "./ui/misc";

/**
 * Map search with suggestions. The value is only set when a suggestion is picked,
 * so every saved place has an address and coordinates.
 */
export function PlaceInput({
  value,
  onChange,
  placeholder,
  invalid,
  tone = "source",
}: {
  value: Place | null;
  onChange: (place: Place | null) => void;
  placeholder: string;
  invalid?: boolean;
  tone?: "source" | "destination";
}) {
  const [text, setText] = useState(value?.address ?? "");
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const request = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const search = (query: string) => {
    setText(query);
    if (value) onChange(null);
    clearTimeout(timer.current);
    if (query.trim().length < 3) {
      setPlaces([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    // Wait for a pause in typing so the free search service is not flooded.
    timer.current = setTimeout(async () => {
      const id = ++request.current;
      try {
        const res = await api<{ places: Place[] }>(`/api/places?q=${encodeURIComponent(query.trim())}`);
        if (id !== request.current) return;
        setPlaces(res.places);
        setFailed(false);
      } catch {
        if (id !== request.current) return;
        setPlaces([]);
        setFailed(true);
      } finally {
        if (id === request.current) setLoading(false);
      }
    }, 400);
  };

  const pick = (place: Place) => {
    setText(place.address);
    setOpen(false);
    onChange(place);
  };

  return (
    <div className="relative">
      <MapPin
        className={cx(
          "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2",
          tone === "source" ? "text-brand-400" : "text-brand-900",
        )}
      />
      <Input
        value={text}
        invalid={invalid}
        placeholder={placeholder}
        autoComplete="off"
        className="scroll-mt-24 pl-11 pr-10"
        onChange={(e) => search(e.target.value)}
        onFocus={(e) => {
          if (places.length > 0 && !value) setOpen(true);
          // On phones, move the field to the top so the suggestions are not hidden
          // behind the keyboard or the bottom tab bar.
          if (window.innerWidth < 768) e.currentTarget.scrollIntoView({ block: "start", behavior: "smooth" });
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {loading && <Spinner className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2" />}

      {open && !loading && text.trim().length >= 3 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-64 overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-card">
          {places.length === 0 && (
            <li className="px-3 py-3 text-sm text-muted">
              {failed ? "Search is not available right now. Try again." : "No places found. Try a nearby town or landmark."}
            </li>
          )}
          {places.map((place) => (
            <li key={`${place.lat},${place.lng},${place.address}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(place)}
                className="flex w-full cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-ink hover:bg-brand-50"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                {place.address}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
