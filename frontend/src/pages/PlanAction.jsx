import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, Briefcase, CheckCircle2, Clock, Edit3, Filter, History, Loader2, RefreshCw, Send, ShieldAlert } from "lucide-react";
import metfpaApi from "@/lib/metfpaApi";
import { useAuth } from "@/context/AuthContext";
import { apiError, dateTime, pct, PRIORITY_COLORS, shortDate, statusLabel } from "@/lib/operational";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DemoBanner } from "@/components/DemoBanner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";

const STATUSES = ["non_demarre", "en_cours", "acheve", "en_retard", "suspendu", "en_attente_arbitrage"];
const EMPTY_FILTERS = { direction: "", status: "", priority: "", risk: "" };

function needsWeeklyUpdate(mission) {
  if (["soumis", "valide"].includes(mission.submission_status) && mission.status !== "en_retard" && !mission.blocker) return false;
  if (mission.submission_status === "correction_demandee" || mission.status === "en_retard" || mission.blocker || mission.needs_arbitration || !mission.last_update) return true;
  const last = new Date(mission.last_update);
  return mission.status !== "acheve" && (!Number.isFinite(last.getTime()) || Date.now() - last.getTime() > 7 * 86400000);
}

export default function PlanAction() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isDirection = user?.role === "agency_director";
  const canUpdate = isDirection || ["dircab", "admin"].includes(user?.role);
  const [missions, setMissions] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS, direction: searchParams.get("direction") || "" }));
  const [view, setView] = useState(() => isDirection && searchParams.get("vue") !== "all" ? "updates" : "all");
  const [editing, setEditing] = useState(null);
  const [editIntent, setEditIntent] = useState("update");
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    const url = isDirection ? "/my-direction/missions" : "/missions";
    metfpaApi.get(url).then((r) => setMissions(r.data.items)).catch((e) => setError(apiError(e)));
    if (isDirection) metfpaApi.get("/update-log").then((r) => setUpdates(r.data.items.slice(0, 8))).catch(() => {});
  };
  useEffect(load, [isDirection]);

  const openEditor = (mission, intent = "update") => { setEditing(mission); setEditIntent(intent); };
  const options = useMemo(() => ({ directions: [...new Set((missions || []).map((m) => m.direction).filter(Boolean))].sort() }), [missions]);
  const filtered = useMemo(() => (missions || []).filter((m) =>
    (!filters.direction || m.direction === filters.direction) &&
    (!filters.status || m.status === filters.status) &&
    (!filters.priority || m.priority === filters.priority) &&
    (!filters.risk || m.risk_level === filters.risk)), [missions, filters]);
  const dueThisWeek = useMemo(() => (missions || []).filter(needsWeeklyUpdate), [missions]);
  const corrections = useMemo(() => (missions || []).filter((m) => m.submission_status === "correction_demandee"), [missions]);
  const summary = useMemo(() => ({
    total: (missions || []).length,
    overdue: (missions || []).filter((m) => m.status === "en_retard").length,
    blocked: (missions || []).filter((m) => m.blocker).length,
    corrections: corrections.length,
    completeness: missions?.length ? Math.round(missions.reduce((a, m) => a + m.completeness_score, 0) / missions.length) : 0,
  }), [missions, corrections]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!missions) return <PageSkeleton />;
  if (isDirection && !user?.direction) return <EmptyState icon={ShieldAlert} title="Accès non rattaché à une direction" description="Votre compte n’est rattaché à aucune direction. Contactez l’administrateur." />;

  return <div className="space-y-5 animate-slide-up" data-testid="page-plan-action">
    <Breadcrumb items={[{ label: isDirection ? "Ma Direction" : "Missions / Actions" }]} />
    <DemoBanner />
    <header className="bg-white rounded-[8px] border border-[var(--border)] p-5">
      <div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[var(--ci-orange-600)]"><Briefcase size={13} className="inline mr-1" />{isDirection ? `Direction ${user.direction}` : "Pilotage opérationnel"}</div>
      <h1 className="text-2xl font-bold mt-1">{isDirection ? "Ma direction en 1 coup d’œil" : "Missions et actions"}</h1>
      <p className="text-sm text-[var(--ink-700)] mt-2">{isDirection ? "Identifiez ce qui doit être actualisé, puis soumettez une mise à jour guidée au suivi-évaluation." : "Vue consolidée des missions reliées au PND, aux programmes budgétaires et aux directions responsables."}</p>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
        <Stat label="Missions" value={summary.total} />
        <Stat label="Mes actions en retard" value={summary.overdue} color="#C93C37" />
        <Stat label="Blocages déclarés" value={summary.blocked} color="#C93C37" />
        <Stat label="Corrections demandées" value={summary.corrections} color={summary.corrections ? "#C93C37" : "#667085"} />
        <Stat label="Complétude" value={pct(summary.completeness)} color="#16794A" />
      </div>
    </header>

    {isDirection && corrections.length > 0 && <section className="rounded-[8px] border border-[#C93C37]/35 bg-[#C93C37]/5 p-4" data-testid="corrections-requested">
      <div className="flex items-center gap-2 text-[#A33A32]"><AlertTriangle size={17} /><h2 className="font-semibold text-sm">Corrections demandées</h2></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">{corrections.map((m) => <CorrectionCard key={m.id} mission={m} onOpen={() => openEditor(m)} />)}</div>
    </section>}

    {isDirection ? <>
      <div className="bg-white border border-[var(--border)] rounded-[8px] p-1 inline-flex" role="tablist" aria-label="Vues des missions">
        <Tab active={view === "updates"} onClick={() => setView("updates")}>Mes missions à mettre à jour <span className="tabular-nums">({dueThisWeek.length})</span></Tab>
        <Tab active={view === "all"} onClick={() => setView("all")}>Toutes mes missions <span className="tabular-nums">({missions.length})</span></Tab>
      </div>
      {view === "updates" ? <section>
        <div className="flex items-end justify-between gap-3 mb-3"><div><h2 className="font-semibold">À mettre à jour cette semaine</h2><p className="text-xs text-[var(--ink-500)] mt-1">Retards, blocages, corrections et informations anciennes sont affichés en premier.</p></div></div>
        {dueThisWeek.length ? <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{dueThisWeek.map((m) => <DirectionMissionCard key={m.id} mission={m} onUpdate={() => openEditor(m)} onBlock={() => openEditor(m, "blocker")} onArbitrate={() => openEditor(m, "arbitration")} />)}</div> : <EmptyState icon={CheckCircle2} title="Toutes vos missions sont à jour" description="Aucune action en retard, aucun blocage et aucune correction ne nécessitent une mise à jour cette semaine." />}
      </section> : <MissionTable rows={filtered} canUpdate={canUpdate} onEdit={openEditor} showDirection={false} />}
      <Panel title="Historique récent" icon={History}>{updates.length ? updates.map((u) => <div key={u.id} className="border-b last:border-0 py-2 text-sm"><div className="font-medium">{u.mission_code} · {u.comment || "Mise à jour"}</div><div className="text-xs text-[var(--ink-500)]">{dateTime(u.created_at)} · {u.user}</div></div>) : <EmptyState compact title="Données non encore mises à jour" description="Vous n’avez pas encore soumis de mise à jour." />}</Panel>
    </> : <>
      <Filters filters={filters} setFilters={setFilters} directions={options.directions} count={filtered.length} />
      <MissionTable rows={filtered} canUpdate={canUpdate} onEdit={openEditor} showDirection />
    </>}

    <MissionDialog mission={editing} intent={editIntent} onClose={() => setEditing(null)} isDirection={isDirection} onSaved={(updated) => { setMissions((p) => p.map((m) => m.id === updated.id ? updated : m)); setEditing(null); load(); }} />
  </div>;
}

