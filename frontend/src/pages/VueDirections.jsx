import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, Building2, CheckCircle2, ClipboardCopy, Loader2, RefreshCw } from "lucide-react";
import metfpaApi from "@/lib/metfpaApi";
import { apiError, dateTime, pct } from "@/lib/operational";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DemoBanner } from "@/components/DemoBanner";
import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";

export default function VueDirections() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const load = () => { setError(""); metfpaApi.get("/directions-performance").then((r) => setData(r.data)).catch((e) => setError(apiError(e))); };
  useEffect(load, []);
  const rows = useMemo(() => (data?.items || []).filter((d) => d.direction.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(b.needs_follow_up) - Number(a.needs_follow_up) || b.missions_overdue - a.missions_overdue || a.direction.localeCompare(b.direction)), [data, query]);
  const copyFollowUp = async (d) => {
    try { await navigator.clipboard.writeText(`Relance — ${d.direction} : ${d.missions_overdue} mission(s) en retard et ${d.blockers} blocage(s). Merci de mettre à jour votre périmètre cette semaine.`); toast.success("Texte de relance copié", { description: "Envoi manuel · non partagé dans l’application" }); }
    catch { toast.error("Copie impossible"); }
  };

  return <div className="space-y-5 animate-slide-up" data-testid="page-vue-directions">
    <Breadcrumb items={[{ label: "Performance par direction" }]} /><DemoBanner />
    <header className="bg-white rounded-[8px] border border-[var(--border)] p-5"><div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[var(--ci-green-700)]"><Building2 size={13} className="inline mr-1" /> Consolidation directionnelle</div><h1 className="text-2xl font-bold mt-1">Avancement par direction</h1><p className="text-sm text-[var(--ink-700)] mt-2">Les directions à relancer sont affichées en premier. Le seuil est fixé à {data?.stale_after_days || 14} jours sans mise à jour.</p></header>
    {data && <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><Metric label="Directions suivies" value={data.total} /><Metric label="Directions à relancer" value={data.directions_to_follow_up} color="#C93C37" /><Metric label="Directions à jour" value={data.total - data.directions_to_follow_up} color="#16794A" /></div>}
    <div className="bg-white rounded-[8px] border border-[var(--border)] p-3"><label className="text-xs font-semibold text-[var(--ink-700)]">Rechercher une direction<input value={query} onChange={(e) => setQuery(e.target.value)} className="block mt-1 w-full sm:max-w-sm rounded-[6px] border border-[var(--border)] px-3 py-2 text-sm" placeholder="Nom ou sigle" /></label></div>
    {error ? <EmptyState icon={AlertTriangle} title="Chargement impossible" description={error} action={<button onClick={load} className="small-action"><RefreshCw size={14} />Réessayer</button>} /> : !data ? <div className="h-52 flex items-center justify-center"><Loader2 className="animate-spin text-[var(--ci-orange-600)]" /></div> : rows.length ? <div className="grid grid-cols-1 xl:grid-cols-2 gap-4" data-testid="directions-performance-cards">{rows.map((d) => <DirectionCard key={d.direction} direction={d} onCopy={() => copyFollowUp(d)} />)}</div> : <EmptyState icon={CheckCircle2} title="Aucune direction trouvée" description="Modifiez le terme recherché." />}
  </div>;
}

function DirectionCard({ direction: d, onCopy }) {
  return <article className={`rounded-[8px] border bg-white p-4 ${d.needs_follow_up ? "border-[#C93C37]/35" : "border-[var(--border)]"}`}>
    <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{d.direction}</h2><p className="text-xs text-[var(--ink-500)] mt-1">Dernière mise à jour : {dateTime(d.last_update)}</p></div>{d.needs_follow_up ? <StatusBadge label="À relancer" color="#C93C37" /> : <StatusBadge label="À jour" color="#16794A" />}</div>
    <div className="mt-4"><div className="flex justify-between text-xs mb-1"><span className="text-[var(--ink-500)]">Score d’exécution</span><strong>{pct(d.execution_rate)}</strong></div><ProgressBar value={d.execution_rate} color={d.missions_overdue || d.blockers ? "#D97706" : "#16794A"} label={`Exécution ${d.direction}`} /></div>
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4"><Mini label="Missions" value={d.missions_total} /><Mini label="Retards" value={d.missions_overdue} danger={d.missions_overdue} /><Mini label="Blocages" value={d.blockers} danger={d.blockers} /><Mini label="Décisions" value={d.decisions_required} /><Mini label="Complétude" value={pct(d.completeness_rate)} /></div>
    <div className="flex flex-wrap gap-2 mt-4"><Link to={`/plan-action?direction=${encodeURIComponent(d.direction)}`} className="primary-action">Voir les missions</Link>{d.needs_follow_up && <button onClick={onCopy} className="small-action"><ClipboardCopy size={14} />Copier la relance</button>}</div>
    {d.needs_follow_up && <p className="text-[10px] text-[var(--ink-500)] mt-2">Relance manuelle · non partagée dans l’application.</p>}
  </article>;
}
function Metric({ label, value, color = "#18212F" }) { return <div className="bg-white rounded-[8px] border border-[var(--border)] p-4"><div className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</div><div className="text-xs text-[var(--ink-500)] mt-1">{label}</div></div>; }
function Mini({ label, value, danger }) { return <div className="rounded-[6px] bg-[var(--surface-soft)] p-2.5"><div className={`font-bold tabular-nums ${danger ? "text-[#C93C37]" : ""}`}>{value}</div><div className="text-[10px] text-[var(--ink-500)]">{label}</div></div>; }
