// Training/demo local state (Phase DIRCAB — formation).
// Persists agenda items, relances and alignment-link statuses in localStorage
// so the DIRCAB workflow is fully demonstrable while backend persistence for
// these objects is not yet built. Clearly flagged "démo" in every consuming UI.
const KEY = "metfpa_demo_dircab_v1";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function write(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
  listeners.forEach((fn) => fn());
}
const listeners = new Set();
export function subscribeDemoStore(fn) { listeners.add(fn); return () => listeners.delete(fn); }

const now = () => new Date().toISOString();

// ---------- Ordre du jour ----------
export function getAgenda() { return read().agenda || []; }
export function addAgendaItem(item) {
  const d = read();
  const agenda = d.agenda || [];
  if (item.linked_id && agenda.some((x) => x.linked_id === item.linked_id)) return false;
  agenda.push({ id: `odj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                created_at: now(), statut: "à traiter", priorite: "moyenne", suivi: "", ...item });
  write({ ...d, agenda });
  return true;
}
export function updateAgendaItem(id, patch) {
  const d = read();
  write({ ...d, agenda: (d.agenda || []).map((x) => (x.id === id ? { ...x, ...patch } : x)) });
}
export function removeAgendaItem(id) {
  const d = read();
  write({ ...d, agenda: (d.agenda || []).filter((x) => x.id !== id) });
}

// ---------- Relances ----------
export function getRelances() { return read().relances || []; }
export function addRelance({ direction, objet, source, echeance }) {
  const d = read();
  const relances = d.relances || [];
  relances.push({ id: `rel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                  direction, objet, source: source || "", echeance: echeance || "",
                  statut: "ouverte", created_at: now() });
  write({ ...d, relances });
}
export function updateRelance(id, patch) {
  const d = read();
  write({ ...d, relances: (d.relances || []).map((x) => (x.id === id ? { ...x, ...patch } : x)) });
}

// ---------- Statut des liens d'alignement (matrice) ----------
export const LINK_STATUSES = ["lien validé", "lien à corriger", "lien à compléter", "non aligné", "à arbitrer"];
export const LINK_STATUS_COLOR = {
  "lien validé": "#009E49", "lien à corriger": "#D97706", "lien à compléter": "#C5A028",
  "non aligné": "#C53030", "à arbitrer": "#7C3AED",
};
export function getLinkStatuses() { return read().links || {}; }
export function setLinkStatus(linkKey, status, author) {
  const d = read();
  write({ ...d, links: { ...(d.links || {}), [linkKey]: { status, author, date: now() } } });
}

// ---------- Décisions de la dernière réunion (démo) ----------
export function getMeetingNotes() { return read().meeting || []; }
export function addMeetingNote(text) {
  const d = read();
  write({ ...d, meeting: [...(d.meeting || []), { text, date: now() }].slice(-10) });
}
