export default function ProgressBar({
  percent,
  label,
  size = "md",
  variant = "auto",
}: {
  percent: number;
  label?: string;
  size?: "sm" | "md";
  variant?: "auto" | "accent";
}) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const color =
    variant === "accent"
      ? "#ff7a1a"
      : p >= 80
      ? "#3fb950"
      : p >= 40
      ? "#d29922"
      : p > 0
      ? "#ff7a1a"
      : "#2a2a2a";
  const trackH = size === "sm" ? "h-1" : "h-1.5";

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-medium tracking-[0.14em] uppercase text-bbx-dim">
            {label}
          </span>
          <span className="text-[11px] font-semibold tabular-nums text-bbx-text">
            {p}%
          </span>
        </div>
      )}
      <div
        className={`w-full ${trackH} bg-bbx-panel2 border border-bbx-line overflow-hidden`}
      >
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${p}%`, background: color }}
        />
      </div>
    </div>
  );
}
