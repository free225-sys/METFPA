import React, { useEffect, useMemo, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DemoBanner } from "@/components/DemoBanner";
import { useAuth, canManageDecisions, isDircab, isAdmin } from "@/context/AuthContext";
import { getAgenda, addAgendaItem, updateAgendaItem, removeAgendaItem, addRelance, addMeetingNote, subscribeDemoStore } from "@/lib/demoStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import { ClipboardList, Plus, Gavel, Send, FileText, Trash2, Download } from "lucide-react";

const PRIO_COLOR = { faible: "#718096", moyenne: "#1F6FEB", haute: "#FF8200", critique: "#C53030" };
const ODJ_STATUTS = ["à traiter", "en discussion", "transformé en décision", "reporté", "clos"];
const ODJ_COLOR = { "à traiter": "#C89A2B", "en discussion": "#1F6FEB", "transformé en décision": "#009E49", "reporté": "#718096", "clos": "#4A5568" };

export default function OrdreDuJour() {
  const { user } = useAuth();
  const canAct = isDircab(user?.role) || isAdmin(user?.role);
  const canDecide = canManageDecisions(user?.role);
  const [acts, setActs] = useState([]);
  const [, tick] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [synthese, setSynthese] = useState(null);

  useEffect(() => {
    metfpaApi.get("/activities").then((r) => setActs(r.data)).catch(() => {});
    return subscribeDemoStore(() => tick((t) => t + 1));
  }, []);

  const agenda = getAgenda();
  const directions = useMemo(() => [...new Set(acts.map((a) => a.direction).filter(Boolean))].sort(), [acts]);

  const transformer = async (item) => {
    try {
      const r = await metfpaApi.post("/decisions", {
        title: `[ODJ] ${item.sujet}`, description: `Point d'ordre du jour · ${item.point}. Blocage : ${item.blocage || "—"}`,
        decision_type: "arbitrage", priority: item.priorite || "moyenne", status: "pending",
        requested_by: "DIRCAB", assigned_to: item.suivi || "", related_activity_id: item.linked_id || null,
        arbitrage: "a_arbitrer", relance_direction: item.direction || null,
      });
      updateAgendaItem(item.id, { statut: "transformé en décision", decision_id: r.data.id });
      toast.success("Décision créée au registre", { description: r.data.title });
    } catch (e) {
      toast.error("Échec de la transformation", { description: formatApiErrorDetail(e?.response?.data?.detail) });
    }
  };

  const relancer = (item) => {
    if (!item.direction) { toast.error("Aucune direction associée à ce point"); return; }
    addRelance({ direction: item.direction, objet: `Suivi ODJ : ${item.sujet}`, source: "ordre du jour" });
    toast.success("Relance affectée (démo)", { description: item.direction });
  };

  const genererSynthese = () => {
    const date = new Date().toLocaleDateString("fr-FR");
    const lines = [
      `SYNTHÈSE DE RÉUNION — Cockpit METFPA · ${date}`,
      `Points inscrits : ${agenda.length}`, "",
      ...agenda.map((x, i) => `${i + 1}. [${(x.priorite || "moyenne").toUpperCase()}] ${x.sujet} (${x.direction || "—"}) — ` +
        `décision attendue : ${x.decision_attendue || "—"} — statut : ${x.statut}${x.blocage ? ` — blocage : ${x.blocage}` : ""}`),
      "", "Document généré à partir du Cockpit METFPA — démonstration institutionnelle.",
    ];
    const text = lines.join("\n");
    addMeetingNote(`Synthèse générée le ${date} (${agenda.length} points)`);
    setSynthese(text);
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([synthese], { type: "text/plain;charset=utf-8" }));
    a.download = `Synthese_reunion_METFPA_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-ordre-du-jour">
      <Breadcrumb items={[{ label: "Ordre du jour" }]} />
      <DemoBanner />
      <div className="rounded-[8px] border border-[#E2E8F0] bg-white p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#C89A2B]"><ClipboardList size={13} className="inline mr-1" /> Réunion de pilotage</div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">Ordre du jour</h1>
            <p className="text-sm text-[#4A5568] mt-2 max-w-3xl">Points à traiter en réunion DIRCAB. La liste des points est en <strong>mode démonstration (stockage local)</strong> ; la transformation en décision alimente le <strong>registre réel</strong>.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canAct && <button data-testid="odj-add" onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#C89A2B] text-white px-3.5 py-2 text-sm font-medium hover:bg-[#A87F1E]"><Plus size={15} /> Ajouter à l'ordre du jour</button>}
            <button data-testid="odj-synthese" onClick={genererSynthese} disabled={agenda.length === 0} className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#1A202C] text-white px-3.5 py-2 text-sm font-medium hover:bg-black disabled:opacity-40"><FileText size={15} /> Générer synthèse</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[4px] border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="odj-table">
            <thead className="bg-[#F7F7F5] text-[#718096] text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Point</th>
                <th className="text-left px-3 py-2.5 font-semibold">Direction</th>
                <th className="text-left px-3 py-2.5 font-semibold min-w-[220px]">Sujet</th>
                <th className="text-left px-3 py-2.5 font-semibold">Action liée</th>
                <th className="text-left px-3 py-2.5 font-semibold">Blocage</th>
                <th className="text-left px-3 py-2.5 font-semibold">Décision attendue</th>
                <th className="text-left px-3 py-2.5 font-semibold">Priorité</th>
                <th className="text-left px-3 py-2.5 font-semibold">Statut</th>
                <th className="text-left px-3 py-2.5 font-semibold">Suivi</th>
                <th className="text-center px-3 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agenda.length === 0 ? <tr><td colSpan={10} className="p-8 text-center text-sm text-[#A0AEC0] italic" data-testid="odj-empty">Aucun point inscrit. Utilisez « Ajouter à l'ordre du jour » (ici ou depuis le Plan d'action).</td></tr> :
                agenda.map((x, i) => (
                  <tr key={x.id} data-testid={`odj-row-${x.id}`} className="border-t border-[#E2E8F0] hover:bg-[#F7F7F5]">
                    <td className="px-3 py-2.5 tabular-nums text-xs text-[#718096]">{x.point || i + 1}</td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">{x.direction || "—"}</td>
                    <td className="px-3 py-2.5 text-[#1A202C]">{x.sujet}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[#718096]">{x.linked_id || "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-[#C53030]">{x.blocage || "—"}</td>
                    <td className="px-3 py-2.5 text-xs">{x.decision_attendue || "—"}</td>
                    <td className="px-3 py-2.5"><Pill label={x.priorite} color={PRIO_COLOR[x.priorite] || "#718096"} /></td>
                    <td className="px-3 py-2.5">
                      {canAct ? (
                        <select value={x.statut} onChange={(e) => updateAgendaItem(x.id, { statut: e.target.value })}
                          className="rounded-[5px] border border-[#E2E8F0] px-1.5 py-1 text-[11px] bg-white" style={{ color: ODJ_COLOR[x.statut] }}>
                          {ODJ_STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : <Pill label={x.statut} color={ODJ_COLOR[x.statut] || "#718096"} />}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{x.suivi || "—"}</td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      {canDecide && x.statut !== "transformé en décision" &&
                        <button data-testid={`odj-decision-${x.id}`} title="Transformer en décision (registre réel)" onClick={() => transformer(x)}
                          className="w-7 h-7 rounded-[4px] text-[#C89A2B] hover:bg-[#C89A2B]/10 inline-flex items-center justify-center"><Gavel size={14} /></button>}
                      {canAct && <button data-testid={`odj-relance-${x.id}`} title="Affecter une relance à la direction" onClick={() => relancer(x)}
                        className="w-7 h-7 rounded-[4px] text-[#D97706] hover:bg-[#D97706]/10 inline-flex items-center justify-center"><Send size={14} /></button>}
                      {canAct && <button data-testid={`odj-remove-${x.id}`} title="Retirer le point" onClick={() => { removeAgendaItem(x.id); toast.success("Point retiré"); }}
                        className="w-7 h-7 rounded-[4px] text-[#4A5568] hover:bg-[#C53030]/10 hover:text-[#C53030] inline-flex items-center justify-center"><Trash2 size={14} /></button>}
                      {!canAct && !canDecide && <span className="text-[11px] text-[#A0AEC0]">Lecture</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddDialog open={addOpen} onClose={() => setAddOpen(false)} acts={acts} directions={directions} nextPoint={agenda.length + 1} />

      <Dialog open={!!synthese} onOpenChange={(o) => !o && setSynthese(null)}>
        <DialogContent data-testid="synthese-dialog" className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Synthèse de réunion (démo)</DialogTitle>
            <DialogDescription className="text-xs text-[#718096]">Texte généré depuis les points inscrits — téléchargeable en .txt.</DialogDescription></DialogHeader>
          <pre className="text-xs whitespace-pre-wrap bg-[#F7F7F5] rounded-[6px] border border-[#E2E8F0] p-4 text-[#1A202C]">{synthese}</pre>
          <DialogFooter>
            <button onClick={() => setSynthese(null)} className="px-4 py-2 text-sm rounded-[6px] border border-[#E2E8F0] text-[#4A5568]">Fermer</button>
            <button data-testid="synthese-download" onClick={download} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-[6px] bg-[#1A202C] text-white font-medium"><Download size={14} /> Télécharger (.txt)</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddDialog({ open, onClose, acts, directions, nextPoint }) {
  const EMPTY = { sujet: "", direction: "", linked_id: "", blocage: "", decision_attendue: "", priorite: "moyenne", suivi: "" };
  const [f, setF] = useState(EMPTY);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const pick = (id) => {
    const a = acts.find((x) => x.id === id);
    setF((p) => ({ ...p, linked_id: id, direction: a?.direction || p.direction, sujet: p.sujet || (a ? `${a.code_action} — ${a.intitule}` : p.sujet), blocage: p.blocage || a?.alerte || "" }));
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="odj-add-dialog" className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Ajouter un point (n° {nextPoint})</DialogTitle>
          <DialogDescription className="text-xs text-[#718096]">Mode démonstration : le point est stocké localement.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <Field label="Action liée (optionnel)">
            <select data-testid="odj-linked" value={f.linked_id} onChange={(e) => pick(e.target.value)} className={cls}>
              <option value="">— aucune —</option>
              {acts.map((a) => <option key={a.id} value={a.id}>{a.code_action} · {a.intitule.slice(0, 60)}</option>)}
            </select></Field>
          <Field label="Sujet *"><input data-testid="odj-sujet" value={f.sujet} onChange={(e) => set("sujet", e.target.value)} className={cls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Direction"><select value={f.direction} onChange={(e) => set("direction", e.target.value)} className={cls}><option value="">—</option>{directions.map((d) => <option key={d} value={d}>{d}</option>)}</select></Field>
            <Field label="Priorité"><select data-testid="odj-priorite" value={f.priorite} onChange={(e) => set("priorite", e.target.value)} className={cls}>{Object.keys(PRIO_COLOR).map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
          </div>
          <Field label="Blocage"><input value={f.blocage} onChange={(e) => set("blocage", e.target.value)} className={cls} placeholder="ex. Marché non attribué" /></Field>
          <Field label="Décision attendue"><input data-testid="odj-attendue" value={f.decision_attendue} onChange={(e) => set("decision_attendue", e.target.value)} className={cls} placeholder="ex. Arbitrage budgétaire" /></Field>
          <Field label="Suivi assigné à"><input value={f.suivi} onChange={(e) => set("suivi", e.target.value)} className={cls} placeholder="ex. DIRCAB / DGE" /></Field>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-[6px] border border-[#E2E8F0] text-[#4A5568]">Annuler</button>
          <button data-testid="odj-add-confirm" disabled={!f.sujet.trim()}
            onClick={() => { const ok = addAgendaItem({ ...f, point: nextPoint }); ok ? toast.success("Point ajouté à l'ordre du jour") : toast.error("Cette action est déjà inscrite à l'ordre du jour"); setF(EMPTY); onClose(); }}
            className="px-4 py-2 text-sm rounded-[6px] bg-[#C89A2B] text-white font-medium disabled:opacity-40">Ajouter</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const cls = "w-full rounded-[6px] border border-[#E2E8F0] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C89A2B]";
function Field({ label, children }) { return <label className="block"><span className="text-xs font-semibold text-[#4A5568]">{label}</span><div className="mt-1">{children}</div></label>; }
function Pill({ label, color }) { return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[4px] capitalize whitespace-nowrap" style={{ color, background: `${color}14` }}>{label}</span>; }
