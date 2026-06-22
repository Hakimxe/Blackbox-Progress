export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <div className="relative h-7 w-7 grid place-items-center bg-bbx-text text-bbx-bg font-bold text-sm">
        <span>P</span>
        <span className="absolute -bottom-[2px] -right-[2px] h-1.5 w-1.5 bg-bbx-accent" />
      </div>
      {!compact && (
        <div className="leading-none">
          <div className="text-[13px] font-semibold tracking-[0.18em] uppercase text-bbx-text">
            Progress BBX
          </div>
          <div className="text-[9px] uppercase tracking-[0.28em] text-bbx-dim mt-1">
            {"// team tracker"}
          </div>
        </div>
      )}
    </div>
  );
}
