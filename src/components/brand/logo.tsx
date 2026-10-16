import { cx } from "@/lib/format";

const SIZES = {
  sm: { text: "text-lg", bars: "h-[13px] w-[13px] gap-[2.5px]", bar: "h-[2.6px]" },
  md: { text: "text-2xl", bars: "h-[17px] w-[17px] gap-[3.5px]", bar: "h-[3.4px]" },
  lg: { text: "text-4xl", bars: "h-[26px] w-[26px] gap-[5px]", bar: "h-[5.2px]" },
};

/** RUVECO wordmark. The E is three bars with a lighter middle bar, as in the brand logo. */
export function Logo({
  size = "md",
  tone = "dark",
  className,
}: {
  size?: keyof typeof SIZES;
  tone?: "dark" | "light";
  className?: string;
}) {
  const s = SIZES[size];
  const solid = tone === "light" ? "bg-white" : "bg-brand-700";
  const accent = tone === "light" ? "bg-brand-300" : "bg-brand-400";
  return (
    <span
      role="img"
      aria-label="Ruveco"
      className={cx(
        "inline-flex select-none items-center font-extrabold leading-none tracking-[0.04em]",
        s.text,
        tone === "light" ? "text-white" : "text-brand-700",
        className,
      )}
    >
      <span aria-hidden>RUV</span>
      <span aria-hidden className={cx("mx-[0.09em] inline-flex flex-col justify-between", s.bars)}>
        <span className={cx("w-full rounded-[1px]", s.bar, solid)} />
        <span className={cx("w-full rounded-[1px]", s.bar, accent)} />
        <span className={cx("w-full rounded-[1px]", s.bar, solid)} />
      </span>
      <span aria-hidden>CO</span>
    </span>
  );
}

/** Square app mark: the three bars on brand purple. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("inline-flex flex-col justify-center gap-[14%] rounded-[28%] bg-brand-700 p-[24%]", className)}
    >
      <span className="h-[16%] w-full rounded-[1px] bg-white" />
      <span className="h-[16%] w-full rounded-[1px] bg-brand-300" />
      <span className="h-[16%] w-full rounded-[1px] bg-white" />
    </span>
  );
}
