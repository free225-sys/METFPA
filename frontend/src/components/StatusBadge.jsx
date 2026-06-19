import React from "react";
import { STATUS_LABELS } from "@/lib/format";
import { CheckCircle2, Clock, Ban, Circle } from "lucide-react";

const META = {
  termine: { color: "#006B3F", bg: "#006B3F12", border: "#006B3F40", Icon: CheckCircle2 },
  en_cours: { color: "#FF8200", bg: "#FF820012", border: "#FF820040", Icon: Clock },
  bloque: { color: "#C53030", bg: "#C5303010", border: "#C5303040", Icon: Ban },
  non_demarre: { color: "#64748B", bg: "#64748B10", border: "#64748B33", Icon: Circle },
};

export function StatusBadge({ status, testid, size = "sm" }) {
  const m = META[status] || META.non_demarre;
  const Icon = m.Icon;
  const pad = size === "sm" ? "px-2 py-[3px] text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span data-testid={testid}
      className={`inline-flex w-fit items-center gap-1.5 rounded-[4px] font-medium whitespace-nowrap border ${pad}`}
      style={{ color: m.color, background: m.bg, borderColor: m.border }}>
      <Icon size={12} strokeWidth={2} className={status === "en_cours" ? "animate-pulse" : ""} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}
