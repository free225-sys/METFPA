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
  en_retard: "#D97706",
  suspendu: "#667085",
  en_attente_arbitrage: "#C93C37",
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
