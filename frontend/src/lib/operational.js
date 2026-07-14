export const STATUS_LABELS = {
  non_demarre: "Non démarré",
  en_cours: "En cours",
  acheve: "Achevé",
  en_retard: "En retard",
  suspendu: "Suspendu",
  en_attente_arbitrage: "En attente d'arbitrage",
};

export const STATUS_COLORS = {
  non_demarre: "#667085",
  en_cours: "#1F6FEB",
  acheve: "#16794A",
  en_retard: "#C93C37",
  suspendu: "#667085",
  en_attente_arbitrage: "#C93C37",
};

export const SUBMISSION_LABELS = {
  brouillon: "Brouillon",
  soumis: "Soumis au suivi-évaluation",
  valide: "Validé",
  correction_demandee: "Correction demandée",
};

export const SUBMISSION_COLORS = {
  brouillon: "#667085",
  soumis: "#1F6FEB",
  valide: "#16794A",
  correction_demandee: "#C93C37",
};

export const ALERT_COLORS = {
  critique: "#C93C37",
  eleve: "#D97706",
  modere: "#667085",
  faible: "#667085",
};

export const PRIORITY_COLORS = {
  faible: "#667085",
  moyenne: "#1F6FEB",
  haute: "#D97706",
  critique: "#C93C37",
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || "Non renseigné";
}

export function submissionLabel(status) {
  return SUBMISSION_LABELS[status] || status || "Non renseigné";
}

export function alertCategory(alert) {
  if (alert?.rule_id === "MISSION_INCOMPLETE") return "incomplete";
  if (alert?.severity === "critique") return "week";
  if (alert?.severity === "eleve") return "month";
  return "watch";
}

export function alertAction(alert) {
  const actions = {
    MISSION_OVERDUE: "Obtenir un plan de rattrapage et une nouvelle échéance.",
    MISSION_BLOCKED: "Qualifier le blocage et préparer l’arbitrage attendu.",
    MISSION_INCOMPLETE: "Compléter le responsable et l’échéance de la mission.",
    MISSION_ARBITRATION: "Préparer la décision pour le Directeur de cabinet.",
    DIRECTION_STALE: "Relancer la direction et demander une mise à jour cette semaine.",
    DECISION_OVERDUE: "Vérifier l’exécution de la décision et fixer une relance.",
  };
  return actions[alert?.rule_id] || "Vérifier la situation et désigner la prochaine action.";
}
export function pct(value) {
  const n = Number(value || 0);
  return `${Number.isFinite(n) ? n.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : 0} %`;
}

export function shortDate(value) {
  if (!value) return "Manquante";
  if (/^\d{4}-T[1-4]$/.test(value)) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("fr-FR");
}

export function dateTime(value) {
  if (!value) return "Jamais";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("fr-FR");
}

export function apiError(error, fallback = "Impossible de charger les données.") {
  return error?.response?.data?.detail || fallback;
}

export function Pill({ label, color = "#667085" }) {
  return (
    <span className="inline-flex items-center rounded-[4px] px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ color, background: `${color}14` }}>
      {label}
    </span>
  );
}
