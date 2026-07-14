import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, Gavel, Loader2, RefreshCw, Users2 } from "lucide-react";
import metfpaApi from "@/lib/metfpaApi";
import { useAuth } from "@/context/AuthContext";
import { ALERT_COLORS, alertAction, apiError, dateTime, shortDate } from "@/lib/operational";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DemoBanner } from "@/components/DemoBanner";
import { EmptyState } from "@/components/EmptyState";
import { MissionDrawer } from "@/components/MissionDrawer";
import { StatusBadge } from "@/components/StatusBadge";

export default function SuiviHebdo() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState("");
  const [missionId, setMissionId] = useState(null);
  const load = () => { setError(""); Promise.all([metfpaApi.get("/weekly-meetings"), metfpaApi.get("/alerts")]).then(([m, a]) => { setMeetings(m.data); setAlerts(a.data); }).catch((e) => setError(apiError(e))); };
  useEffect(load, []);
  const commitments = useMemo(() => (meetings?.items || []).flatMap((m) => m.previous_commitments || []), [meetings]);
  const decisions = useMemo(() => (meetings?.items || []).flatMap((m) => m.decisions || []), [meetings]);
  const stale = useMemo(() => (alerts?.items || []).filter((a) => a.rule_id === "DIRECTION_STALE"), [alerts]);

  return <div className="space-y-5 animate-slide-up" data-testid="page-suivi-hebdo">
    <Breadcrumb items={[{ label: "Suivi hebdomadaire" }]} /><DemoBanner />
    <header className="bg-white rounded-[8px] border border-[var(--border)] p-5"><div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#7C3AED]"><CalendarClock size={13} className="inline mr-1" /> Cycle de coordination</div><h1 className="text-2xl font-bold mt-1">Préparer · Décider · Suivre</h1><p className="text-sm text-[var(--ink-700)] mt-2">Une lecture en trois temps pour préparer la réunion, consigner les décisions et suivre leur exécution.</p></header>
    {error ? <EmptyState icon={AlertTriangle} title="Chargement impossible" description={error} action={<button onClick={load} className="small-action"><RefreshCw size={14} />Réessayer</button>} /> : !meetings || !alerts ? <div className="h-52 flex items-center justify-center"><Loader2 className="animate-spin text-[var(--ci-orange-600)]" /></div> : <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Kpi icon={AlertTriangle} label="Alertes critiques" value={alerts.counts.critique} color="#C93C37" /><Kpi icon={Gavel} label="Décisions à préparer" value={meetings.proposed_agenda.filter((p) => p.subject.toLowerCase().includes("décision") || p.subject.toLowerCase().includes("arbitrage")).length} color="#D97706" /><Kpi icon={Users2} label="Directions à relancer" value={stale.length} color="#C93C37" /><Kpi icon={ClipboardCheck} label="Engagements suivis" value={commitments.length} color="#16794A" /></div>

      <Phase number="1" title="Avant la réunion" subtitle="Préparer l’ordre du jour et les décisions attendues" color="#D97706" action={<Link to="/ordre-du-jour" className="primary-action">Préparer l’ordre du jour</Link>}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4"><Panel title="Ordre du jour proposé"><Agenda items={meetings.proposed_agenda.slice(0, 6)} onMission={setMissionId} /></Panel><Panel title="Alertes à discuter"><Alerts items={alerts.items.filter((a) => ["critique", "eleve"].includes(a.severity)).slice(0, 6)} onMission={setMissionId} /></Panel><Panel title="Directions à relancer">{stale.length ? <div className="space-y-2">{stale.slice(0, 6).map((a) => <div key={a.alert_id} className="rounded-[6px] bg-[var(--surface-soft)] p-3"><div className="text-sm font-semibold">{a.direction}</div><p className="text-xs text-[var(--ink-500)] mt-1">{alertAction(a)}</p></div>)}</div> : <EmptyState compact icon={CheckCircle2} title="Aucune direction à relancer" />}</Panel></div>
      </Phase>

      <Phase number="2" title="Pendant la réunion" subtitle="Tracer les décisions, responsables et délais" color="#1F6FEB" action={<Link to="/ordre-du-jour" className="small-action">Ouvrir la séance</Link>}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Panel title="Réunion en préparation">{meetings.next_meeting?.id ? <div className="rounded-[7px] bg-[var(--surface-soft)] p-4"><div className="font-semibold">{meetings.next_meeting.title}</div><div className="text-xs text-[var(--ink-500)] mt-1">{dateTime(meetings.next_meeting.meeting_date)}</div><div className="mt-3"><StatusBadge label={`${meetings.next_meeting.agenda?.length || 0} point(s) retenu(s)`} color="#7C3AED" /></div></div> : <EmptyState compact title="Aucune réunion planifiée" action={<Link to="/ordre-du-jour" className="small-action">Planifier la réunion</Link>} />}</Panel><Panel title="Décisions consignées">{decisions.length ? <div className="space-y-2">{decisions.slice(0, 8).map((d, i) => <div key={d.id || i} className="border-b last:border-0 py-2"><div className="text-sm font-medium">{d.title || d.subject}</div><div className="text-xs text-[var(--ink-500)]">{d.owner || d.assigned_to || "Responsable à désigner"} · {shortDate(d.due_date)}</div></div>)}</div> : <EmptyState compact title="Aucune décision consignée" description="Les décisions créées depuis l’ordre du jour apparaîtront dans le registre dédié." action={<Link to="/decisions" className="small-action">Ouvrir les décisions</Link>} />}</Panel></div>
      </Phase>

      <Phase number="3" title="Après la réunion" subtitle="Suivre les engagements et les décisions non exécutées" color="#16794A">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Panel title="Engagements précédents">{commitments.length ? <div className="space-y-2">{commitments.slice(0, 10).map((x, i) => <div key={x.id || i} className="border-b last:border-0 py-2"><div className="text-sm font-medium">{x.title || x.subject}</div><div className="text-xs text-[var(--ink-500)]">{x.owner || "Responsable non renseigné"} · {x.status || "À suivre"}</div></div>)}</div> : <EmptyState compact title="Aucun engagement précédent" />}</Panel><Panel title="Compte rendu et points reportés"><EmptyState compact title="Suivi structuré à compléter" description="Le compte rendu par point, les reports et l’exécution détaillée nécessitent le contrat backend B3. Les décisions restent suivies dans le registre existant." action={<Link to="/decisions" className="small-action">Suivre les décisions</Link>} /></Panel></div>
      </Phase>
    </>}
    <MissionDrawer missionId={missionId} open={!!missionId} onOpenChange={(open) => !open && setMissionId(null)} role={user?.role} />
  </div>;
}

