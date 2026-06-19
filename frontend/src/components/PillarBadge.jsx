import React from "react";
import { pillarColor, PILLAR_SHORT } from "@/lib/format";

export function PillarBadge({ code, showName = false, testid }) {
  const c = pillarColor(code);
  const p = String(code).split(".")[0];
  return (
    <span data-testid={testid}
      className="inline-flex w-fit items-center gap-1.5 rounded-[4px] border px-2 py-[3px] text-[11px] font-semibold whitespace-nowrap"
      style={{ color: c, background: `${c}12`, borderColor: `${c}40` }}>
      <span className="w-1.5 h-1.5 rounded-[2px]" style={{ background: c }} />
      P{p}{showName ? ` · ${PILLAR_SHORT[p] || ""}` : ""}
    </span>
  );
}
