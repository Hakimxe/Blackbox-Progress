export default function Stat({
  label,
  value,
  delta,
  tone = "accent",
}: {
  label: string;
  value: string | number;
  delta?: string;
  tone?: "accent" | "muted" | "good" | "warn" | "bad";
}) {
  const valueColor =
    tone === "accent"
      ? "text-bbx-accent"
      : tone === "good"
      ? "text-bbx-good"
      : tone === "warn"
      ? "text-bbx-warn"
      : tone === "bad"
      ? "text-bbx-bad"
      : "text-bbx-text";

  return (
    <div className="bbx-panel px-4 py-3">
      <div className="text-[10px] font-medium tracking-[0.18em] uppercase text-bbx-dim">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className={`text-2xl bbx-num ${valueColor}`}>{value}</span>
        {delta && (
          <span className="text-[10px] tracking-[0.06em] font-semibold text-bbx-accent">
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
