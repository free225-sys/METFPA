import React, { useEffect, useMemo, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { apiError, dateTime, Pill } from "@/lib/operational";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DemoBanner } from "@/components/DemoBanner";
import { toast } from "sonner";
import { CalendarPlus, Check, ClipboardList, Gavel, Loader2 } from "lucide-react";

export default function OrdreDuJour() {
  const [data, setData] = useState(null); const [selected, setSelected] = useState([]); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const load = () => metfpaApi.get("/weekly-meetings").then((r) => { setData(r.data); setSelected(r.data.proposed_agenda.map((x) => x.id)); }).catch((e) => setError(apiError(e)));
  useEffect(load, []);
  const proposals = data?.proposed_agenda || [];
  const activeMeeting = useMemo(() => data?.next_meeting?.id ? data.next_meeting : null, [data]);
  const toggle = (id) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const saveAgenda = async () => { setBusy(true); try { const agenda = proposals.filter((p) => selected.includes(p.id)); if (activeMeeting) await metfpaApi.patch(`/weekly-meetings/${activeMeeting.id}`, { agenda }); else await metfpaApi.post("/weekly-meetings", { title: data.next_meeting.title, meeting_date: data.next_meeting.meeting_date, agenda, status: "planned" }); toast.success("Ordre du jour partagé enregistré"); load(); } catch (e) { toast.error(apiError(e, "Échec de l'enregistrement")); } finally { setBusy(false); } };
  const createDecision = async (point) => { try { await metfpaApi.post("/decisions", { title: point.subject, description: point.description || "", decision_type: "arbitrage", priority: point.priority === "critique" ? "critique" : "haute", status: "pending", requested_by: point.direction || "", related_activity_id: point.source === "automatic_alert" ? point.source_id : null }); toast.success("Décision créée dans le registre"); } catch (e) { toast.error(apiError(e, "Échec de la création")); } };
  return <div className="space-y-6 animate-slide-up" data-testid="page-ordre-du-jour"><Breadcrumb items={[{ label: "Ordre du jour" }]} /><DemoBanner />
    <div className="bg-white rounded-[8px] border p-6 flex flex-col lg:flex-row justify-between gap-4"><div><div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#8A6D1B]"><ClipboardList size={13} className="inline mr-1" /> Réunion de suivi</div><h1 className="text-2xl font-bold mt-1">Préparer l'ordre du jour</h1><p className="text-sm text-[var(--ink-700)] mt-2">Les points critiques sont proposés automatiquement à partir des retards, blocages, décisions et directions sans mise à jour.</p></div>{data && <div className="text-sm"><div className="font-semibold">{data.next_meeting.title}</div><div className="text-[var(--ink-500)]">{dateTime(data.next_meeting.meeting_date)}</div></div>}</div>
    {error ? <div className="p-5 bg-white border rounded-[8px] text-[#C93C37]">{error}</div> : !data ? <Loader2 className="animate-spin mx-auto" /> : <>
      {activeMeeting && <div className="rounded-[8px] border border-[#16794A]/30 bg-[#16794A]/5 px-4 py-3 flex items-center gap-2 text-sm"><Check size={16} className="text-[#16794A]" />Réunion enregistrée · {activeMeeting.agenda?.length || 0} point(s) à l'ordre du jour.</div>}
      <div className="bg-white border rounded-[8px] overflow-hidden"><div className="px-5 py-3 border-b flex items-center justify-between"><h2 className="font-semibold text-sm">Points proposés ({proposals.length})</h2><button onClick={saveAgenda} disabled={busy || selected.length === 0} className="px-3 py-2 rounded-[6px] bg-[#C89A2B] text-white text-sm font-semibold inline-flex gap-1.5 disabled:opacity-40"><CalendarPlus size={15} />{busy ? "Enregistrement…" : activeMeeting ? "Mettre à jour l'ordre du jour" : "Créer la réunion"}</button></div><div className="divide-y">{proposals.map((p) => <div key={p.id} className="p-4 flex items-start gap-3"><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} className="mt-1" aria-label={`Sélectionner ${p.subject}`} /><div className="flex-1 min-w-0"><div className="flex flex-wrap gap-2 items-center"><span className="font-medium text-sm">{p.subject}</span><Pill label={p.priority} color={p.priority === "critique" ? "#C93C37" : "#D97706"} /></div><p className="text-xs text-[var(--ink-500)] mt-1">{p.direction || "Direction non renseignée"}</p><p className="text-sm mt-2">{p.description}</p></div><button onClick={() => createDecision(p)} className="px-2.5 py-1.5 rounded-[5px] border text-xs font-semibold inline-flex gap-1"><Gavel size={13} />Créer une décision</button></div>)}</div></div>
      {activeMeeting?.agenda?.length > 0 && <section className="bg-white border rounded-[8px] p-5"><h2 className="font-semibold text-sm mb-3">Ordre du jour retenu</h2><ol className="space-y-2 list-decimal pl-5">{activeMeeting.agenda.map((p) => <li key={p.id} className="text-sm"><span className="font-medium">{p.subject}</span> · {p.direction || "sans direction"}</li>)}</ol></section>}
    </>}
  </div>;
}
