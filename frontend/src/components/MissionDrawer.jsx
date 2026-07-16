import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CalendarPlus, ClipboardCopy, Gavel, History, Loader2, TriangleAlert } from "lucide-react";
import metfpaApi from "@/lib/metfpaApi";
import { apiError, dateTime, shortDate } from "@/lib/operational";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { EmptyState } from "@/components/EmptyState";

export function MissionDrawer({ missionId, open, onOpenChange, role, onAction }) {
  const navigate = useNavigate();
  const [mission, setMission] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !missionId) return;
    setMission(null); setUpdates([]); setError("");
    Promise.all([
      metfpaApi.get(`/missions/${missionId}`),
      metfpaApi.get(`/update-log?mission_id=${encodeURIComponent(missionId)}`).catch(() => ({ data: { items: [] } })),
    ]).then(([m, u]) => { setMission(m.data); setUpdates(u.data.items || []); })
      .catch((e) => setError(apiError(e, "Impossible de charger cette mission.")));
  }, [missionId, open]);

  const act = (type) => {
    if (onAction) return onAction(type, mission);
    if (type === "decision") navigate(`/decisions?mission=${mission.id}`);
    if (type === "meeting") navigate(`/ordre-du-jour?mission=${mission.id}`);
  };
  const copyFollowUp = async () => {
    const text = `Relance — ${mission.code} : ${mission.action_title}. Mise à jour attendue pour ${shortDate(mission.due_date)}.`;
    try { await navigator.clipboard.writeText(text); toast.success("Texte de relance copié", { description: "Envoi manuel · non partagé dans l’application" }); }
    catch { toast.error("Copie impossible"); }
  };
  const canPrepare = ["dircab", "admin"].includes(role);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col" data-testid="mission-drawer">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-[var(--border)] pr-12">
          <SheetTitle>{mission ? `${mission.code} · ${mission.action_title}` : "Contexte de la mission"}</SheetTitle>
          <SheetDescription>Situation opérationnelle, blocage, décision attendue et historique.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-6">
          {error ? <EmptyState icon={TriangleAlert} title="Chargement impossible" description={error} /> : !mission ? <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-[var(--ci-orange-600)]" /></div> : <div className="space-y-5">
            <div className="flex flex-wrap gap-2"><StatusBadge status={mission.status} /><StatusBadge status={mission.submission_status} /></div>
            <ProgressBar value={mission.progress} status={mission.status} showLabel />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Info label="Direction" value={mission.direction} /><Info label="Responsable" value={mission.responsible_person} /><Info label="Échéance" value={shortDate(mission.due_date)} /><Info label="Dernière mise à jour" value={dateTime(mission.last_update)} /><Info label="Axe PND" value={mission.pnd_axis} /><Info label="Programme budgétaire" value={mission.budget_program} /></div>
            <Block title="Prochaine étape" value={mission.next_step} />
            <Block title="Livrable attendu" value={mission.expected_deliverable} link={mission.deliverable_link} />
            <Block title="Blocage déclaré" value={mission.blocker} critical />
            <Block title="Décision attendue" value={mission.decision_required} critical={mission.needs_arbitration} />
            <section><h3 className="text-xs uppercase tracking-wide font-semibold text-[var(--ink-500)] flex items-center gap-1.5"><History size={14} /> Historique</h3><div className="mt-2">{updates.length ? updates.slice(0, 8).map((u) => <div key={u.id} className="border-l-2 border-[var(--border)] pl-3 py-1.5"><div className="text-sm">{u.comment || "Mise à jour de la mission"}</div><div className="text-[11px] text-[var(--ink-500)]">{dateTime(u.created_at)} · {u.user}</div></div>) : <EmptyState compact title="Aucun historique disponible" description="Les prochaines mises à jour apparaîtront ici." />}</div></section>
          </div>}
        </div>
        {mission && canPrepare && <div className="border-t border-[var(--border)] p-4 bg-white"><div className="flex flex-wrap gap-2"><Action icon={Gavel} onClick={() => act("decision")}>Préparer une décision</Action><Action icon={CalendarPlus} onClick={() => act("meeting")}>Inscrire à la réunion</Action><Action icon={ClipboardCopy} onClick={copyFollowUp}>Copier la relance</Action></div><p className="text-[10px] text-[var(--ink-500)] mt-2">La relance copiée reste manuelle et n’est pas partagée dans l’application.</p></div>}
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value }) { return <div className="rounded-[6px] bg-[var(--surface-soft)] p-3"><div className="text-[10px] uppercase font-semibold text-[var(--ink-500)]">{label}</div><div className="text-sm font-medium mt-1">{value || "Donnée incomplète"}</div></div>; }
function Block({ title, value, critical, link }) { return <section className={`rounded-[7px] border p-4 ${critical && value ? "border-[#C93C37]/35 bg-[#C93C37]/5" : "border-[var(--border)]"}`}><h3 className="text-xs font-semibold text-[var(--ink-700)]">{title}</h3><p className={`text-sm mt-1 ${!value ? "text-[var(--ink-500)]" : ""}`}>{value || "Non renseigné"}</p>{link && <a href={link} target="_blank" rel="noreferrer" className="text-xs text-[#1F6FEB] mt-2 inline-block">Ouvrir le livrable</a>}</section>; }
function Action({ icon: Icon, children, onClick }) { return <button onClick={onClick} className="min-h-10 px-3 py-2 rounded-[6px] border border-[var(--border)] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F6FEB]"><Icon size={14} />{children}</button>; }
