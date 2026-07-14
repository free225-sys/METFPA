import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellRing, CalendarClock, CheckCircle2, FileWarning, Loader2, RefreshCw } from "lucide-react";
import metfpaApi from "@/lib/metfpaApi";
import { useAuth } from "@/context/AuthContext";
import { ALERT_COLORS, alertAction, alertCategory, apiError, shortDate } from "@/lib/operational";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DemoBanner } from "@/components/DemoBanner";
import { EmptyState } from "@/components/EmptyState";
import { MissionDrawer } from "@/components/MissionDrawer";
import { StatusBadge } from "@/components/StatusBadge";

const GROUPS = [
  { key: "week", title: "À traiter cette semaine", description: "Situations critiques nécessitant une action immédiate.", color: "#C93C37", icon: AlertTriangle },
  { key: "month", title: "À anticiper ce mois", description: "Décisions, retards ou relances à préparer.", color: "#D97706", icon: CalendarClock },
  { key: "watch", title: "À surveiller", description: "Signaux à suivre sans arbitrage immédiat.", color: "#1F6FEB", icon: BellRing },
  { key: "incomplete", title: "Données incomplètes", description: "Informations à compléter pour fiabiliser le pilotage.", color: "#667085", icon: FileWarning },
];

export default function AlertesArbitrages() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [missionId, setMissionId] = useState(null);
  const load = () => { setError(""); metfpaApi.get("/alerts").then((r) => setData(r.data)).catch((e) => setError(apiError(e))); };
  useEffect(load, []);
  const grouped = useMemo(() => {
    const output = Object.fromEntries(GROUPS.map((g) => [g.key, []]));
    (data?.items || []).forEach((alert) => output[alertCategory(alert)].push(alert));
    return output;
  }, [data]);

  return <div className="space-y-5 animate-slide-up" data-testid="page-alertes-arbitrages">
    <Breadcrumb items={[{ label: "Alertes et arbitrages" }]} /><DemoBanner />
    <header className="bg-white rounded-[8px] border border-[var(--border)] p-5"><div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#C93C37]"><BellRing size={13} className="inline mr-1" /> Centre d’action</div><h1 className="text-2xl font-bold mt-1">Alertes de la semaine</h1><p className="text-sm text-[var(--ink-700)] mt-2">Chaque alerte précise la cause, la direction concernée et l’action recommandée.</p></header>
    {error ? <EmptyState icon={AlertTriangle} title="Chargement impossible" description={error} action={<button onClick={load} className="small-action"><RefreshCw size={14} />Réessayer</button>} /> : !data ? <div className="h-52 flex items-center justify-center"><Loader2 className="animate-spin text-[var(--ci-orange-600)]" /></div> : data.total === 0 ? <EmptyState icon={CheckCircle2} title="Aucune alerte cette semaine" description="Le pilotage est à jour." /> : GROUPS.map((group) => <AlertGroup key={group.key} group={group} items={grouped[group.key]} onOpen={setMissionId} />)}
    <MissionDrawer missionId={missionId} open={!!missionId} onOpenChange={(open) => !open && setMissionId(null)} role={user?.role} />
  </div>;
}

function AlertGroup({ group, items, onOpen }) {
  const Icon = group.icon;
  return <section className="bg-white rounded-[8px] border border-[var(--border)] overflow-hidden" style={{ borderTop: `3px solid ${group.color}` }}><div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3"><div><h2 className="font-semibold text-sm flex items-center gap-2"><Icon size={15} style={{ color: group.color }} />{group.title}</h2><p className="text-[11px] text-[var(--ink-500)] mt-1">{group.description}</p></div><span className="text-sm font-bold tabular-nums">{items.length}</span></div><div className="p-4">{items.length ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{items.map((a) => <AlertCard key={a.alert_id} alert={a} onOpen={onOpen} />)}</div> : <EmptyState compact title={`Aucune alerte — ${group.title.toLowerCase()}`} />}</div></section>;
}

function AlertCard({ alert, onOpen }) {
  const mission = alert.related_resource_type === "mission";
  const due = alert.evidence?.due_date;
  const content = <><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-sm">{alert.title}</div><div className="text-xs text-[var(--ink-500)] mt-1">{alert.direction || "Direction non renseignée"} · {mission ? `mission ${alert.related_resource_id}` : alert.related_resource_type}</div></div><StatusBadge label={alert.severity} color={ALERT_COLORS[alert.severity]} /></div><div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs"><Info label="Cause" value={alert.description} /><Info label="Action recommandée" value={alertAction(alert)} /></div>{due && <div className="text-[11px] text-[var(--ink-500)] mt-3">Date limite : <strong>{shortDate(due)}</strong></div>}{mission && <div className="text-[11px] font-semibold text-[#1F6FEB] mt-3">Ouvrir le contexte de la mission</div>}</>;
  return mission ? <button onClick={() => onOpen(alert.related_resource_id)} className="w-full rounded-[7px] border border-[var(--border)] p-4 text-left hover:border-[#1F6FEB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F6FEB]">{content}</button> : <article className="rounded-[7px] border border-[var(--border)] p-4">{content}</article>;
}
function Info({ label, value }) { return <div className="rounded-[6px] bg-[var(--surface-soft)] p-2.5"><div className="text-[10px] uppercase font-semibold text-[var(--ink-500)]">{label}</div><p className="mt-1 leading-relaxed">{value || "Donnée incomplète"}</p></div>; }
