import React from "react";

export function Panel({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bbx-panel ${className}`}>
      {(title || right) && (
        <div className="bbx-panel-header">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-bbx-accent">▸</span>
            <span className="truncate text-bbx-text">{title}</span>
            {subtitle && (
              <span className="text-bbx-dim normal-case tracking-normal text-[10px] truncate">
                · {subtitle}
              </span>
            )}
          </div>
          {right && <div className="flex items-center gap-2">{right}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Row({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-4 py-3 border-b border-bbx-line last:border-0 ${className}`}>
      {children}
    </div>
  );
}