function Phase({ number, title, subtitle, color, action, children }) { return <section className="bg-white rounded-[8px] border border-[var(--border)] overflow-hidden" style={{ borderTop: `3px solid ${color}` }}><div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ background: color }}>{number}</span><div><h2 className="font-semibold text-sm">{title}</h2><p className="text-[11px] text-[var(--ink-500)] mt-0.5">{subtitle}</p></div></div>{action}</div><div className="p-4">{children}</div></section>; }
function Panel({ title, children }) { return <section className="rounded-[7px] border border-[var(--border)] p-4"><h3 className="font-semibold text-sm mb-3">{title}</h3>{children}</section>; }
function Agenda({ items, onMission }) { return items.length ? <div className="space-y-2">{items.map((p) => <button key={p.id} onClick={() => p.source_id && onMission(p.source_id)} disabled={!p.source_id} className="w-full text-left rounded-[6px] bg-[var(--surface-soft)] p-3 disabled:cursor-default"><div className="text-sm font-medium">{p.subject}</div><div className="text-xs text-[var(--ink-500)] mt-1">{p.direction || "Direction non renseignée"}</div></button>)}</div> : <EmptyState compact title="Aucun point proposé" />; }
function Alerts({ items, onMission }) { return items.length ? <div className="space-y-2">{items.map((a) => <button key={a.alert_id} onClick={() => a.related_resource_type === "mission" && onMission(a.related_resource_id)} disabled={a.related_resource_type !== "mission"} className="w-full text-left border-b last:border-0 py-2 disabled:cursor-default"><div className="flex items-start justify-between gap-2"><div><div className="text-sm font-medium">{a.title}</div><div className="text-xs text-[var(--ink-500)]">{a.direction || "Sans direction"}</div></div><StatusBadge label={a.severity} color={ALERT_COLORS[a.severity]} /></div></button>)}</div> : <EmptyState compact title="Aucune alerte à discuter" />; }
function Kpi({ icon: Icon, label, value, color }) { return <div className="bg-white border rounded-[8px] p-4"><Icon size={16} style={{ color }} /><div className="text-2xl font-bold mt-2 tabular-nums">{value}</div><div className="text-xs text-[var(--ink-500)]">{label}</div></div>; }