function DirectionMissionCard({ mission, onUpdate, onBlock, onArbitrate }) {
  return <article className={`rounded-[8px] border p-4 ${mission.status === "en_retard" || mission.submission_status === "correction_demandee" ? "border-[#C93C37]/35 bg-[#C93C37]/[0.03]" : "border-[var(--border)] bg-white"}`}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><div className="font-semibold text-sm">{mission.code} · {mission.action_title}</div><div className="text-xs text-[var(--ink-500)] mt-1">Dernière mise à jour : {dateTime(mission.last_update)}</div></div><div className="flex flex-wrap gap-1.5"><StatusBadge status={mission.status} /><StatusBadge status={mission.submission_status} /></div></div>
    <div className="mt-4"><div className="flex justify-between text-[11px] text-[var(--ink-500)] mb-1"><span>Avancement</span><span>Complétude {pct(mission.completeness_score)}</span></div><ProgressBar value={mission.progress} status={mission.status} showLabel /></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs"><Info label="Livrable attendu" value={mission.expected_deliverable} /><Info label="Prochaine étape" value={mission.next_step} /></div>
    {mission.blocker && <div className="rounded-[6px] bg-[#C93C37]/7 text-[#A33A32] text-xs p-2.5 mt-3"><strong>Blocage :</strong> {mission.blocker}</div>}
    <div className="flex flex-wrap gap-2 mt-4"><button onClick={onUpdate} className="primary-action"><Edit3 size={14} />Mettre à jour</button><button onClick={onBlock} className="small-action">Déclarer un blocage</button><button onClick={onArbitrate} className="small-action">Demander un arbitrage</button></div>
  </article>;
}

