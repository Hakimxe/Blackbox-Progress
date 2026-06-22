export default function ProgressRing({
  percent,
  size = 110,
  stroke = 8,
  children,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (p / 100) * c;

  const color =
    p >= 100
      ? "#3fb950"
      : p >= 80
      ? "#3fb950"
      : p >= 40
      ? "#ff7a1a"
      : p > 0
      ? "#ff7a1a"
      : "#2a2a2a";

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#1f1f1f"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="butt"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition:
              "stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1), stroke 200ms",
          }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {children ?? (
          <span className="bbx-num text-xl text-bbx-text">{p}%</span>
        )}
      </div>
    </div>
  );
}
