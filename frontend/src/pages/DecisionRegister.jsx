import React, { useEffect, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { OriginBadge } from "@/components/OriginBadge";
import { DemoBanner } from "@/components/DemoBanner";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth, canEdit, canManageDecisions, isDircab, isAdmin } from "@/context/AuthContext";
import { ValidationActions } from "@/components/ValidationActions";
import { EmptyState } from "@/components/EmptyState";
import { VALIDATION_OUTCOMES } from "@/lib/metfpaTheme";
import { addRelance } from "@/lib/demoStore";
import { toast } from "sonner";
import { AlertTriangle, Gavel, Plus, Pencil, RefreshCw, Trash2 } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }
const STATUS_COLOR = { draft: "#718096", pending: "#C5A028", approved: "#009E49", rejected: "#C53030", implemented: "#1F6FEB", closed: "#4A5568" };
const STATUS_LABEL = { draft: "Brouillon", pending: "En attente", approved: "Approuvée", rejected: "Rejetée", implemented: "Mise en œuvre", closed: "Clôturée" };
const PRIO_COLOR = { faible: "#718096", moyenne: "#1F6FEB", haute: "#FF8200", critique: "#C53030" };
export const ARBITRAGE_META = {
  a_arbitrer: { label: "À arbitrer", color: "#7C3AED" },
  arbitre: { label: "Arbitré", color: "#009E49" },
  a_relancer: { label: "À relancer", color: "#D97706" },
};
const EMPTY = { title: "", description: "", decision_type: "autre", priority: "moyenne", status: "draft", requested_by: "", assigned_to: "", related_activity_id: "", related_framework: "", due_date: "", decision_date: "", resolution: "", arbitrage: "", relance_direction: "" };

