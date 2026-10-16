import { MapPin } from "lucide-react";
import { cx } from "@/lib/format";
import type { VehicleType } from "@/lib/types";

const TRUCKS: Record<VehicleType, { box: number; rear: number[] }> = {
  LCV: { box: 66, rear: [20] },
  MCV: { box: 104, rear: [20, 45] },
  HCV: { box: 146, rear: [18, 42, 118] },
};

const PALETTES = {
  light: { box: "#6424d6", stripe: "#9a72f5", cab: "#b79cfb", glass: "#2d066b", dark: "#1b0344", hub: "#d7c8ff", lamp: "#fde68a" },
  brand: { box: "#ffffff", stripe: "#d7c8ff", cab: "#b79cfb", glass: "#3f0796", dark: "#1b0344", hub: "#ebe3ff", lamp: "#fde68a" },
};

/**
 * Side view of a truck. LCV, MCV and HCV differ in body length and axle count.
 * `tone="brand"` is for purple backgrounds, `moving` spins the wheels.
 */
export function TruckArt({
  type = "MCV",
  tone = "light",
  moving = false,
  className,
}: {
  type?: VehicleType;
  tone?: keyof typeof PALETTES;
  moving?: boolean;
  className?: string;
}) {
  const { box, rear } = TRUCKS[type];
  const c = PALETTES[tone];
  const boxX = 166 - box;
  const wheels = [...rear.map((dx) => boxX + dx), 202];

  return (
    <svg viewBox="0 0 240 104" className={className} role="img" aria-label={`${type} truck`}>
      <ellipse cx={(boxX + 228) / 2} cy="98" rx={(228 - boxX) / 2 + 4} ry="4" fill={c.dark} opacity="0.12" />
      <g className={moving ? "animate-bob" : undefined}>
        {/* cargo body */}
        <rect x={boxX} y="16" width={box} height="60" rx="7" fill={c.box} />
        <rect x={boxX} y="56" width={box} height="7" fill={c.stripe} opacity="0.85" />
        <g opacity="0.9">
          <rect x={boxX + 12} y="28" width="16" height="3.4" rx="1" fill={c.stripe} />
          <rect x={boxX + 12} y="34.3" width="16" height="3.4" rx="1" fill={tone === "brand" ? "#9a72f5" : "#ffffff"} />
          <rect x={boxX + 12} y="40.6" width="16" height="3.4" rx="1" fill={c.stripe} />
        </g>
        {/* cab */}
        <path d="M170 30h28c5 0 9 2 12 7l13 21c2 3 3 6 3 9v9h-56z" fill={c.cab} />
        <path d="M177 37h20c3 0 5 1 7 4l10 16h-37z" fill={c.glass} />
        <path d="M181 41h8l-6 12h-2z" fill="#fff" opacity="0.25" />
        <rect x="221" y="64" width="5" height="6" rx="2" fill={c.lamp} />
        {/* chassis */}
        <rect x={boxX - 2} y="76" width={230 - boxX} height="7" rx="3.5" fill={c.dark} />
      </g>
      {wheels.map((cx_) => (
        <g key={cx_}>
          <circle cx={cx_} cy="86" r="12" fill={c.dark} />
          <g className={moving ? "wheel-spin" : undefined}>
            <circle cx={cx_} cy="86" r="5.5" fill={c.hub} />
            <path d={`M${cx_ - 5.5} 86h11M${cx_} 80.5v11`} stroke={c.dark} strokeWidth="1.6" opacity="0.5" />
          </g>
        </g>
      ))}
    </svg>
  );
}

/** Animated hero: a truck driving along a road with route pins. For purple backgrounds. */
export function TruckScene({ className }: { className?: string }) {
  return (
    <div className={cx("relative isolate overflow-hidden", className)} aria-hidden>
      {/* dotted route between two pins */}
      <svg viewBox="0 0 320 90" className="absolute inset-x-0 top-0 h-[55%] w-full" fill="none">
        <path
          d="M34 70C80 10 130 76 176 40s84-34 112 6"
          stroke="#d7c8ff"
          strokeOpacity="0.55"
          strokeWidth="2.5"
          strokeDasharray="1 9"
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute left-[7%] top-[32%] grid h-7 w-7 place-items-center rounded-full bg-brand-300 text-brand-950 shadow-lg">
        <span className="h-2 w-2 rounded-full bg-brand-950" />
      </span>
      <span className="absolute right-[6%] top-[14%] text-white drop-shadow-lg animate-bob">
        <MapPin className="h-9 w-9 fill-white/20" strokeWidth={2.2} />
      </span>

      {/* speed lines */}
      <div className="absolute bottom-[38%] left-[3%] flex flex-col gap-2 opacity-60">
        <span className="h-0.5 w-10 rounded bg-white/70" />
        <span className="ml-4 h-0.5 w-7 rounded bg-white/50" />
        <span className="ml-1 h-0.5 w-5 rounded bg-white/40" />
      </div>

      <TruckArt type="HCV" tone="brand" moving className="absolute bottom-[9%] left-1/2 w-[78%] max-w-[420px] -translate-x-1/2" />

      {/* road */}
      <div className="absolute inset-x-0 bottom-0 h-[9%] bg-brand-950/50" />
      <div className="absolute bottom-[4%] left-0 flex w-[200%] gap-7 animate-road">
        {Array.from({ length: 28 }, (_, i) => (
          <span key={i} className="h-[3px] w-7 shrink-0 rounded bg-white/45" />
        ))}
      </div>
    </div>
  );
}

/** Soft illustration for empty lists. */
export function EmptyArt({ className }: { className?: string }) {
  return (
    <div className={cx("relative mx-auto h-32 w-52", className)} aria-hidden>
      <div className="absolute inset-x-6 bottom-3 top-4 rounded-4xl bg-brand-100/70" />
      <span className="absolute left-4 top-3 text-brand-300">
        <MapPin className="h-7 w-7" />
      </span>
      <span className="absolute right-6 top-0 h-3 w-3 rounded-full bg-brand-200" />
      <TruckArt type="MCV" className="absolute inset-x-2 bottom-0" />
    </div>
  );
}
