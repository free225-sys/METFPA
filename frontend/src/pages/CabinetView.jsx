import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Building2, CalendarDays, CheckCircle2, Download, Gavel, ListPlus, Loader2, RefreshCw } from "lucide-react";
import metfpaApi from "@/lib/metfpaApi";
import { useAuth } from "@/context/AuthContext";
import { apiError, dateTime, pct, shortDate } from "@/lib/operational";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DemoBanner } from "@/components/DemoBanner";
import { EmptyState } from "@/components/EmptyState";
import { MetricStrip } from "@/components/MetricStrip";
import { MissionDrawer } from "@/components/MissionDrawer";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";

export default function CabinetView() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [missionId, setMissionId] = useState(null);

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
    } catch (e) { toast.error(apiError(e, "Échec de l’export PDF")); }
    finally { setExporting(false); }
  };

  const copyFollowUp = async (direction) => {
    try {
      await navigator.clipboard.writeText(`Relance — ${direction.direction} : merci de mettre à jour les missions en retard, les blocages et les décisions attendues cette semaine.`);
      toast.success("Texte de relance copié", { description: "Envoi manuel · non partagé dans l’application" });
    } catch { toast.error("Copie impossible"); }
  };

  const metrics = useMemo(() => {
    if (!data) return null;
    const s = data.summary;
    const verdict = s.critical_blockers
      ? `${s.critical_blockers} blocage(s) critique(s) nécessitent une action du Cabinet cette semaine.`
      : s.missions_overdue
        ? `${s.missions_overdue} mission(s) en retard doivent faire l’objet d’un plan de rattrapage.`
        : "Aucun blocage critique : le pilotage opérationnel est à jour.";
    return {
      verdict,
      primary: [
        { label: "Exécution globale", value: pct(s.execution_rate), color: "#1F6FEB" },
        { label: "Missions en retard", value: s.missions_overdue, color: "#C93C37" },
        { label: "Blocages critiques", value: s.critical_blockers, color: "#C93C37" },
      ],
      secondary: [
        { label: "Décisions en attente", value: s.decisions_pending },
        { label: "Directions à relancer", value: s.directions_stale },
        { label: "Missions suivies", value: s.missions_total },
        { label: "Complétude", value: pct(s.data_completeness_rate) },
      ],
    };
  }, [data]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <DirectorSkeleton />;

  return (
    <div className="space-y-5 animate-slide-up" data-testid="page-cabinet">
      <Breadcrumb items={[{ label: "Pilotage Directeur" }]} />
      <DemoBanner />
      <header className="rounded-[8px] border border-[var(--border)] bg-white p-5 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ci-green-700)]">Cockpit opérationnel</div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--ink-900)] mt-1">Ce qui avance · Ce qui bloque · Ce qui doit être décidé</h1>
          <p className="text-sm text-[var(--ink-700)] mt-2">Lecture priorisée de la situation consolidée à partir des mises à jour des directions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/ordre-du-jour" className="min-h-10 px-3.5 py-2 rounded-[6px] bg-[var(--ci-gold-600)] text-white text-sm font-semibold inline-flex items-center gap-1.5"><ListPlus size={15} />Préparer la réunion</Link>
          <button onClick={exportPdf} disabled={exporting} className="min-h-10 px-3.5 py-2 rounded-[6px] border border-[var(--border)] text-sm font-semibold inline-flex items-center gap-1.5">
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Exporter la note
          </button>
        </div>
      </header>

      <MetricStrip {...metrics} />

      <Section title="Blocages nécessitant un arbitrage" tone="critical" action={<Link to="/alertes-arbitrages" className="section-link">Voir toutes les alertes</Link>}>
        {data.what_blocks.length ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{data.what_blocks.slice(0, 6).map((m) => <MissionCard key={m.id} mission={m} critical onOpen={() => setMissionId(m.id)} />)}</div> : <EmptyState icon={CheckCircle2} title="Aucun blocage signalé cette semaine" description="Aucune mission critique ne nécessite actuellement d’arbitrage." />}
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Section title="Décisions à prendre cette semaine" tone="critical">
          <DecisionList items={data.decisions_this_week} empty="Aucune décision à prendre cette semaine." />
        </Section>
        <Section title="Décisions à anticiper ce mois" tone="warning">
          <DecisionList items={data.decisions_this_month} empty="Aucune décision à anticiper sur le mois." />
        </Section>
      </div>

      <Section title="Directions à relancer" tone="warning" action={<Link to="/vue-directions" className="section-link">Avancement par direction</Link>}>
        {data.directions_to_follow_up.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{data.directions_to_follow_up.slice(0, 6).map((d) => <div key={d.direction} className="rounded-[7px] border border-[#D97706]/30 bg-[#D97706]/5 p-4"><div className="flex items-start justify-between gap-2"><div><div className="font-semibold text-sm">{d.direction}</div><div className="text-xs text-[var(--ink-500)] mt-1">Dernière mise à jour : {dateTime(d.last_update)}</div></div><StatusBadge label="À relancer" color="#C93C37" /></div><div className="grid grid-cols-3 gap-2 mt-3 text-xs"><MiniMetric label="Retards" value={d.missions_overdue} /><MiniMetric label="Blocages" value={d.blockers} /><MiniMetric label="Décisions" value={d.decisions_required} /></div><div className="flex flex-wrap gap-2 mt-3"><Link to={`/plan-action?direction=${encodeURIComponent(d.direction)}`} className="small-action">Voir les missions</Link><button onClick={() => copyFollowUp(d)} className="small-action">Copier la relance</button></div></div>)}</div> : <EmptyState icon={CheckCircle2} title="Toutes les directions ont mis à jour leur périmètre" />}
      </Section>

      <Section title="Ce qui avance" tone="positive">
        {data.what_advances.length ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{data.what_advances.slice(0, 6).map((m) => <MissionCard key={m.id} mission={m} onOpen={() => setMissionId(m.id)} />)}</div> : <EmptyState title="Aucune progression enregistrée" description="Les avancements déclarés par les directions apparaîtront ici." />}
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Section title="Prochaine réunion de suivi" action={<Link to="/ordre-du-jour" className="section-link">Préparer l’ordre du jour</Link>}>
          {data.next_meeting?.id ? <div className="rounded-[7px] bg-[var(--surface-soft)] p-4"><div className="font-semibold text-sm">{data.next_meeting.title}</div><div className="text-xs text-[var(--ink-500)] mt-1 flex items-center gap-1"><CalendarDays size={13} />{dateTime(data.next_meeting.meeting_date)}</div><div className="mt-3"><StatusBadge label={`${data.next_meeting.agenda?.length || 0} point(s) retenu(s)`} color="#7C3AED" /></div></div> : <EmptyState icon={CalendarDays} title="Aucune réunion planifiée" description={`Prochaine date suggérée : ${dateTime(data.next_meeting?.meeting_date)}`} action={<Link to="/ordre-du-jour" className="small-action">Planifier une réunion</Link>} />}
        </Section>
        <Section title="Points à inscrire à l’ordre du jour" tone="warning">
          {data.proposed_agenda.length ? <div className="space-y-2">{data.proposed_agenda.slice(0, 5).map((p) => <div key={p.id} className="rounded-[6px] border border-[var(--border)] p-3"><div className="flex justify-between gap-3"><div><div className="text-sm font-medium">{p.subject}</div><div className="text-xs text-[var(--ink-500)] mt-1">{p.direction || "Direction non renseignée"}</div></div><StatusBadge label={p.priority} color={p.priority === "critique" ? "#C93C37" : "#D97706"} /></div></div>)}<Link to="/ordre-du-jour" className="small-action mt-2">Inscrire les points</Link></div> : <EmptyState title="Aucun point proposé" description="Aucune alerte ne nécessite d’être inscrite à la prochaine réunion." />}
        </Section>
      </div>

      <Section title="Missions critiques" action={<Link to="/plan-action" className="section-link">Voir toutes les missions</Link>}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">{data.top_priority_missions.map((m) => <button key={m.id} onClick={() => setMissionId(m.id)} className="rounded-[7px] border border-[var(--border)] p-3 text-left hover:border-[#1F6FEB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F6FEB]"><StatusBadge status={m.status} /><div className="font-medium text-sm mt-2 line-clamp-2">{m.code} · {m.action_title}</div><div className="text-xs text-[var(--ink-500)] mt-2">{m.direction || "Direction manquante"}</div></button>)}</div>
      </Section>

      <Section title="Exécution par axe PND" action={<Link to="/alignement" className="section-link">Voir l’alignement</Link>}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{data.execution_by_pnd_axis.map((axis) => <div key={axis.pnd_axis} className="rounded-[7px] border border-[var(--border)] p-4"><div className="text-xs font-semibold text-[var(--ink-700)] line-clamp-2 min-h-8">{axis.pnd_axis}</div><ProgressBar value={axis.execution_rate} showLabel label={`Exécution ${axis.pnd_axis}`} /><div className="text-[11px] text-[var(--ink-500)] mt-2">{axis.missions_total} missions · {axis.missions_overdue} en retard</div></div>)}</div>
      </Section>

      <MissionDrawer missionId={missionId} open={!!missionId} onOpenChange={(open) => !open && setMissionId(null)} role={user?.role} />
    </div>
  );
}

