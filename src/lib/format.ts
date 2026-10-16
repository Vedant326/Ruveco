// All dates are stored as UTC milliseconds and shown in IST.
const TZ = "Asia/Kolkata";

const dateFmt = new Intl.DateTimeFormat("en-IN", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: TZ,
  day: "2-digit",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function fmtDate(value: number | string) {
  const d = typeof value === "string" ? new Date(`${value}T00:00:00+05:30`) : new Date(value);
  return dateFmt.format(d);
}

export function fmtTime(ms: number) {
  return timeFmt.format(new Date(ms));
}

export function fmtDateTime(ms: number) {
  return dateTimeFmt.format(new Date(ms));
}

/** Today's date in IST as YYYY-MM-DD. */
export function todayIST(now = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(now));
}

export function timeAgo(ms: number, now: number) {
  const sec = Math.max(0, Math.round((now - ms) / 1000));
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function fmtDuration(seconds: number) {
  const min = Math.max(1, Math.round(seconds / 60));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function fmtKm(km: number) {
  return `${km.toFixed(1)} km`;
}

export function fmtPhone(phone: string | null | undefined) {
  if (!phone) return "";
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
}

export function fmtRupees(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

/** Value for a datetime-local input, in the device's time zone. */
export function toLocalInput(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
