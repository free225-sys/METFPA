import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Check, ClipboardCheck, ClipboardList, Gavel, Loader2, RefreshCw, Save } from "lucide-react";
import metfpaApi from "@/lib/metfpaApi";
import { apiError, dateTime } from "@/lib/operational";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DemoBanner } from "@/components/DemoBanner";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";

export default function OrdreDuJour() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = () => metfpaApi.get("/weekly-meetings").then((r) => { setData(r.data); setSelected(r.data.proposed_agenda.map((x) => x.id)); setNotes(r.data.next_meeting?.notes || ""); setError(""); }).catch((e) => setError(apiError(e)));
  useEffect(() => { load(); }, []);
  const proposals = data?.proposed_agenda || [];
  const activeMeeting = useMemo(() => data?.next_meeting?.id ? data.next_meeting : null, [data]);
  const toggle = (id) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const saveAgenda = async () => {
    setBusy(true);
    try {
      const agenda = proposals.filter((p) => selected.includes(p.id));
      if (activeMeeting) await metfpaApi.patch(`/weekly-meetings/${activeMeeting.id}`, { agenda });
      else await metfpaApi.post("/weekly-meetings", { title: data.next_meeting.title, meeting_date: data.next_meeting.meeting_date, agenda, status: "planned" });
      toast.success("Ordre du jour partagé enregistré"); load();
    } catch (e) { toast.error(apiError(e, "Échec de l’enregistrement")); }
    finally { setBusy(false); }
  };
  const saveNotes = async () => {
    if (!activeMeeting) return;
    setBusy(true);
    try { await metfpaApi.patch(`/weekly-meetings/${activeMeeting.id}`, { notes }); toast.success("Compte rendu enregistré"); load(); }
    catch (e) { toast.error(apiError(e, "Le compte rendu n’a pas été enregistré")); }
    finally { setBusy(false); }
  };
  const createDecision = async (point) => {
    try {
      await metfpaApi.post("/decisions", { title: point.subject, description: point.description || "", decision_type: "arbitrage", priority: point.priority === "critique" ? "critique" : "haute", status: "pending", requested_by: point.direction || "", related_activity_id: point.source === "automatic_alert" ? point.source_id : null });
      toast.success("Décision préparée dans le registre");
    } catch (e) { toast.error(apiError(e, "Échec de la création")); }
  };

  return <div className="space-y-5 animate-slide-up" data-testid="page-ordre-du-jour">
    <Breadcrumb items={[{ label: "Ordre du jour" }]} /><DemoBanner />
    <header className="bg-white rounded-[8px] border p-5 flex flex-col lg:flex-row justify-between gap-4"><div><div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#8A6D1B]"><ClipboardList size={13} className="inline mr-1" /> Réunion de suivi</div><h1 className="text-2xl font-bold mt-1">De l’alerte au suivi de la décision</h1><p className="text-sm text-[var(--ink-700)] mt-2">Préparez les points, consignez les décisions et conservez un compte rendu partagé.</p></div>{data && <div className="text-sm"><div className="font-semibold">{data.next_meeting.title}</div><div className="text-[var(--ink-500)]">{dateTime(data.next_meeting.meeting_date)}</div></div>}</header>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><PhaseChip number="1" title="Avant" detail="Sélectionner les points" color="#D97706" /><PhaseChip number="2" title="Pendant" detail="Préparer les décisions" color="#1F6FEB" /><PhaseChip number="3" title="Après" detail="Compte rendu et relances" color="#16794A" /></div>
    {error ? <EmptyState title="Chargement impossible" description={error} action={<button onClick={load} className="small-action"><RefreshCw size={14} />Réessayer</button>} /> : !data ? <div className="h-52 flex items-center justify-center"><Loader2 className="animate-spin text-[var(--ci-orange-600)]" /></div> : <>
      {activeMeeting && <div className="rounded-[8px] border border-[#16794A]/30 bg-[#16794A]/5 px-4 py-3 flex items-center gap-2 text-sm"><Check size={16} className="text-[#16794A]" />Réunion enregistrée · {activeMeeting.agenda?.length || 0} point(s) à l’ordre du jour.</div>}

      <Section title="1 · Avant la réunion" subtitle="Points proposés automatiquement à partir des alertes" action={<button onClick={saveAgenda} disabled={busy || selected.length === 0} className="primary-action"><CalendarPlus size={15} />{busy ? "Enregistrement…" : activeMeeting ? "Mettre à jour l’ordre du jour" : "Créer la réunion"}</button>} color="#D97706">
        {proposals.length ? <div className="divide-y">{proposals.map((p) => <div key={p.id} className="py-4 flex items-start gap-3"><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} className="mt-1" aria-label={`Sélectionner ${p.subject}`} /><div className="flex-1 min-w-0"><div className="flex flex-wrap gap-2 items-center"><span className="font-medium text-sm">{p.subject}</span><StatusBadge label={p.priority} color={p.priority === "critique" ? "#C93C37" : "#D97706"} /></div><p className="text-xs text-[var(--ink-500)] mt-1">{p.direction || "Direction non renseignée"}</p><p className="text-sm mt-2">{p.description}</p></div></div>)}</div> : <EmptyState title="Aucun point proposé" description="Aucune alerte ne nécessite actuellement d’être inscrite à l’ordre du jour." />}
      </Section>

      <Section title="2 · Pendant la réunion" subtitle="Décisions à préparer et responsables à désigner" color="#1F6FEB">
        {(activeMeeting?.agenda || []).length ? <div className="space-y-3">{activeMeeting.agenda.map((p, index) => <div key={p.id} className="rounded-[7px] border border-[var(--border)] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><div className="text-xs text-[var(--ink-500)]">Point {index + 1} · {p.direction || "Sans direction"}</div><div className="font-medium text-sm mt-1">{p.subject}</div></div><button onClick={() => createDecision(p)} className="small-action"><Gavel size={13} />Préparer une décision</button></div>)}</div> : <EmptyState title="Aucun point retenu" description="Enregistrez d’abord l’ordre du jour de la réunion." />}
      </Section>

      <Section title="3 · Après la réunion" subtitle="Compte rendu partagé et engagements à suivre" color="#16794A">
        {activeMeeting ? <div><label className="text-xs font-semibold text-[var(--ink-700)]">Compte rendu synthétique<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows="6" className="block mt-1 w-full rounded-[6px] border border-[var(--border)] px-3 py-2 text-sm" placeholder="Décisions prises, responsables désignés, délais fixés et points reportés…" /></label><button onClick={saveNotes} disabled={busy} className="primary-action mt-3"><Save size={14} />Enregistrer le compte rendu</button><p className="text-[11px] text-[var(--ink-500)] mt-2">Le suivi structuré par point (responsable, délai, report, exécution) reste à compléter dans le contrat backend B3.</p></div> : <EmptyState icon={ClipboardCheck} title="Aucune réunion à clôturer" description="Planifiez et enregistrez la réunion avant de saisir son compte rendu." />}
      </Section>
    </>}
  </div>;
}

function Section({ title, subtitle, action, color, children }) { return <section className="bg-white rounded-[8px] border border-[var(--border)] overflow-hidden" style={{ borderTop: `3px solid ${color}` }}><div className="px-5 py-3 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 className="font-semibold text-sm">{title}</h2><p className="text-[11px] text-[var(--ink-500)] mt-1">{subtitle}</p></div>{action}</div><div className="p-4">{children}</div></section>; }
function PhaseChip({ number, title, detail, color }) { return <div className="rounded-[8px] bg-white border border-[var(--border)] p-3 flex items-center gap-3"><span className="w-8 h-8 rounded-full text-white font-bold text-sm flex items-center justify-center" style={{ background: color }}>{number}</span><div><div className="font-semibold text-sm">{title}</div><div className="text-[11px] text-[var(--ink-500)]">{detail}</div></div></div>; }
