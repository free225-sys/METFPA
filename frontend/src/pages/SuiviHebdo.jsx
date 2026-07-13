import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import metfpaApi from "@/lib/metfpaApi";
import { apiError, dateTime, Pill } from "@/lib/operational";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DemoBanner } from "@/components/DemoBanner";
import { AlertTriangle, CalendarClock, CheckCircle2, Gavel, Loader2, Users2 } from "lucide-react";

export default function SuiviHebdo() {
  const [meetings, setMeetings] = useState(null); const [alerts, setAlerts] = useState(null); const [error, setError] = useState("");
  useEffect(() => { Promise.all([metfpaApi.get("/weekly-meetings"), metfpaApi.get("/alerts")]).then(([m, a]) => { setMeetings(m.data); setAlerts(a.data); }).catch((e) => setError(apiError(e))); }, []);
  return <div className="space-y-6 animate-slide-up" data-testid="page-suivi-hebdo"><Breadcrumb items={[{ label: "Suivi hebdomadaire" }]} /><DemoBanner />
    <div className="bg-white rounded-[8px] border border-[var(--border)] p-6"><div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#7C3AED]"><CalendarClock size={13} className="inline mr-1" /> Cycle de coordination</div><h1 className="text-2xl font-bold mt-1">Suivi hebdomadaire</h1><p className="text-sm text-[var(--ink-700)] mt-2">Points critiques, décisions attendues, engagements et directions à relancer avant la prochaine réunion.</p></div>
    {error ? <div className="p-5 bg-white border rounded-[8px] text-[#C93C37]">{error}</div> : !meetings || !alerts ? <Loader2 className="animate-spin mx-auto" /> : <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Kpi icon={AlertTriangle} label="Alertes critiques" value={alerts.counts.critique} color="#C93C37" /><Kpi icon={Gavel} label="Points proposés" value={meetings.proposed_agenda.length} color="#C89A2B" /><Kpi icon={Users2} label="Directions à relancer" value={alerts.items.filter((a) => a.rule_id === "DIRECTION_STALE").length} color="#D97706" /><Kpi icon={CheckCircle2} label="Réunions enregistrées" value={meetings.items.length} color="#16794A" /></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><Panel title="Prochaine réunion" action={<Link to="/ordre-du-jour" className="text-xs font-semibold text-[#8A6D1B]">Préparer l'ordre du jour</Link>}><div className="rounded-[6px] bg-[var(--surface-soft)] p-4"><div className="font-semibold">{meetings.next_meeting.title}</div><div className="text-sm text-[var(--ink-500)] mt-1">{dateTime(meetings.next_meeting.meeting_date)}</div><div className="mt-2"><Pill label={meetings.next_meeting.status} color="#7C3AED" /></div></div></Panel><Panel title="Engagements précédents"><Commitments meetings={meetings.items} /></Panel></div>
      <Panel title="Points critiques proposés automatiquement"><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{meetings.proposed_agenda.map((p) => <div key={p.id} className="border rounded-[6px] p-3 border-l-[3px] border-l-[#C93C37]"><div className="font-medium text-sm">{p.subject}</div><div className="text-xs text-[var(--ink-500)] mt-1">{p.direction || "Direction non renseignée"} · priorité {p.priority}</div><p className="text-xs mt-2">{p.description}</p></div>)}</div></Panel>
      <Panel title="Alertes de la semaine"><div className="space-y-2">{alerts.items.slice(0, 12).map((a) => <div key={a.alert_id} className="flex items-start justify-between gap-3 border-b last:border-0 py-2"><div><div className="text-sm font-medium">{a.title}</div><div className="text-xs text-[var(--ink-500)]">{a.description}</div></div><Pill label={a.severity} color={a.severity === "critique" ? "#C93C37" : "#D97706"} /></div>)}</div></Panel>
    </>}
  </div>;
}
function Kpi({ icon: Icon, label, value, color }) { return <div className="bg-white border rounded-[8px] p-4"><Icon size={16} style={{ color }} /><div className="text-2xl font-bold mt-2">{value}</div><div className="text-xs text-[var(--ink-500)]">{label}</div></div>; }
function Panel({ title, action, children }) { return <section className="bg-white border rounded-[8px] overflow-hidden"><div className="px-5 py-3 border-b flex justify-between"><h2 className="font-semibold text-sm">{title}</h2>{action}</div><div className="p-4">{children}</div></section>; }
function Commitments({ meetings }) { const items = meetings.flatMap((m) => m.previous_commitments || []).slice(0, 8); return items.length ? <div className="space-y-2">{items.map((x, i) => <div key={x.id || i} className="text-sm border-b last:border-0 py-2"><span className="font-medium">{x.title || x.subject}</span><div className="text-xs text-[var(--ink-500)]">{x.owner || "Responsable non renseigné"} · {x.status || "à suivre"}</div></div>)}</div> : <p className="text-sm text-[var(--ink-500)] italic">Aucun engagement précédent enregistré.</p>; }
