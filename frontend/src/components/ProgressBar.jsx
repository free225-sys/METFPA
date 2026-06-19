import React from "react";

export function ProgressBar({ value = 0, showLabel = false, height = 8 }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 rounded-full bg-[#EDEEF0] overflow-hidden" style={{ height }}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#FF8200] to-[#009E49] transition-all duration-700"
          style={{ width: `${v}%` }}
        />
      </div>
      {showLabel && <span className="text-xs font-semibold tabular-nums text-[#4A5568] w-9 text-right">{v}%</span>}
    </div>
  );
}
