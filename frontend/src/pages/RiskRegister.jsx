import React, { useEffect, useMemo, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { OriginBadge } from "@/components/OriginBadge";
import { DemoBanner } from "@/components/DemoBanner";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth, canEdit } from "@/context/AuthContext";
import { ValidationActions } from "@/components/ValidationActions";
import { VALIDATION_OUTCOMES } from "@/lib/metfpaTheme";
import { toast } from "sonner";
import { ShieldAlert, Plus, Pencil, Trash2 } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }
const SEV_COLOR = { critique: "#C53030", eleve: "#FF8200", modere: "#C5A028", faible: "#718096" };
const STATUS_COLOR = { open: "#C53030", monitored: "#C5A028", mitigating: "#1F6FEB", closed: "#4A5568" };
const EMPTY = { title: "", description: "", category: "operationnel", probability: 3, impact: 3, status: "open", owner: "", related_activity_id: "", related_framework: "", mitigation_plan: "", mitigation_deadline: "", residual_probability: "", residual_impact: "" };

function severityOf(score) { return score >= 15 ? "critique" : score >= 10 ? "eleve" : score >= 5 ? "modere" : "faible"; }

export default function RiskRegister() {
  const [rows, setRows] = useState(null);
  const [meta, setMeta] = useState(null);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const { user } = useAuth();
  const editor = canEdit(user?.role);
  // Mirror of assert_direction_scope (backend) : un direction_editor ne peut
  // modifier que les enregistrements rattachés à sa propre direction.
  const canMutate = (row) => editor && (user?.role !== "direction_editor" || row.direction === user?.direction);

  const load = () => metfpaApi.get("/risks").then((r) => setRows(r.data));
  useEffect(() => { load(); metfpaApi.get("/risks/meta").then((r) => setMeta(r.data)); }, []);

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-risks">
      <Breadcrumb items={[{ label: "Registre des risques" }]} />
      <DemoBanner />
      <div className="rounded-[6px] border border-[#E2E8F0] bg-white p-6 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#C53030]"><ShieldAlert size={13} className="inline mr-1" /> Cartographie des risques</div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">Registre des risques</h1>
          <p className="text-sm text-[#4A5568] mt-2">Score = Probabilité × Impact (échelle 1–5). Sévérité : critique ≥15 · élevé ≥10 · modéré ≥5 · faible &lt;5. Données <strong>démo · à valider</strong>.</p>
        </div>
        <button data-testid="add-risk" disabled={!editor} onClick={() => setEdit({ ...EMPTY })} className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#C53030] text-white px-3.5 py-2 text-sm font-medium hover:bg-[#a82626] disabled:opacity-40 disabled:cursor-not-allowed" title={editor ? "" : "Lecture seule"}><Plus size={15} /> Nouveau risque</button>
      </div>

      <div className="bg-white rounded-[4px] border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="risks-table">
            <thead className="bg-[#F7F7F5] text-[#718096] text-[11px] uppercase tracking-wide">
              <tr><th className="text-left px-4 py-2.5 font-semibold">Risque</th><th className="text-left px-4 py-2.5 font-semibold">Catégorie</th><th className="text-center px-4 py-2.5 font-semibold">P×I</th><th className="text-center px-4 py-2.5 font-semibold">Score</th><th className="text-left px-4 py-2.5 font-semibold">Sévérité</th><th className="text-left px-4 py-2.5 font-semibold">Statut</th><th className="text-left px-4 py-2.5 font-semibold">Direction</th><th className="text-left px-4 py-2.5 font-semibold">Responsable</th><th className="text-left px-4 py-2.5 font-semibold">Origine</th><th className="text-center px-4 py-2.5 font-semibold">Actions</th></tr>
            </thead>
            <tbody>
              {!rows ? <tr><td colSpan={10} className="p-3"><Skeleton className="h-20" /></td></tr> :
                rows.length === 0 ? <tr><td colSpan={10} className="p-8 text-center text-sm text-[#A0AEC0] italic" data-testid="empty-state">Aucun risque enregistré. Ajoutez-en un pour commencer.</td></tr> :
                rows.map((r) => (
                  <tr key={r.id} data-testid={`risk-row-${r.id}`} className="border-t border-[#E2E8F0] hover:bg-[#F7F7F5]">
                    <td className="px-4 py-2.5 max-w-[260px]"><div className="font-medium text-[#1A202C]">{r.title}</div>{r.mitigation_plan && <div className="text-[11px] text-[#718096] truncate">Mitigation : {r.mitigation_plan}</div>}</td>
                    <td className="px-4 py-2.5 text-xs">{r.category}</td>
                    <td className="px-4 py-2.5 text-center text-xs tabular-nums">{r.probability}×{r.impact}</td>
                    <td className="px-4 py-2.5 text-center"><span className="inline-flex items-center justify-center w-8 h-8 rounded-[4px] font-bold tabular-nums text-white" style={{ background: SEV_COLOR[r.severity] }}>{r.risk_score}</span></td>
                    <td className="px-4 py-2.5"><Pill label={r.severity} color={SEV_COLOR[r.severity]} /></td>
                    <td className="px-4 py-2.5"><Pill label={r.status} color={STATUS_COLOR[r.status]} /></td>
                    <td className="px-4 py-2.5 text-xs">{r.direction || "—"}</td>
                    <td className="px-4 py-2.5 text-xs">{r.owner || "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-1">
                        <OriginBadge origin={r.data_origin} status={r.validation_status} />
                        {VALIDATION_OUTCOMES.includes(r.validation_status) && <OriginBadge status={r.validation_status} testid={`validation-status-${r.id}`} />}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                      {canMutate(r) ? <>
                        <button data-testid={`edit-risk-${r.id}`} onClick={() => setEdit({ ...EMPTY, ...r, residual_probability: r.residual_probability ?? "", residual_impact: r.residual_impact ?? "", mitigation_deadline: (r.mitigation_deadline || "").slice(0, 10) })} className="w-7 h-7 rounded-[4px] text-[#4A5568] hover:bg-[#1F6FEB]/10 hover:text-[#1F6FEB] inline-flex items-center justify-center"><Pencil size={14} /></button>
                        <button data-testid={`delete-risk-${r.id}`} onClick={() => setDel(r)} className="w-7 h-7 rounded-[4px] text-[#4A5568] hover:bg-[#C53030]/10 hover:text-[#C53030] inline-flex items-center justify-center"><Trash2 size={14} /></button>
                      </> : <span className="text-[11px] text-[#A0AEC0]" title={editor ? "Hors de votre direction" : "Lecture seule"}>Lecture</span>}
                      <ValidationActions entityType="risks" item={r} onStale={load}
                        onUpdated={(doc) => setRows((p) => p.map((x) => x.id === doc.id ? doc : x))} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <EditDialog form={edit} meta={meta} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />
      <DeleteDialog item={del} onClose={() => setDel(null)} onDeleted={() => { setDel(null); load(); }} />
    </div>
  );
}

function EditDialog({ form, meta, onClose, onSaved }) {
  const [f, setF] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (form) setF(form); }, [form]);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const score = useMemo(() => Number(f.probability) * Number(f.impact), [f.probability, f.impact]);
  const sev = severityOf(score);

  const save = async () => {
    if (!f.title.trim()) { toast.error("Le titre est requis"); return; }
    setSaving(true);
    try {
      const payload = {
        title: f.title, description: f.description, category: f.category,
        probability: Number(f.probability), impact: Number(f.impact), status: f.status, owner: f.owner,
        related_activity_id: f.related_activity_id || null, related_framework: f.related_framework || null,
        mitigation_plan: f.mitigation_plan, mitigation_deadline: f.mitigation_deadline ? `${f.mitigation_deadline}T00:00:00+00:00` : null,
        residual_probability: f.residual_probability ? Number(f.residual_probability) : null,
        residual_impact: f.residual_impact ? Number(f.residual_impact) : null,
      };
      if (f.id) await metfpaApi.put(`/risks/${f.id}`, payload);
      else await metfpaApi.post("/risks", payload);
      toast.success(f.id ? "Risque mis à jour" : "Risque créé", { description: `${f.title} · score ${score} (${sev})` });
      onSaved();
    } catch (e) { toast.error("Échec", { description: e?.response?.data?.detail?.[0]?.msg || e?.response?.data?.detail || "Erreur" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={!!form} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="risk-dialog" className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{f.id ? "Éditer" : "Nouveau"} risque</DialogTitle><DialogDescription className="text-xs text-[#718096]">Score auto-calculé (P×I). Donnée démo · à valider. Action auditée.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <Field label="Intitulé *"><input data-testid="risk-title" value={f.title} onChange={(e) => set("title", e.target.value)} className={inputCls} /></Field>
          <Field label="Description"><textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={2} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Catégorie"><Select testid="risk-category" value={f.category} onChange={(v) => set("category", v)} options={meta?.categories || []} /></Field>
            <Field label="Statut"><Select testid="risk-status" value={f.status} onChange={(v) => set("status", v)} options={meta?.statuses || []} /></Field>
            <Field label="Probabilité (1-5)"><Select testid="risk-probability" value={String(f.probability)} onChange={(v) => set("probability", v)} options={["1", "2", "3", "4", "5"]} /></Field>
            <Field label="Impact (1-5)"><Select testid="risk-impact" value={String(f.impact)} onChange={(v) => set("impact", v)} options={["1", "2", "3", "4", "5"]} /></Field>
          </div>
          <div className="flex items-center gap-3 rounded-[6px] border border-[#E2E8F0] bg-[#F7F7F5] px-4 py-3">
            <span className="text-xs text-[#718096]">Score calculé</span>
            <span data-testid="risk-computed-score" className="inline-flex items-center justify-center w-9 h-9 rounded-[6px] font-bold text-white tabular-nums" style={{ background: SEV_COLOR[sev] }}>{score}</span>
            <Pill label={sev} color={SEV_COLOR[sev]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Responsable"><input value={f.owner} onChange={(e) => set("owner", e.target.value)} className={inputCls} /></Field>
            <Field label="Cadre lié"><Select value={f.related_framework || ""} onChange={(v) => set("related_framework", v)} options={["", "PND", "POL", "DIG"]} /></Field>
          </div>
          <Field label="Plan de mitigation"><textarea value={f.mitigation_plan} onChange={(e) => set("mitigation_plan", e.target.value)} rows={2} className={inputCls} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Échéance mitig."><input type="date" value={f.mitigation_deadline} onChange={(e) => set("mitigation_deadline", e.target.value)} className={inputCls} /></Field>
            <Field label="Proba. résid."><Select value={String(f.residual_probability)} onChange={(v) => set("residual_probability", v)} options={["", "1", "2", "3", "4", "5"]} /></Field>
            <Field label="Impact résid."><Select value={String(f.residual_impact)} onChange={(v) => set("residual_impact", v)} options={["", "1", "2", "3", "4", "5"]} /></Field>
          </div>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-[6px] border border-[#E2E8F0] text-[#4A5568] hover:bg-[#F7F7F5]">Annuler</button>
          <button data-testid="save-risk" onClick={save} disabled={saving} className="px-4 py-2 text-sm rounded-[6px] bg-[#C53030] text-white font-medium hover:bg-[#a82626] disabled:opacity-60">{saving ? "…" : "Enregistrer"}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ item, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await metfpaApi.delete(`/risks/${item.id}`); toast.success("Risque supprimé"); onDeleted(); } catch { toast.error("Échec de la suppression"); } finally { setBusy(false); } };
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="delete-risk-dialog" className="max-w-sm">
        <DialogHeader><DialogTitle>Supprimer le risque</DialogTitle><DialogDescription className="text-xs text-[#718096]">Action journalisée. Irréversible.</DialogDescription></DialogHeader>
        <p className="text-sm text-[#4A5568]">Confirmer la suppression de « {item?.title} » ?</p>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-[6px] border border-[#E2E8F0] text-[#4A5568]">Annuler</button>
          <button data-testid="confirm-delete-risk" onClick={go} disabled={busy} className="px-4 py-2 text-sm rounded-[6px] bg-[#C53030] text-white font-medium disabled:opacity-60">Supprimer</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const inputCls = "w-full rounded-[6px] border border-[#E2E8F0] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C53030]";
function Field({ label, children }) { return <label className="block"><span className="text-xs font-semibold text-[#4A5568]">{label}</span><div className="mt-1">{children}</div></label>; }
function Select({ value, onChange, options, testid }) { return <select data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>{options.map((o) => <option key={o} value={o}>{o || "—"}</option>)}</select>; }
function Pill({ label, color }) { return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[4px] capitalize" style={{ color, background: `${color}14` }}>{label}</span>; }