function Section({ title, action, children, tone = "neutral" }) {
  const colors = { critical: "#C93C37", warning: "#D97706", positive: "#16794A", neutral: "#E3E7ED" };
  return <section className="bg-white rounded-[8px] border border-[var(--border)] overflow-hidden" style={{ borderTop: `3px solid ${colors[tone]}` }}><div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3"><h2 className="font-semibold text-sm">{title}</h2>{action}</div><div className="p-4">{children}</div></section>;
}
function MissionCard({ mission, onOpen, critical }) { return <button onClick={onOpen} className={`w-full rounded-[7px] border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F6FEB] ${critical ? "border-[#C93C37]/35 bg-[#C93C37]/5 hover:bg-[#C93C37]/10" : "border-[var(--border)] hover:border-[#16794A]"}`}><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-sm">{mission.code} · {mission.action_title}</div><div className="text-xs text-[var(--ink-500)] mt-1">{mission.direction || "Direction manquante"} · échéance {shortDate(mission.due_date)}</div></div><StatusBadge status={mission.status} /></div>{critical && <p className="text-xs text-[#A33A32] mt-3">{mission.blocker || "Mission en retard nécessitant une action."}</p>}<div className="mt-3"><ProgressBar value={mission.progress} status={mission.status} showLabel /></div><span className="text-[11px] font-semibold text-[#1F6FEB] mt-3 inline-flex items-center gap-1">Ouvrir le contexte <ArrowRight size={12} /></span></button>; }
function DecisionList({ items, empty }) { return items.length ? <div className="space-y-2">{items.slice(0, 6).map((d) => <Link key={d.id} to="/decisions" className="block rounded-[7px] border border-[var(--border)] p-3 hover:border-[#C93C37]"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-medium">{d.title}</div><div className="text-xs text-[var(--ink-500)] mt-1">Échéance : {shortDate(d.due_date)} · {d.assigned_to || "Responsable à désigner"}</div></div><Gavel size={15} className="text-[#C93C37] shrink-0" /></div></Link>)}</div> : <EmptyState icon={Gavel} title={empty} />; }
function MiniMetric({ label, value }) { return <div><div className="font-bold tabular-nums">{value}</div><div className="text-[10px] text-[var(--ink-500)]">{label}</div></div>; }
function ErrorState({ message, onRetry }) { return <EmptyState icon={AlertTriangle} title="Vue Directeur indisponible" description={message} action={<button onClick={onRetry} className="small-action"><RefreshCw size={14} /> Réessayer</button>} />; }
function DirectorSkeleton() { return <div className="space-y-4"><div className="h-28 rounded-[8px] bg-white animate-pulse" /><div className="h-32 rounded-[8px] bg-white animate-pulse" /><div className="h-64 rounded-[8px] bg-white animate-pulse" /></div>; }
