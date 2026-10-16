import type { DocType, TripStatus, VehicleType } from "./types";

export const VEHICLE_TYPES: { value: VehicleType; label: string; range: string }[] = [
  { value: "LCV", label: "LCV", range: "up to 7.5 ton" },
  { value: "MCV", label: "MCV", range: "7.5 to 16 ton" },
  { value: "HCV", label: "HCV", range: "16 to 40 ton" },
];

export const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: "eway", label: "E-way bill" },
  { value: "gst", label: "GST bill" },
  { value: "other", label: "Other" },
];

export const GOODS_UNITS = ["kg", "ton", "pieces", "boxes"] as const;

export const STATUS_META: Record<TripStatus, { label: string; className: string; dot: string }> = {
  scheduled: { label: "Scheduled", className: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  in_progress: { label: "In progress", className: "bg-brand-100 text-brand-700", dot: "bg-brand-500" },
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", className: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
};

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export const GPS_INTERVAL_MS = 15_000;
export const TRACK_REFRESH_MS = 15_000;
export const ETA_REFRESH_MS = 5 * 60_000;
export const STALE_AFTER_MS = 5 * 60_000;
export const LINK_EXPIRY_MS = 48 * 60 * 60_000;

export const PHONE_RE = /^[6-9]\d{9}$/;
/** Standard plates (MH12AB1234) and BH series (22BH1234AA). */
export const PLATE_RE = /^([A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}|\d{2}BH\d{4}[A-Z]{1,2})$/;

export function normalizePlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
