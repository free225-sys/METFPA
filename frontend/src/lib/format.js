// Formatting helpers (French, FCFA millions) + strict pillar palette

export const STATUS_LABELS = {
  non_demarre: "Non démarré",
  en_cours: "En cours",
  termine: "Terminé",
  bloque: "Bloqué",
};

export const STATUS_ORDER = ["non_demarre", "en_cours", "termine", "bloque"];

// Strict pillar palette keyed by pillar code
export const PILLAR_COLOR = {
  "1": "#FF8200", // Gouvernance — National Orange
  "2": "#009E49", // Transformation économique — National Green
  "3": "#C5A028", // Infrastructures — Gold
  "4": "#006B3F", // Capital humain — Dark Green
  "5": "#CC6600", // Développement durable — Burnt Orange
  "6": "#A08020", // Cohésion sociale — Aged Gold
};

export const PILLAR_SHORT = {
  "1": "Gouvernance", "2": "Transformation éco.", "3": "Infrastructures",
  "4": "Capital humain", "5": "Dév. durable", "6": "Cohésion sociale",
};

export function pillarColor(code) {
  if (!code) return "#1A202C";
  return PILLAR_COLOR[String(code).split(".")[0]] || "#1A202C";
}

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function fmtMillions(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} Bn`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)} Md`;
  return `${Math.round(n).toLocaleString("fr-FR")} M`;
}

export function fmtFCFA(n) {
  if (n == null) return "—";
  return `${Math.round(n).toLocaleString("fr-FR")} M FCFA`;
}

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtDateLong(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${fmtDate(iso)} · ${d.getHours().toString().padStart(2, "0")}h${d.getMinutes().toString().padStart(2, "0")}`;
}
