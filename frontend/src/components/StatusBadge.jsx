import React from "react";
import { STATUS_COLORS, SUBMISSION_COLORS, statusLabel, submissionLabel } from "@/lib/operational";
import { AlertCircle, Ban, CheckCircle2, Circle, Clock, PauseCircle } from "lucide-react";

const ALIASES = {
  termine: { label: "Terminé", color: "#16794A", Icon: CheckCircle2 },
  bloque: { label: "Bloqué", color: "#C93C37", Icon: Ban },
};
const ICONS = {
  acheve: CheckCircle2,
  en_cours: Clock,
  en_retard: AlertCircle,
  en_attente_arbitrage: Ban,
  suspendu: PauseCircle,
  non_demarre: Circle,
  valide: CheckCircle2,
  soumis: Clock,
  correction_demandee: AlertCircle,
  brouillon: Circle,
};

export function StatusBadge({ status, label, color, testid, size = "sm" }) {
  const alias = ALIASES[status];
  const resolvedColor = color || alias?.color || STATUS_COLORS[status] || SUBMISSION_COLORS[status] || "#667085";
  const resolvedLabel = label || alias?.label || (SUBMISSION_COLORS[status] ? submissionLabel(status) : statusLabel(status));
  const Icon = alias?.Icon || ICONS[status] || Circle;
  const pad = size === "sm" ? "px-2 py-[3px] text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span data-testid={testid}
      className={`inline-flex w-fit items-center gap-1.5 rounded-[4px] font-medium whitespace-nowrap border ${pad}`}
      style={{ color: resolvedColor, background: `${resolvedColor}12`, borderColor: `${resolvedColor}40` }}>
      <Icon size={12} strokeWidth={2} aria-hidden="true" />
      {resolvedLabel}
    </span>
  );
}
