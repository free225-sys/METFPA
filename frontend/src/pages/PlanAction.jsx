import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import metfpaApi from "@/lib/metfpaApi";
import { useAuth } from "@/context/AuthContext";
import { apiError, dateTime, pct, Pill, PRIORITY_COLORS, shortDate, statusLabel, STATUS_COLORS } from "@/lib/operational";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DemoBanner } from "@/components/DemoBanner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, Briefcase, Clock, Edit3, Filter, History, Loader2, RefreshCw } from "lucide-react";

const EMPTY_FILTERS = { direction: "", status: "", priority: "", risk: "" };
const STATUSES = ["non_demarre", "en_cours", "acheve", "en_retard", "suspendu", "en_attente_arbitrage"];

export default function PlanAction() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [missions, setMissions] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const isDirection = user?.role === "direction_editor";
  const canUpdate = isDirection || ["coordination", "admin"].includes(user?.role);

  const load = () => {
    setError("");
    const url = isDirection ? "/my-direction/missions" : "/missions";
    metfpaApi.get(url).then((r) => setMissions(r.data.items)).catch((e) => setError(apiError(e)));
    if (isDirection) metfpaApi.get("/update-log").then((r) => setUpdates(r.data.items.slice(0, 8))).catch(() => {});
  };
  useEffect(load, [isDirection]);

  const options = useMemo(() => ({
    directions: [...new Set((missions || []).map((m) => m.direction).filter(Boolean))].sort(),
  }), [missions]);

  const rows = useMemo(() => {
    let result = missions || [];
    const vue = searchParams.get("vue");
    if (vue === "updates") result = result.filter((m) => m.submission_status !== "soumis" || !m.last_update);
    if (vue === "delayed") result = result.filter((m) => m.status === "en_retard" || m.blocker);
    return result.filter((m) =>
      (!filters.direction || m.direction === filters.direction) &&
      (!filters.status || m.status === filters.status) &&
      (!filters.priority || m.priority === filters.priority) &&
      (!filters.risk || m.risk_level === filters.risk));
  }, [missions, filters, searchParams]);

  const summary = useMemo(() => ({
    total: (missions || []).length,
    active: (missions || []).filter((m) => m.status === "en_cours").length,
    overdue: (missions || []).filter((m) => m.status === "en_retard").length,
    blocked: (missions || []).filter((m) => m.blocker).length,
    arbitration: (missions || []).filter((m) => m.needs_arbitration).length,
    completeness: missions?.length ? Math.round(missions.reduce((a, m) => a + m.completeness_score, 0) / missions.length) : 0,
  }), [missions]);

  return <div className="space-y-6 animate-slide-up" data-testid="page-plan-action">
    <Breadcrumb items={[{ label: isDirection ? "Ma Direction" : "Missions / Actions" }]} /><DemoBanner />
    <div className="bg-white rounded-[8px] border border-[var(--border)] p-6">
      <div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[var(--ci-orange-600)]"><Briefcase size={13} className="inline mr-1" />{isDirection ? `Direction ${user.direction}` : "Pilotage opérationnel"}</div>
      <h1 className="text-2xl font-bold mt-1">{isDirection ? "Mon espace Direction" : "Missions et actions"}</h1>
      <p className="text-sm text-[var(--ink-700)] mt-2">{isDirection ? "Mettez à jour chaque semaine l'avancement, les livrables, les blocages et les décisions attendues de votre périmètre." : "Vue consolidée des missions reliées au PND, aux programmes budgétaires et aux directions responsables."}</p>
      {missions && <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mt-5"><Stat label="Missions" value={summary.total} /><Stat label="En cours" value={summary.active} color="#1F6FEB" /><Stat label="En retard" value={summary.overdue} color="#D97706" /><Stat label="Blocages" value={summary.blocked} color="#C93C37" /><Stat label="Arbitrages" value={summary.arbitration} color="#C89A2B" /><Stat label="Complétude" value={pct(summary.completeness)} color="#16794A" /></div>}
    </div>

    <div className="bg-white border border-[var(--border)] rounded-[8px] p-4 flex flex-wrap gap-3 items-end" data-testid="mission-filters">
      <Filter size={16} className="text-[var(--ink-500)] mb-2" />
      {!isDirection && <Select label="Direction" value={filters.direction} onChange={(v) => setFilters({ ...filters, direction: v })} options={options.directions} />}
      <Select label="Statut" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={STATUSES} render={statusLabel} />
      <Select label="Priorité" value={filters.priority} onChange={(v) => setFilters({ ...filters, priority: v })} options={["faible", "moyenne", "haute", "critique"]} />
      <Select label="Risque" value={filters.risk} onChange={(v) => setFilters({ ...filters, risk: v })} options={["faible", "modere", "eleve", "critique"]} />
      <button onClick={() => setFilters(EMPTY_FILTERS)} className="text-xs px-3 py-2 rounded-[6px] border border-[var(--border)]">Réinitialiser</button>
      <span className="ml-auto text-xs text-[var(--ink-500)]">{rows.length} résultat(s)</span>
    </div>

    {error ? <Error message={error} onRetry={load} /> : !missions ? <Loader2 className="animate-spin mx-auto" /> : <div className="bg-white rounded-[8px] border border-[var(--border)] overflow-x-auto">
      <table className="w-full text-sm" data-testid="missions-table">
        <thead className="bg-[var(--surface-soft)] text-[11px] uppercase text-[var(--ink-500)]"><tr>{["Code","Axe PND","Mission / action","Direction","Responsable","Échéance","Statut","Avancement","Livrable","Blocage","Décision attendue","Dernière MAJ","Actions"].map((h) => <th key={h} className="text-left px-3 py-2.5 whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{rows.map((m) => <tr key={m.id} className="border-t border-[var(--border)] hover:bg-[var(--surface-soft)]" data-testid={`mission-row-${m.id}`}>
          <Cell strong>{m.code}</Cell><Cell>{m.pnd_axis || "Manquant"}</Cell><Cell wide><div className="font-medium">{m.action_title}</div><div className="text-[11px] text-[var(--ink-500)]">{m.strategic_objective || "Objectif non renseigné"}</div></Cell><Cell>{m.direction || "Manquante"}</Cell><Cell>{m.responsible_person || "Manquant"}</Cell><Cell>{shortDate(m.due_date)}</Cell><Cell><Pill label={statusLabel(m.status)} color={STATUS_COLORS[m.status]} /></Cell><Cell>{pct(m.progress)}</Cell><Cell>{m.expected_deliverable || "Manquant"}</Cell><Cell danger={m.blocker}>{m.blocker || "—"}</Cell><Cell>{m.decision_required || "—"}</Cell><Cell>{dateTime(m.last_update)}</Cell><Cell>{canUpdate ? <button onClick={() => setEditing(m)} className="p-1.5 rounded-[5px] hover:bg-[#F47C20]/10 text-[#9A4D00]" aria-label="Mettre à jour"><Edit3 size={15} /></button> : <span className="text-xs text-[var(--ink-500)]">Lecture</span>}</Cell>
        </tr>)}</tbody>
      </table>
    </div>}

    {isDirection && <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Panel title="Tâches à mettre à jour cette semaine" icon={Clock}>{(missions || []).filter((m) => !m.last_update || m.status === "en_retard" || m.blocker).slice(0, 6).map((m) => <Mini key={m.id} mission={m} onClick={() => setEditing(m)} />)}</Panel>
      <Panel title="Historique récent" icon={History}>{updates.length ? updates.map((u) => <div key={u.id} className="border-b last:border-0 py-2 text-sm"><div className="font-medium">{u.mission_code} · {u.comment || "Mise à jour"}</div><div className="text-xs text-[var(--ink-500)]">{dateTime(u.created_at)} · {u.user}</div></div>) : <p className="text-sm text-[var(--ink-500)] italic">Aucune mise à jour enregistrée.</p>}</Panel>
    </div>}
    <MissionDialog mission={editing} onClose={() => setEditing(null)} isDirection={isDirection} onSaved={(updated) => { setMissions((p) => p.map((m) => m.id === updated.id ? updated : m)); setEditing(null); load(); }} />
  </div>;
}

