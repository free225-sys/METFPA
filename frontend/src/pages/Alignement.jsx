import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, GitMerge, Loader2, RefreshCw } from "lucide-react";
import metfpaApi from "@/lib/metfpaApi";
import { useAuth } from "@/context/AuthContext";
import { apiError, pct, PRIORITY_COLORS, statusLabel } from "@/lib/operational";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DemoBanner } from "@/components/DemoBanner";
import { EmptyState } from "@/components/EmptyState";
import { MissionDrawer } from "@/components/MissionDrawer";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";

const EMPTY_FILTERS = { pnd_axis: "", objective: "", program: "", direction: "", status: "", priority: "", risk: "" };

export default function Alignement() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [missionId, setMissionId] = useState(null);
  const load = () => { setError(""); metfpaApi.get("/pnd-alignment").then((r) => setData(r.data)).catch((e) => setError(apiError(e))); };
  useEffect(load, []);
  const options = useMemo(() => { const rows = data?.items || []; const uniq = (k) => [...new Set(rows.map((x) => x[k]).filter(Boolean))].sort(); return { pnd_axis: uniq("pnd_axis"), objective: uniq("strategic_objective"), program: uniq("budget_program"), direction: uniq("direction"), status: uniq("status"), priority: uniq("priority"), risk: uniq("risk_level") }; }, [data]);
  const rows = useMemo(() => (data?.items || []).filter((x) => (!filters.pnd_axis || x.pnd_axis === filters.pnd_axis) && (!filters.objective || x.strategic_objective === filters.objective) && (!filters.program || x.budget_program === filters.program) && (!filters.direction || x.direction === filters.direction) && (!filters.status || x.status === filters.status) && (!filters.priority || x.priority === filters.priority) && (!filters.risk || x.risk_level === filters.risk)), [data, filters]);
  const groups = useMemo(() => {
    const grouped = {};
    rows.forEach((row) => { const axis = row.pnd_axis || "Axe PND non renseigné"; (grouped[axis] ||= []).push(row); });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  return <div className="space-y-5 animate-slide-up" data-testid="page-alignement">
    <Breadcrumb items={[{ label: "Alignement PND" }]} /><DemoBanner />
    <header className="bg-white rounded-[8px] border border-[var(--border)] p-5"><div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[var(--ci-green-700)]"><GitMerge size={13} className="inline mr-1" /> Contribution stratégique</div><h1 className="text-2xl font-bold mt-1">Du PND aux missions opérationnelles</h1><p className="text-sm text-[var(--ink-700)] mt-2">Visualisez, axe par axe, les missions contributrices, leur direction responsable et leur avancement.</p><div className="flex flex-wrap items-center gap-1.5 mt-4">{(data?.chain || ["PND", "Axe", "Objectif sectoriel", "Programme budgétaire", "Mission", "Direction", "Statut", "Avancement"]).map((c, i, a) => <React.Fragment key={c}><span className="text-xs px-2 py-1 rounded-[5px] bg-[var(--surface-soft)] border">{c}</span>{i < a.length - 1 && <ChevronRight size={13} className="text-[var(--ink-500)]" />}</React.Fragment>)}</div></header>
    {error ? <EmptyState icon={AlertTriangle} title="Chargement impossible" description={error} action={<button onClick={load} className="small-action"><RefreshCw size={14} />Réessayer</button>} /> : !data ? <div className="h-52 flex items-center justify-center"><Loader2 className="animate-spin text-[var(--ci-orange-600)]" /></div> : <>
      <div className="bg-white border rounded-[8px] p-4"><div className="flex flex-wrap gap-3 items-end">{Object.entries({ pnd_axis: "Axe PND", objective: "Objectif", program: "Programme", direction: "Direction", status: "Statut", priority: "Priorité", risk: "Risque" }).map(([key, label]) => <Filter key={key} label={label} value={filters[key]} options={options[key]} render={key === "status" ? statusLabel : undefined} onChange={(value) => setFilters({ ...filters, [key]: value })} />)}<button onClick={() => setFilters(EMPTY_FILTERS)} className="small-action">Réinitialiser</button><span className="ml-auto text-xs text-[var(--ink-500)] pb-2">{rows.length} mission(s)</span></div></div>
      {groups.length ? <div className="space-y-4" data-testid="pnd-alignment-groups">{groups.map(([axis, missions]) => <AxisGroup key={axis} axis={axis} missions={missions} onMission={setMissionId} />)}</div> : <EmptyState title="Aucune mission trouvée" description="Aucune mission ne correspond aux filtres sélectionnés." />}
    </>}
    <MissionDrawer missionId={missionId} open={!!missionId} onOpenChange={(open) => !open && setMissionId(null)} role={user?.role} />
  </div>;
}

function AxisGroup({ axis, missions, onMission }) {
  const execution = Math.round(missions.reduce((sum, m) => sum + Number(m.progress || 0), 0) / missions.length);
  const overdue = missions.filter((m) => m.status === "en_retard").length;
  return <section className="bg-white rounded-[8px] border border-[var(--border)] overflow-hidden"><div className="px-5 py-4 border-b border-[var(--border)] grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4"><div><div className="text-[10px] uppercase font-semibold tracking-wide text-[var(--ink-500)]">Axe PND</div><h2 className="font-semibold mt-1">{axis}</h2><div className="text-xs text-[var(--ink-500)] mt-1">{missions.length} mission(s) · {overdue} en retard</div></div><div><div className="flex justify-between text-xs mb-1"><span>Exécution agrégée</span><strong>{pct(execution)}</strong></div><ProgressBar value={execution} color={overdue ? "#D97706" : "#16794A"} label={`Exécution ${axis}`} /></div></div><div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-3">{missions.map((m) => <button key={m.id} onClick={() => onMission(m.id)} className="rounded-[7px] border border-[var(--border)] p-4 text-left hover:border-[#1F6FEB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F6FEB]"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-sm">{m.action_title}</div><div className="text-xs text-[var(--ink-500)] mt-1">{m.direction || "Direction manquante"} · {m.budget_program || "Programme budgétaire manquant"}</div></div><StatusBadge status={m.status} /></div><div className="mt-3"><ProgressBar value={m.progress} status={m.status} showLabel /></div><div className="flex flex-wrap gap-1.5 mt-3"><StatusBadge label={m.priority} color={PRIORITY_COLORS[m.priority]} />{(!m.pnd_axis || !m.budget_program || !m.direction) && <StatusBadge label="Donnée incomplète" color="#667085" />}</div></button>)}</div></section>;
}
function Filter({ label, value, options, onChange, render = (x) => x }) { return <label><span className="text-[11px] font-semibold text-[var(--ink-500)]">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="block mt-1 max-w-[220px] rounded-[6px] border px-2 py-2 text-sm bg-white"><option value="">Tous</option>{options.map((o) => <option key={o} value={o}>{render(o)}</option>)}</select></label>; }
