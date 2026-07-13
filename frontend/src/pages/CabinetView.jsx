import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import metfpaApi from "@/lib/metfpaApi";
import { apiError, dateTime, pct, Pill, PRIORITY_COLORS, shortDate, statusLabel, STATUS_COLORS } from "@/lib/operational";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DemoBanner } from "@/components/DemoBanner";
import { toast } from "sonner";
import { Activity, AlertTriangle, Building2, CalendarDays, CheckCircle2, Download, Gavel, Loader2, RefreshCw } from "lucide-react";

const KPI = [
  ["missions_total", "Missions suivies", Activity],
  ["execution_rate", "Exécution globale", CheckCircle2, true],
  ["missions_overdue", "Missions en retard", AlertTriangle],
  ["critical_blockers", "Blocages critiques", AlertTriangle],
  ["decisions_pending", "Décisions en attente", Gavel],
  ["directions_stale", "Directions à relancer", Building2],
];

export default function CabinetView() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = () => {
    setError("");
    metfpaApi.get("/director-dashboard").then((r) => setData(r.data)).catch((e) => setError(apiError(e)));
  };
  useEffect(load, []);

  const exportPdf = async () => {
    setExporting(true);
    try {
      const r = await metfpaApi.get("/cabinet/export/pdf?note=Synthèse%20hebdomadaire%20DIRCAB", { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url; a.download = `Note_DIRCAB_${new Date().toISOString().slice(0, 10)}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Note DIRCAB générée");
    } catch (e) { toast.error(apiError(e, "Échec de l'export PDF")); }
    finally { setExporting(false); }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#F47C20]" /></div>;
  const s = data.summary;

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-cabinet">
      <Breadcrumb items={[{ label: "Pilotage Directeur" }]} />
      <DemoBanner />
      <div className="rounded-[8px] border border-[var(--border)] bg-white p-6 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ci-green-700)]">Cockpit opérationnel</div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--ink-900)] mt-1">Ce qui avance · Ce qui bloque · Ce qui doit être décidé</h1>
          <p className="text-sm text-[var(--ink-700)] mt-2">Synthèse consolidée automatiquement à partir des mises à jour des directions.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/ordre-du-jour" className="px-3.5 py-2 rounded-[6px] bg-[var(--ci-gold-600)] text-white text-sm font-semibold">Préparer la réunion</Link>
          <button onClick={exportPdf} disabled={exporting} className="px-3.5 py-2 rounded-[6px] border border-[var(--border)] text-sm font-semibold inline-flex items-center gap-1.5">
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Exporter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3" data-testid="director-kpis">
        {KPI.map(([key, label, Icon, percent]) => <Kpi key={key} label={label} value={percent ? pct(s[key]) : s[key]} icon={Icon} danger={["missions_overdue", "critical_blockers", "directions_stale"].includes(key) && s[key] > 0} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <MissionList title="Qu'est-ce qui avance ?" items={data.what_advances} color="#16794A" empty="Aucune progression enregistrée." />
        <MissionList title="Qu'est-ce qui bloque ?" items={data.what_blocks} color="#C93C37" empty="Aucun blocage signalé." showBlocker />
        <div className="space-y-5">
          <DecisionList title="Décisions cette semaine" items={data.decisions_this_week} color="#C93C37" />
          <DecisionList title="Décisions à anticiper ce mois" items={data.decisions_this_month} color="#D97706" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Section title="Top 5 des missions prioritaires">
          <MissionRows items={data.top_priority_missions} />
        </Section>
        <Section title="Prochaine réunion de suivi" action={<Link to="/ordre-du-jour" className="text-xs font-semibold text-[#8A6D1B]">Ouvrir l'ordre du jour</Link>}>
          <div className="rounded-[6px] bg-[var(--surface-soft)] p-3 mb-3">
            <div className="font-semibold text-sm">{data.next_meeting?.title}</div>
            <div className="text-xs text-[var(--ink-500)] mt-1"><CalendarDays size={13} className="inline mr-1" />{dateTime(data.next_meeting?.meeting_date)}</div>
          </div>
          <div className="space-y-2">
            {data.proposed_agenda.slice(0, 5).map((p) => <div key={p.id} className="text-sm border-l-2 border-[#C89A2B] pl-3"><span className="font-medium">{p.subject}</span><div className="text-xs text-[var(--ink-500)]">{p.direction || "Direction non renseignée"}</div></div>)}
          </div>
        </Section>
      </div>

      <Section title="Performance par direction" action={<Link to="/vue-directions" className="text-xs font-semibold text-[#1F6FEB]">Voir le détail</Link>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="director-directions-table">
            <thead className="text-[11px] uppercase text-[var(--ink-500)] bg-[var(--surface-soft)]"><tr><Th>Direction</Th><Th>Exécution</Th><Th>Retards</Th><Th>Blocages</Th><Th>Dernière mise à jour</Th><Th>Suivi</Th></tr></thead>
            <tbody>{data.directions_performance.map((d) => <tr key={d.direction} className="border-t border-[var(--border)]"><Td strong>{d.direction}</Td><Td>{pct(d.execution_rate)}</Td><Td>{d.missions_overdue}</Td><Td>{d.blockers}</Td><Td>{dateTime(d.last_update)}</Td><Td>{d.needs_follow_up ? <Pill label="À relancer" color="#C93C37" /> : <Pill label="À jour" color="#16794A" />}</Td></tr>)}</tbody>
          </table>
        </div>
      </Section>
      <Section title="Exécution par axe PND" action={<Link to="/alignement" className="text-xs font-semibold text-[#1F6FEB]">Voir l'alignement</Link>}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data.execution_by_pnd_axis.map((axis) => <div key={axis.pnd_axis} className="rounded-[6px] border border-[var(--border)] p-3"><div className="text-xs font-semibold text-[var(--ink-700)]">{axis.pnd_axis}</div><div className="text-xl font-bold mt-1">{pct(axis.execution_rate)}</div><div className="text-[11px] text-[var(--ink-500)]">{axis.missions_total} missions · {axis.missions_overdue} en retard</div></div>)}
        </div>
      </Section>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, danger }) { return <div className="bg-white border border-[var(--border)] rounded-[8px] p-4"><Icon size={16} className={danger ? "text-[#C93C37]" : "text-[var(--ci-green-700)]"} /><div className="text-2xl font-bold mt-2 tabular-nums">{value}</div><div className="text-[11px] text-[var(--ink-500)] mt-1">{label}</div></div>; }
function Section({ title, action, children }) { return <section className="bg-white rounded-[8px] border border-[var(--border)] overflow-hidden"><div className="px-5 py-3 border-b border-[var(--border)] flex justify-between gap-3"><h2 className="font-semibold text-sm">{title}</h2>{action}</div><div className="p-4">{children}</div></section>; }
function MissionList({ title, items, color, empty, showBlocker }) { return <Section title={title}><div className="space-y-2">{items.length ? items.map((m) => <div key={m.id} className="rounded-[6px] border border-[var(--border)] p-3" style={{ borderLeft: `3px solid ${color}` }}><div className="flex justify-between gap-2"><span className="font-medium text-sm">{m.code} · {m.action_title}</span><span className="text-xs font-semibold tabular-nums">{m.progress}%</span></div><div className="text-xs text-[var(--ink-500)] mt-1">{m.direction || "Direction manquante"} · {shortDate(m.due_date)}</div>{showBlocker && m.blocker && <div className="text-xs text-[#A33A32] mt-1">{m.blocker}</div>}</div>) : <p className="text-sm text-[var(--ink-500)] italic">{empty}</p>}</div></Section>; }
function MissionRows({ items }) { return <div className="space-y-2">{items.map((m) => <div key={m.id} className="flex items-center justify-between gap-3 border-b border-[var(--border)] last:border-0 pb-2 last:pb-0"><div className="min-w-0"><div className="text-sm font-medium truncate">{m.code} · {m.action_title}</div><div className="text-xs text-[var(--ink-500)]">{m.direction} · {statusLabel(m.status)}</div></div><Pill label={m.priority} color={PRIORITY_COLORS[m.priority]} /></div>)}</div>; }
function DecisionList({ title, items, color }) { return <Section title={title}><div className="space-y-2">{items.length ? items.slice(0, 5).map((d) => <div key={d.id} className="border-l-2 pl-3" style={{ borderColor: color }}><div className="text-sm font-medium">{d.title}</div><div className="text-xs text-[var(--ink-500)]">Échéance : {shortDate(d.due_date)} · {d.status}</div></div>) : <p className="text-sm text-[var(--ink-500)] italic">Aucune décision dans cette fenêtre.</p>}</div></Section>; }
function ErrorState({ message, onRetry }) { return <div className="rounded-[8px] border border-[#C93C37]/30 bg-white p-8 text-center"><AlertTriangle className="mx-auto text-[#C93C37]" /><h1 className="font-bold mt-3">Vue Directeur indisponible</h1><p className="text-sm text-[var(--ink-500)] mt-1">{message}</p><button onClick={onRetry} className="mt-4 px-3 py-2 rounded-[6px] border text-sm inline-flex gap-1"><RefreshCw size={14} /> Réessayer</button></div>; }
function Th({ children }) { return <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">{children}</th>; }
function Td({ children, strong }) { return <td className={`px-3 py-2.5 whitespace-nowrap ${strong ? "font-semibold" : ""}`}>{children}</td>; }
