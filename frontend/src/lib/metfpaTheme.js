// METFPA axes-oriented visual language (replaces generic 6-pillar semantics)

export const FRAMEWORK_COLOR = {
  PND: "#008751", // PND 4.02 — institutional green
  POL: "#F47C20", // EFTP Policy — institutional orange
  DIG: "#1F6FEB", // Digital Strategy — digital blue
};

// Axes within each framework
export const AXIS_COLOR = {
  // Policy axes AX1-AX3 (orange/gold family)
  AX1: "#F47C20", AX2: "#C89A2B", AX3: "#B85C00",
  // Digital axes D1-D3 (blue/teal/slate family)
  D1: "#1F6FEB", D2: "#0E7490", D3: "#52667A",
};

export function frameworkColor(k) { return FRAMEWORK_COLOR[k] || "#1A202C"; }
export function axisColor(code) { return AXIS_COLOR[code] || "#1A202C"; }

// Origin / validation badge metadata
export const ORIGIN_META = {
  official_reference: { label: "Officiel", color: "#006B3F", icon: "check" },
  validated: { label: "Validé", color: "#006B3F", icon: "check" },
  html_reference: { label: "Référence · à valider", color: "#64748B", icon: "doc" },
  pending_metfpa_validation: { label: "En attente de validation METFPA", color: "#C5A028", icon: "clock" },
  demo_tracking: { label: "Démonstration", color: "#FF8200", icon: "flask" },
  demo: { label: "Démonstration", color: "#FF8200", icon: "flask" },
  computed: { label: "Calculé", color: "#1F6FEB", icon: "calc" },
  missing: { label: "Donnée absente", color: "#C53030", icon: "missing" },
  to_validate: { label: "À valider", color: "#C5A028", icon: "clock" },
  rejected: { label: "Rejeté", color: "#C53030", icon: "missing" },
  correction_requested: { label: "Correction demandée", color: "#D97706", icon: "clock" },
};

// Validation outcomes worth surfacing next to the data-origin badge
export const VALIDATION_OUTCOMES = ["validated", "rejected", "correction_requested"];