function CorrectionCard({ mission, onOpen }) {
  const comments = mission.comments || [];
  const reason = mission.correction_reason || mission.validation_comment || [...comments].reverse().find((c) => ["dircab", "me_validator"].includes(c.role))?.text;
  return <button onClick={onOpen} className="rounded-[7px] border border-[#C93C37]/25 bg-white p-3 text-left hover:border-[#C93C37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C93C37]"><div className="font-semibold text-sm">{mission.code} · {mission.action_title}</div><p className="text-xs text-[#A33A32] mt-2">{reason || "Correction demandée. Le motif détaillé n’est pas encore exposé par le backend."}</p><span className="text-[11px] font-semibold text-[#C93C37] mt-2 inline-block">Corriger la mise à jour</span></button>;
}

function MissionTable({ rows, canUpdate, onEdit, showDirection }) {
  if (!rows.length) return <EmptyState title="Aucune mission affectée" description="Aucune mission ne correspond à ce périmètre ou à ces filtres." />;
  return <div className="bg-white rounded-[8px] border border-[var(--border)] overflow-x-auto"><table className="w-full text-sm" data-testid="missions-table"><thead className="bg-[var(--surface-soft)] text-[11px] uppercase text-[var(--ink-500)]"><tr>{["Code", "Mission / action", ...(showDirection ? ["Direction"] : []), "Échéance", "Statut", "Avancement", "Livrable", "Blocage", "Dernière mise à jour", "Action"].map((h) => <th key={h} className="text-left px-3 py-2.5 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{rows.map((m) => <tr key={m.id} className="border-t border-[var(--border)] hover:bg-[var(--surface-soft)]" data-testid={`mission-row-${m.id}`}><Cell strong>{m.code}</Cell><Cell wide><div className="font-medium">{m.action_title}</div><div className="text-[11px] text-[var(--ink-500)]">{m.pnd_axis || "Axe PND manquant"}</div></Cell>{showDirection && <Cell>{m.direction || "Manquante"}</Cell>}<Cell>{shortDate(m.due_date)}</Cell><Cell><StatusBadge status={m.status} /></Cell><Cell><div className="min-w-32"><ProgressBar value={m.progress} status={m.status} showLabel /></div></Cell><Cell>{m.expected_deliverable || "Donnée incomplète"}</Cell><Cell danger={m.blocker}>{m.blocker || "—"}</Cell><Cell>{dateTime(m.last_update)}</Cell><Cell>{canUpdate ? <button onClick={() => onEdit(m)} className="small-action" aria-label={`Mettre à jour ${m.code}`}><Edit3 size={14} />Mettre à jour</button> : <span className="text-xs text-[var(--ink-500)]">Lecture</span>}</Cell></tr>)}</tbody></table></div>;
}

function MissionDialog({ mission, intent, onClose, isDirection, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!mission) return;
    setForm({ status: mission.status, progress: mission.progress, responsible_person: mission.responsible_person || "", due_date: mission.due_date || "", expected_deliverable: mission.expected_deliverable || "", deliverable_link: mission.deliverable_link || "", blocker: mission.blocker || "", has_blocker: intent === "blocker" || !!mission.blocker, decision_required: mission.decision_required || "", next_step: mission.next_step || "", priority: mission.priority || "moyenne", risk_level: mission.risk_level || "modere", needs_arbitration: intent === "arbitration" || !!mission.needs_arbitration, submission_status: mission.submission_status || "brouillon", comment: "" });
  }, [mission, intent]);
  if (!mission || !form) return null;
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  const save = async () => {
    if (isDirection && !form.comment.trim()) { toast.error("Décrivez en une phrase ce qui a changé cette semaine."); return; }
    setSaving(true);
    try {
      const { has_blocker, ...fields } = form;
      const payload = { ...fields, blocker: has_blocker ? fields.blocker : "", progress: Number(fields.progress) };
      const url = isDirection ? `/my-direction/missions/${mission.id}/updates` : `/missions/${mission.id}`;
      const r = await metfpaApi[isDirection ? "post" : "patch"](url, payload);
      toast.success(isDirection ? "Mise à jour soumise au suivi-évaluation" : "Mission mise à jour");
      onSaved(r.data);
    } catch (e) { toast.error(apiError(e, "Votre mise à jour n’a pas été enregistrée. Réessayez.")); }
    finally { setSaving(false); }
  };
  return <Dialog open={!!mission} onOpenChange={(o) => !o && onClose()}><DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto" data-testid="mission-update-dialog"><DialogHeader><DialogTitle>Mettre à jour · {mission.code}</DialogTitle><DialogDescription>{mission.action_title} · {mission.direction}</DialogDescription></DialogHeader>
    <div className="rounded-[7px] bg-[var(--surface-soft)] p-3"><div className="flex justify-between text-xs mb-2"><span className="font-semibold">Complétude de la mission</span><span>{pct(mission.completeness_score)}</span></div><ProgressBar value={mission.completeness_score} color={mission.completeness_score === 100 ? "#16794A" : "#D97706"} label="Complétude" /></div>
    <FormSection number="1" title="Avancement" help="Indiquez où en est la mission et ce qui doit se passer ensuite."><Field label="Statut"><select value={form.status} onChange={(e) => set("status", e.target.value)} className={input}>{STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></Field><Field label="Taux d’avancement (%)"><input type="number" min="0" max="100" value={form.progress} onChange={(e) => set("progress", e.target.value)} className={input} /></Field><Field label="Prochaine étape" span><input value={form.next_step} onChange={(e) => set("next_step", e.target.value)} className={input} placeholder="Action concrète à réaliser ensuite" /></Field><Field label="Responsable"><input value={form.responsible_person} onChange={(e) => set("responsible_person", e.target.value)} className={input} /></Field><Field label="Échéance"><input value={form.due_date} onChange={(e) => set("due_date", e.target.value)} className={input} placeholder="2026-T3 ou 2026-09-30" /></Field></FormSection>
    <FormSection number="2" title="Blocage / arbitrage" help="Signalez uniquement les difficultés qui nécessitent une action ou une décision."><label className="md:col-span-2 flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.has_blocker} onChange={(e) => set("has_blocker", e.target.checked)} />Cette mission est bloquée</label>{form.has_blocker && <Field label="Description du blocage" span><textarea value={form.blocker} onChange={(e) => set("blocker", e.target.value)} className={input} rows="3" placeholder="Cause, impact et action déjà tentée" /></Field>}<Field label="Décision attendue" span><textarea value={form.decision_required} onChange={(e) => set("decision_required", e.target.value)} className={input} rows="2" placeholder="Décision précise attendue du Cabinet" /></Field><Field label="Niveau de risque"><select value={form.risk_level} onChange={(e) => set("risk_level", e.target.value)} className={input}>{["faible", "modere", "eleve", "critique"].map((r) => <option key={r}>{r}</option>)}</select></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.needs_arbitration} onChange={(e) => set("needs_arbitration", e.target.checked)} />Demander un arbitrage du Cabinet</label></FormSection>
    <FormSection number="3" title="Livrable / commentaire" help="Ajoutez la preuve produite et résumez le changement de la semaine."><Field label="Livrable attendu"><input value={form.expected_deliverable} onChange={(e) => set("expected_deliverable", e.target.value)} className={input} /></Field><Field label="Lien vers le livrable"><input value={form.deliverable_link} onChange={(e) => set("deliverable_link", e.target.value)} className={input} /></Field><Field label="Priorité"><select value={form.priority} onChange={(e) => set("priority", e.target.value)} className={input}>{Object.keys(PRIORITY_COLORS).map((p) => <option key={p}>{p}</option>)}</select></Field>{!isDirection && <Field label="Statut de la soumission"><select value={form.submission_status} onChange={(e) => set("submission_status", e.target.value)} className={input}>{[["brouillon", "Brouillon"], ["soumis", "Soumis"], ["valide", "Validé"], ["correction_demandee", "Correction demandée"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>}<Field label={`Commentaire de suivi${isDirection ? " *" : ""}`} span><textarea value={form.comment} onChange={(e) => set("comment", e.target.value)} className={input} rows="3" placeholder="Décrivez en une phrase ce qui a changé cette semaine." /></Field></FormSection>
    <DialogFooter><button onClick={onClose} className="px-4 py-2 border rounded-[6px] text-sm">Annuler</button><button onClick={save} disabled={saving} className="primary-action px-4">{saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}{isDirection ? "Soumettre ma mise à jour" : "Enregistrer"}</button></DialogFooter>
  </DialogContent></Dialog>;
}

function FormSection({ number, title, help, children }) { return <section className="rounded-[8px] border border-[var(--border)] p-4"><div className="flex items-start gap-3 mb-4"><span className="w-6 h-6 rounded-full bg-[var(--ink-900)] text-white text-xs font-bold flex items-center justify-center shrink-0">{number}</span><div><h3 className="font-semibold text-sm">{title}</h3><p className="text-xs text-[var(--ink-500)] mt-0.5">{help}</p></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div></section>; }
function Filters({ filters, setFilters, directions, count }) { return <div className="bg-white border border-[var(--border)] rounded-[8px] p-4 flex flex-wrap gap-3 items-end" data-testid="mission-filters"><Filter size={16} className="text-[var(--ink-500)] mb-2" /><Select label="Direction" value={filters.direction} onChange={(v) => setFilters({ ...filters, direction: v })} options={directions} /><Select label="Statut" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={STATUSES} render={statusLabel} /><Select label="Priorité" value={filters.priority} onChange={(v) => setFilters({ ...filters, priority: v })} options={["faible", "moyenne", "haute", "critique"]} /><Select label="Risque" value={filters.risk} onChange={(v) => setFilters({ ...filters, risk: v })} options={["faible", "modere", "eleve", "critique"]} /><button onClick={() => setFilters(EMPTY_FILTERS)} className="small-action">Réinitialiser</button><span className="ml-auto text-xs text-[var(--ink-500)] pb-2">{count} résultat(s)</span></div>; }
const input = "w-full rounded-[6px] border border-[var(--border)] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[var(--ci-orange-600)] focus:ring-2 focus:ring-[var(--ci-orange-100)]";
function Field({ label, children, span }) { return <label className={span ? "md:col-span-2" : ""}><span className="text-xs font-semibold text-[var(--ink-700)]">{label}</span><div className="mt-1">{children}</div></label>; }
function Stat({ label, value, color = "#18212F" }) { return <div className="rounded-[6px] bg-[var(--surface-soft)] p-3"><div className="text-xl font-bold tabular-nums" style={{ color }}>{value}</div><div className="text-[11px] text-[var(--ink-500)]">{label}</div></div>; }
function Select({ label, value, onChange, options, render = (x) => x }) { return <label><span className="text-[11px] font-semibold text-[var(--ink-500)]">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="block mt-1 rounded-[6px] border border-[var(--border)] px-2.5 py-2 text-sm bg-white"><option value="">Tous</option>{options.map((o) => <option key={o} value={o}>{render(o)}</option>)}</select></label>; }
function Cell({ children, strong, wide, danger }) { return <td className={`px-3 py-3 align-top ${strong ? "font-semibold whitespace-nowrap" : ""} ${wide ? "min-w-[260px] max-w-[360px]" : "max-w-[220px]"} ${danger ? "text-[#A33A32]" : ""}`}>{children}</td>; }
function Info({ label, value }) { return <div className="rounded-[6px] bg-[var(--surface-soft)] p-2.5"><div className="text-[10px] text-[var(--ink-500)] uppercase font-semibold">{label}</div><div className="mt-1">{value || "Donnée incomplète"}</div></div>; }
function Panel({ title, icon: Icon, children }) { return <section className="bg-white border border-[var(--border)] rounded-[8px] p-4"><h2 className="font-semibold text-sm flex items-center gap-2"><Icon size={15} />{title}</h2><div className="mt-3">{children}</div></section>; }
function Tab({ active, onClick, children }) { return <button role="tab" aria-selected={active} onClick={onClick} className={`min-h-10 px-4 py-2 rounded-[6px] text-sm font-semibold ${active ? "bg-[var(--ink-900)] text-white" : "text-[var(--ink-500)] hover:bg-[var(--surface-soft)]"}`}>{children}</button>; }
function ErrorState({ message, onRetry }) { return <EmptyState icon={AlertTriangle} title="Chargement impossible" description={message} action={<button onClick={onRetry} className="small-action"><RefreshCw size={14} />Réessayer</button>} />; }
function PageSkeleton() { return <div className="space-y-4"><div className="h-44 bg-white rounded-[8px] animate-pulse" /><div className="h-72 bg-white rounded-[8px] animate-pulse" /></div>; }
