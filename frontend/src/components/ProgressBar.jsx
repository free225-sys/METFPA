import React from "react";
import { STATUS_COLORS } from "@/lib/operational";

export function ProgressBar({ value = 0, showLabel = false, height = 8, status, color, label = "Avancement" }) {
  const v = Math.max(0, Math.min(100, value));
  const resolvedColor = color || STATUS_COLORS[status] || (v === 100 ? STATUS_COLORS.acheve : STATUS_COLORS.en_cours);
  return (
    <div className="flex items-center gap-2 w-full" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={v}>
      <div className="flex-1 rounded-full bg-[#EDEEF0] overflow-hidden" style={{ height }} aria-hidden="true">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${v}%`, background: resolvedColor }}
        />
      </div>
      {showLabel && <span className="text-xs font-semibold tabular-nums text-[#4A5568] w-9 text-right">{v}%</span>}
    </div>
  );
}
