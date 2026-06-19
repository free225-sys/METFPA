// Formatting helpers (French, FCFA millions)

export const STATUS_LABELS = {
  non_demarre: "Non démarré",
  en_cours: "En cours",
  termine: "Terminé",
  bloque: "Bloqué",
};

export const STATUS_ORDER = ["non_demarre", "en_cours", "termine", "bloque"];

export const PILLAR_COLORS = ["#FF8200", "#009E49", "#C5A028", "#1A202C", "#E5703B", "#3B7A57"];

export function fmtMillions(n) {
  if (n == null) return "—";
  // n is in millions FCFA
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

export function progressColor(p) {
  if (p >= 80) return "#009E49";
  if (p >= 40) return "#C5A028";
  return "#FF8200";
}