export default function DecisionRegister() {
  const [rows, setRows] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState(null); // form object or null
  const [del, setDel] = useState(null);
  const { user } = useAuth();
  // Decision management includes DIRCAB (create/update/close, arbitrage);
  // delete stays restricted to EDIT_ROLES (mirrors the backend guards).
  const editor = canManageDecisions(user?.role);
  const deleter = canEdit(user?.role);
  const arbitre = isDircab(user?.role);
  const canFollowUp = arbitre || isAdmin(user?.role);
  // Mirror of assert_direction_scope (backend): an agency director can only
  // modifier que les enregistrements rattachés à sa propre direction.
  const canMutate = (row) => editor && (user?.role !== "agency_director" || row.direction === user?.direction);

  const quickArbitrage = async (d, value) => {
    try {
      const r = await metfpaApi.put(`/decisions/${d.id}`, { ...d, arbitrage: value || null });
      setRows((p) => p.map((x) => x.id === d.id ? r.data : x));
      toast.success(value ? `Marquée « ${ARBITRAGE_META[value].label} »` : "Marquage d'arbitrage retiré", { description: d.title });
      if (value === "a_relancer" && d.relance_direction) {
        addRelance({ direction: d.relance_direction, objet: `Décision à relancer : ${d.title}`, source: "registre décisions" });
        toast.info("Relance affectée (démo)", { description: d.relance_direction });
      }
    } catch (e) { toast.error("Échec du marquage", { description: e?.response?.data?.detail || "Erreur" }); }
  };

  const load = () => {
    setError("");
    setRows(null);
    return metfpaApi.get("/decisions")
      .then((r) => setRows(r.data))
      .catch((e) => setError(e?.response?.data?.detail || "Impossible de charger le registre des décisions."));
  };
  useEffect(() => { load(); metfpaApi.get("/decisions/meta").then((r) => setMeta(r.data)); }, []);

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-decisions">
      <Breadcrumb items={[{ label: "Registre des décisions" }]} />
      <DemoBanner />
      <div className="rounded-[6px] border border-[#E2E8F0] bg-white p-6 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#C89A2B]"><Gavel size={13} className="inline mr-1" /> Décisions & arbitrages</div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">Registre des décisions</h1>
          <p className="text-sm text-[#4A5568] mt-2">La Coordination prépare et suit les décisions ; l’arbitrage final reste réservé au Directeur de cabinet.</p>
        </div>
        <button data-testid="add-decision" disabled={!editor} onClick={() => setEdit({ ...EMPTY })} className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#C89A2B] text-white px-3.5 py-2 text-sm font-medium hover:bg-[#A87F1E] disabled:opacity-40 disabled:cursor-not-allowed" title={editor ? "" : "Lecture seule"}><Plus size={15} /> Nouvelle décision</button>
      </div>

      {error ? <EmptyState icon={AlertTriangle} title="Chargement impossible" description={error} action={<button onClick={load} className="small-action"><RefreshCw size={14} /> Réessayer</button>} /> : <div className="bg-white rounded-[4px] border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="decisions-table">
            <thead className="bg-[#F7F7F5] text-[#718096] text-[11px] uppercase tracking-wide">
              <tr><th className="text-left px-4 py-2.5 font-semibold">Objet</th><th className="text-left px-4 py-2.5 font-semibold">Type</th><th className="text-left px-4 py-2.5 font-semibold">Priorité</th><th className="text-left px-4 py-2.5 font-semibold">Statut</th><th className="text-left px-4 py-2.5 font-semibold">Arbitrage</th><th className="text-left px-4 py-2.5 font-semibold">Direction</th><th className="text-left px-4 py-2.5 font-semibold">Demandeur</th><th className="text-left px-4 py-2.5 font-semibold">Échéance</th><th className="text-left px-4 py-2.5 font-semibold">Origine</th><th className="text-center px-4 py-2.5 font-semibold">Actions</th></tr>
            </thead>
            <tbody>
              {!rows ? <tr><td colSpan={10} className="p-3"><Skeleton className="h-20" /></td></tr> :
                rows.length === 0 ? <tr><td colSpan={10} className="p-8 text-center text-sm text-[#A0AEC0] italic" data-testid="empty-state">Aucune décision enregistrée. Créez-en une pour commencer.</td></tr> :
                rows.map((d) => (
                  <tr key={d.id} data-testid={`decision-row-${d.id}`} className="border-t border-[#E2E8F0] hover:bg-[#F7F7F5]">
                    <td className="px-4 py-2.5 max-w-[280px]"><div className="font-medium text-[#1A202C]">{d.title}</div>{d.description && <div className="text-[11px] text-[#718096] truncate">{d.description}</div>}</td>
                    <td className="px-4 py-2.5 text-xs">{d.decision_type}</td>
                    <td className="px-4 py-2.5"><Pill label={d.priority} color={PRIO_COLOR[d.priority]} /></td>
                    <td className="px-4 py-2.5"><Pill label={STATUS_LABEL[d.status] || d.status} color={STATUS_COLOR[d.status]} /></td>
                    <td className="px-4 py-2.5">
                      {arbitre ? (
                        <select data-testid={`arbitrage-select-${d.id}`} value={d.arbitrage || ""} onChange={(e) => quickArbitrage(d, e.target.value)}
                          className="rounded-[5px] border border-[#E2E8F0] px-1.5 py-1 text-[11px] font-semibold bg-white"
                          style={{ color: d.arbitrage ? ARBITRAGE_META[d.arbitrage]?.color : "#718096" }}>
                          <option value="">—</option>
                          {Object.entries(ARBITRAGE_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                        </select>
                      ) : d.arbitrage ? <Pill label={ARBITRAGE_META[d.arbitrage]?.label || d.arbitrage} color={ARBITRAGE_META[d.arbitrage]?.color || "#718096"} /> : <span className="text-[#CBD5E0] text-xs">—</span>}
                      {d.relance_direction && <div className="text-[10px] text-[#D97706] mt-0.5">relance : {d.relance_direction}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-xs">{d.direction || "—"}</td>
                    <td className="px-4 py-2.5 text-xs">{d.requested_by || "—"}</td>
                    <td className="px-4 py-2.5 text-xs">{d.due_date ? d.due_date.slice(0, 10) : "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-1">
                        <OriginBadge origin={d.data_origin} status={d.validation_status} />
                        {VALIDATION_OUTCOMES.includes(d.validation_status) && <OriginBadge status={d.validation_status} testid={`validation-status-${d.id}`} />}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                      {canMutate(d) ? <>
                        <button aria-label={`Modifier la décision ${d.title}`} data-testid={`edit-decision-${d.id}`} onClick={() => setEdit({ ...EMPTY, ...d, arbitrage: d.arbitrage || "", relance_direction: d.relance_direction || "", due_date: (d.due_date || "").slice(0, 10), decision_date: (d.decision_date || "").slice(0, 10) })} className="w-7 h-7 rounded-[4px] text-[#4A5568] hover:bg-[#C89A2B]/10 hover:text-[#C89A2B] inline-flex items-center justify-center"><Pencil size={14} /></button>
                        {deleter && <button aria-label={`Supprimer la décision ${d.title}`} data-testid={`delete-decision-${d.id}`} onClick={() => setDel(d)} className="w-7 h-7 rounded-[4px] text-[#4A5568] hover:bg-[#C53030]/10 hover:text-[#C53030] inline-flex items-center justify-center"><Trash2 size={14} /></button>}
                      </> : <span className="text-[11px] text-[#A0AEC0]" title={editor ? "Hors de votre direction" : "Lecture seule"}>Lecture</span>}
                      <ValidationActions entityType="decisions" item={d} onStale={load}
                        onUpdated={(doc) => setRows((p) => p.map((x) => x.id === doc.id ? doc : x))} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>}

      <EditDialog form={edit} meta={meta} canArbitrate={arbitre} canFollowUp={canFollowUp} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />
      <DeleteDialog item={del} onClose={() => setDel(null)} onDeleted={() => { setDel(null); load(); }} />
    </div>
  );
}

function EditDialog({ form, meta, canArbitrate, canFollowUp, onClose, onSaved }) {
  const [f, setF] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (form) setF(form); }, [form]);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.title.trim()) { toast.error("Le titre est requis"); return; }
    setSaving(true);
    try {
      const payload = { ...f, due_date: f.due_date ? `${f.due_date}T00:00:00+00:00` : null, decision_date: f.decision_date ? `${f.decision_date}T00:00:00+00:00` : null, related_activity_id: f.related_activity_id || null, related_framework: f.related_framework || null, arbitrage: f.arbitrage || null, relance_direction: f.relance_direction || null };
      if (f.id) await metfpaApi.put(`/decisions/${f.id}`, payload);
      else await metfpaApi.post("/decisions", payload);
      if (payload.arbitrage === "a_relancer" && payload.relance_direction) {
        addRelance({ direction: payload.relance_direction, objet: `Décision à relancer : ${f.title}`, source: "registre décisions" });
      }
      toast.success(f.id ? "Décision mise à jour" : "Décision créée", { description: f.title });
      onSaved();
    } catch (e) { toast.error("Échec", { description: e?.response?.data?.detail?.[0]?.msg || e?.response?.data?.detail || "Erreur" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={!!form} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="decision-dialog" className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{f.id ? "Éditer" : "Nouvelle"} décision</DialogTitle><DialogDescription className="text-xs text-[#718096]">Donnée de démonstration · à valider. Action journalisée dans l'audit.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <Field label="Objet *"><input data-testid="decision-title" value={f.title} onChange={(e) => set("title", e.target.value)} className={inputCls} /></Field>
          <Field label="Description"><textarea data-testid="decision-description" value={f.description} onChange={(e) => set("description", e.target.value)} rows={2} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><Select testid="decision-type" value={f.decision_type} onChange={(v) => set("decision_type", v)} options={meta?.types || []} /></Field>
            <Field label="Priorité"><Select testid="decision-priority" value={f.priority} onChange={(v) => set("priority", v)} options={meta?.priorities || []} /></Field>
            <Field label="Statut"><Select testid="decision-status" value={f.status} onChange={(v) => set("status", v)} options={meta?.statuses || []} labels={STATUS_LABEL} /></Field>
            <Field label="Cadre lié"><Select testid="decision-framework" value={f.related_framework || ""} onChange={(v) => set("related_framework", v)} options={["", "PND", "POL", "DIG"]} /></Field>
            <Field label="Demandeur"><input value={f.requested_by} onChange={(e) => set("requested_by", e.target.value)} className={inputCls} /></Field>
            <Field label="Assigné à"><input value={f.assigned_to} onChange={(e) => set("assigned_to", e.target.value)} className={inputCls} /></Field>
            <Field label="Échéance"><input type="date" value={f.due_date} onChange={(e) => set("due_date", e.target.value)} className={inputCls} /></Field>
            <Field label="Date de décision"><input type="date" value={f.decision_date} onChange={(e) => set("decision_date", e.target.value)} className={inputCls} /></Field>
            {canArbitrate && <Field label="Arbitrage final (DIRCAB)">
              <select data-testid="decision-arbitrage" value={f.arbitrage || ""} onChange={(v) => set("arbitrage", v.target.value)} className={inputCls}>
                <option value="">—</option>
                {Object.entries(ARBITRAGE_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
              </select>
            </Field>}
            {canFollowUp && <Field label="Relance → direction"><input data-testid="decision-relance" value={f.relance_direction || ""} onChange={(e) => set("relance_direction", e.target.value)} placeholder="ex. DAF" className={inputCls} /></Field>}
          </div>
          <Field label="Résolution"><textarea value={f.resolution} onChange={(e) => set("resolution", e.target.value)} rows={2} className={inputCls} /></Field>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-[6px] border border-[#E2E8F0] text-[#4A5568] hover:bg-[#F7F7F5]">Annuler</button>
          <button data-testid="save-decision" onClick={save} disabled={saving} className="px-4 py-2 text-sm rounded-[6px] bg-[#C89A2B] text-white font-medium hover:bg-[#A87F1E] disabled:opacity-60">{saving ? "…" : "Enregistrer"}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ item, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await metfpaApi.delete(`/decisions/${item.id}`); toast.success("Décision supprimée"); onDeleted(); } catch { toast.error("Échec de la suppression"); } finally { setBusy(false); } };
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="delete-decision-dialog" className="max-w-sm">
        <DialogHeader><DialogTitle>Supprimer la décision</DialogTitle><DialogDescription className="text-xs text-[#718096]">Action journalisée. Irréversible.</DialogDescription></DialogHeader>
        <p className="text-sm text-[#4A5568]">Confirmer la suppression de « {item?.title} » ?</p>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-[6px] border border-[#E2E8F0] text-[#4A5568]">Annuler</button>
          <button data-testid="confirm-delete-decision" onClick={go} disabled={busy} className="px-4 py-2 text-sm rounded-[6px] bg-[#C53030] text-white font-medium disabled:opacity-60">Supprimer</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const inputCls = "w-full rounded-[6px] border border-[#E2E8F0] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C89A2B]";
function Field({ label, children }) { return <label className="block"><span className="text-xs font-semibold text-[#4A5568]">{label}</span><div className="mt-1">{children}</div></label>; }
function Select({ value, onChange, options, testid, labels }) { return <select data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>{options.map((o) => <option key={o} value={o}>{labels?.[o] || o || "—"}</option>)}</select>; }
function Pill({ label, color }) { return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[4px] capitalize" style={{ color, background: `${color}14` }}>{label}</span>; }