function MissionDialog({ mission, onClose, isDirection, onSaved }) {
  const [form, setForm] = useState(null); const [saving, setSaving] = useState(false);
  useEffect(() => { if (mission) setForm({ status: mission.status, progress: mission.progress, responsible_person: mission.responsible_person || "", due_date: mission.due_date || "", expected_deliverable: mission.expected_deliverable || "", deliverable_link: mission.deliverable_link || "", blocker: mission.blocker || "", decision_required: mission.decision_required || "", next_step: mission.next_step || "", priority: mission.priority || "moyenne", risk_level: mission.risk_level || "modere", needs_arbitration: !!mission.needs_arbitration, submission_status: mission.submission_status || "brouillon", comment: "" }); }, [mission]);
  if (!mission || !form) return null;
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  const save = async () => { if (isDirection && !form.comment.trim()) { toast.error("Un commentaire de suivi est requis"); return; } setSaving(true); try { const url = isDirection ? `/my-direction/missions/${mission.id}/updates` : `/missions/${mission.id}`; const method = isDirection ? "post" : "patch"; const r = await metfpaApi[method](url, { ...form, progress: Number(form.progress) }); toast.success(isDirection ? "Mise à jour soumise" : "Mission mise à jour"); onSaved(r.data); } catch (e) { toast.error(apiError(e, "Échec de la mise à jour")); } finally { setSaving(false); } };
  return <Dialog open={!!mission} onOpenChange={(o) => !o && onClose()}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="mission-update-dialog"><DialogHeader><DialogTitle>Mettre à jour · {mission.code}</DialogTitle><DialogDescription>{mission.action_title} · {mission.direction}</DialogDescription></DialogHeader><div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <Field label="Statut"><select value={form.status} onChange={(e) => set("status", e.target.value)} className={input}>{STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></Field>
    <Field label="Avancement (%)"><input type="number" min="0" max="100" value={form.progress} onChange={(e) => set("progress", e.target.value)} className={input} /></Field>
    <Field label="Responsable"><input value={form.responsible_person} onChange={(e) => set("responsible_person", e.target.value)} className={input} /></Field>
    <Field label="Échéance"><input value={form.due_date} onChange={(e) => set("due_date", e.target.value)} className={input} placeholder="2026-T3 ou 2026-09-30" /></Field>
    <Field label="Livrable attendu"><input value={form.expected_deliverable} onChange={(e) => set("expected_deliverable", e.target.value)} className={input} /></Field>
    <Field label="Lien vers le livrable"><input value={form.deliverable_link} onChange={(e) => set("deliverable_link", e.target.value)} className={input} /></Field>
    <Field label="Priorité"><select value={form.priority} onChange={(e) => set("priority", e.target.value)} className={input}>{Object.keys(PRIORITY_COLORS).map((p) => <option key={p}>{p}</option>)}</select></Field>
    <Field label="Niveau de risque"><select value={form.risk_level} onChange={(e) => set("risk_level", e.target.value)} className={input}>{["faible","modere","eleve","critique"].map((r) => <option key={r}>{r}</option>)}</select></Field>
    {!isDirection && <Field label="Statut de la mise à jour"><select value={form.submission_status} onChange={(e) => set("submission_status", e.target.value)} className={input}>{[["brouillon","Brouillon"],["soumis","Soumis"],["valide","Validé"],["correction_demandee","Correction demandée"]].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></Field>}
    <Field label="Blocage" span><textarea value={form.blocker} onChange={(e) => set("blocker", e.target.value)} className={input} rows="2" /></Field>
    <Field label="Décision attendue" span><textarea value={form.decision_required} onChange={(e) => set("decision_required", e.target.value)} className={input} rows="2" /></Field>
    <Field label="Prochaine étape" span><input value={form.next_step} onChange={(e) => set("next_step", e.target.value)} className={input} /></Field>
    <Field label={`Commentaire de suivi${isDirection ? " *" : ""}`} span><textarea value={form.comment} onChange={(e) => set("comment", e.target.value)} className={input} rows="3" /></Field>
    <label className="md:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.needs_arbitration} onChange={(e) => set("needs_arbitration", e.target.checked)} /> Besoin d'arbitrage du Cabinet</label>
  </div><DialogFooter><button onClick={onClose} className="px-4 py-2 border rounded-[6px] text-sm">Annuler</button><button onClick={save} disabled={saving} className="px-4 py-2 bg-[var(--ci-orange-600)] text-white rounded-[6px] text-sm font-semibold">{saving ? "Enregistrement…" : isDirection ? "Soumettre la mise à jour" : "Enregistrer"}</button></DialogFooter></DialogContent></Dialog>;
}

const input = "w-full rounded-[6px] border border-[var(--border)] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[var(--ci-orange-600)]";
function Field({ label, children, span }) { return <label className={span ? "md:col-span-2" : ""}><span className="text-xs font-semibold text-[var(--ink-700)]">{label}</span><div className="mt-1">{children}</div></label>; }
function Stat({ label, value, color = "#18212F" }) { return <div className="rounded-[6px] bg-[var(--surface-soft)] p-3"><div className="text-xl font-bold" style={{ color }}>{value}</div><div className="text-[11px] text-[var(--ink-500)]">{label}</div></div>; }
function Select({ label, value, onChange, options, render = (x) => x }) { return <label><span className="text-[11px] font-semibold text-[var(--ink-500)]">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="block mt-1 rounded-[6px] border border-[var(--border)] px-2.5 py-2 text-sm bg-white"><option value="">Tous</option>{options.map((o) => <option key={o} value={o}>{render(o)}</option>)}</select></label>; }
function Cell({ children, strong, wide, danger }) { return <td className={`px-3 py-3 align-top ${strong ? "font-semibold whitespace-nowrap" : ""} ${wide ? "min-w-[280px] max-w-[360px]" : "max-w-[220px]"} ${danger ? "text-[#A33A32]" : ""}`}>{children}</td>; }
function Panel({ title, icon: Icon, children }) { return <section className="bg-white border border-[var(--border)] rounded-[8px] p-4"><h2 className="font-semibold text-sm flex items-center gap-2"><Icon size={15} />{title}</h2><div className="mt-3">{children}</div></section>; }
function Mini({ mission, onClick }) { return <button onClick={onClick} className="w-full text-left border-b last:border-0 py-2"><div className="text-sm font-medium">{mission.code} · {mission.action_title}</div><div className="text-xs text-[var(--ink-500)]">{statusLabel(mission.status)} · {shortDate(mission.due_date)}</div></button>; }
function Error({ message, onRetry }) { return <div className="bg-white border rounded-[8px] p-6 text-center"><AlertTriangle className="mx-auto text-[#C93C37]" /><p className="text-sm mt-2">{message}</p><button onClick={onRetry} className="mt-3 inline-flex gap-1 px-3 py-2 border rounded-[6px] text-sm"><RefreshCw size={14} />Réessayer</button></div>; }
