import React from "react";
import { ORIGIN_META } from "@/lib/metfpaTheme";
import { CheckCircle2, FileText, Clock, FlaskConical, Sigma, Ban } from "lucide-react";

const ICONS = { check: CheckCircle2, doc: FileText, clock: Clock, flask: FlaskConical, calc: Sigma, missing: Ban };

export function OriginBadge({ origin, status, testid, size = "sm" }) {
  const key = origin || status;
  const m = ORIGIN_META[key] || ORIGIN_META.html_reference;
  const Icon = ICONS[m.icon] || FileText;
  const pad = size === "sm" ? "px-2 py-[2px] text-[10px]" : "px-2.5 py-1 text-xs";
  return (
    <span data-testid={testid || `origin-badge-${key}`}
      className={`inline-flex w-fit items-center gap-1 rounded-[4px] border font-semibold whitespace-nowrap ${pad}`}
      style={{ color: m.color, background: `${m.color}10`, borderColor: `${m.color}40` }}>
      <Icon size={11} strokeWidth={2.2} /> {m.label}
    </span>
  );
}

// Use instead of showing 0 for missing operational financial data
export function MissingValue({ testid, label = "Donnée absente" }) {
  return (
    <span data-testid={testid || "missing-value"}
      className="inline-flex items-center gap-1 rounded-[4px] border border-dashed border-[#C53030]/40 bg-[#C53030]/5 text-[#C53030] px-2 py-[2px] text-[11px] font-medium">
      <Ban size={11} /> {label}
    </span>
  );
}
