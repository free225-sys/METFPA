import React, { useEffect, useMemo, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { fmtMillions, fmtDateTime } from "@/lib/format";
import { OriginBadge, MissingValue } from "@/components/OriginBadge";
import { DemoBanner } from "@/components/DemoBanner";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useSearchParams } from "react-router-dom";
import { useAuth, canEdit, isDircab, isAdmin } from "@/context/AuthContext";
import { ValidationActions, lastCorrectionComment } from "@/components/ValidationActions";
import { VALIDATION_OUTCOMES } from "@/lib/metfpaTheme";
import { addAgendaItem } from "@/lib/demoStore";
import { toast } from "sonner";
import { ListChecks, Pencil, Filter, X, AlertTriangle, History, Undo2, ClipboardList } from "lucide-react";

const STATUTS = ["Non démarré", "À l'heure", "En cours", "En retard", "Bloqué", "Achevé", "Suspendu"];
const STATUT_COLOR = {
  "Non démarré": "#718096", "À l'heure": "#1F6FEB", "En cours": "#C5A028",
  "En retard": "#FF8200", "Bloqué": "#C53030", "Achevé": "#009E49", "Suspendu": "#7C3AED",
};

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }

export default function PlanAction() {
  const [acts, setActs] = useState(null);
  const [f, setF] = useState({ axe: "", produit: "", direction: "", statut: "", echeance: "", alerte: "" });
  const [editing, setEditing] = useState(null);
  const [history, setHistory] = useState(null);
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const vue = searchParams.get("vue");
  const isDirEditor = user?.role === "direction_editor";
  const editable = (a) => canEdit(user?.role) && (user?.role !== "direction_editor" || a.direction === user?.direction);
  const canOdj = isDircab(user?.role) || isAdmin(user?.role);
  const toOdj = (a) => {
    const ok = addAgendaItem({ linked_id: a.id, sujet: `${a.code_action} — ${a.intitule}`, direction: a.direction || "",
                               blocage: a.alerte || (a.statut === "Bloqué" ? "Activité bloquée" : ""), priorite: a.statut === "Bloqué" ? "haute" : "moyenne" });
    ok ? toast.success("Ajoutée à l'ordre du jour (démo)", { description: a.code_action })
       : toast.info("Déjà inscrite à l'ordre du jour", { description: a.code_action });
  };

  const load = () => metfpaApi.get("/activities").then((r) => setActs(r.data));
  useEffect(() => { load(); }, []);

  const opts = useMemo(() => {
    const u = (k) => [...new Set((acts || []).map((a) => a[k]).filter(Boolean))].sort();
    return { axe: u("axe_pol"), produit: u("produit_pol"), direction: u("direction"), echeance: u("echeance") };
  }, [acts]);

  const mine = useMemo(() => {
    if (!isDirEditor || !acts) return null;
    const list = acts.filter((a) => a.direction === user?.direction);
    const recent = [...list].filter((a) => a.derniere_maj).sort((a, b) => (b.derniere_maj || "").localeCompare(a.derniere_maj || ""))[0];
    return {
      total: list.length,
      retard: list.filter((a) => a.statut === "En retard").length,
      bloque: list.filter((a) => a.statut === "Bloqué").length,
      alerte: list.filter((a) => !!a.alerte).length,
      aFaire: list.filter((a) => a.statut !== "Achevé").length,
      corrections: list.filter((a) => a.validation_status === "correction_requested"),
      lastMaj: recent?.derniere_maj,
    };
  }, [acts, isDirEditor, user]);

  const VUE_LABEL = { updates: "Mises à jour requises", delayed: "Activités en retard / bloquées", alerts: "Activités avec alerte" };

  const filtered = useMemo(() => {
    let base = acts || [];
    if (isDirEditor && user?.direction) base = base.filter((a) => a.direction === user.direction);
    if (vue === "delayed") base = base.filter((a) => a.statut === "En retard" || a.statut === "Bloqué");
    else if (vue === "alerts") base = base.filter((a) => !!a.alerte);
    else if (vue === "updates") base = base.filter((a) => a.statut !== "Achevé");
    return base.filter((a) =>
      (!f.axe || a.axe_pol === f.axe) && (!f.produit || a.produit_pol === f.produit) &&
      (!f.direction || a.direction === f.direction) && (!f.statut || a.statut === f.statut) &&
      (!f.echeance || a.echeance === f.echeance) &&
      (!f.alerte || (f.alerte === "with" ? !!a.alerte : !a.alerte))
    );
  }, [acts, f, isDirEditor, user, vue]);

  const reset = () => setF({ axe: "", produit: "", direction: "", statut: "", echeance: "", alerte: "" });
  const active = Object.values(f).some(Boolean);

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-plan-action">
      <Breadcrumb items={[{ label: "Plan d'action ministère" }]} />
      <DemoBanner />

      <div className="rounded-[8px] border border-[#E2E8F0] bg-white p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#FF8200]">
              <ListChecks size={13} className="inline mr-1" /> {isDirEditor ? `Direction ${user?.direction || ""}` : "Suivi opérationnel des directions"}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1" data-testid="plan-action-title">
              {isDirEditor ? "Mon portefeuille de direction" : "Plan d'action ministériel"}
            </h1>
            <p className="text-sm text-[#4A5568] mt-2 max-w-3xl">
              {isDirEditor
                ? <>Activités rattachées à <strong>votre direction</strong> uniquement. Édition de l'<strong>avancement</strong>, du <strong>statut</strong> et de l'<strong>alerte</strong>.</>
                : <>{acts ? acts.length : "…"} activités suivies. Édition de l'<strong>avancement</strong>, du <strong>statut</strong> et de l'<strong>alerte</strong> uniquement. Les données de référence (budgets, financement, directions) ne sont pas modifiables.</>}
            </p>
          </div>
          <OriginBadge origin="demo_tracking" />
        </div>

        {isDirEditor && mine && (
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mt-5" data-testid="portfolio-stats">
            <PStat label="Mes activités" value={mine.total} color="#1A202C" />
            <PStat label="À mettre à jour" value={mine.aFaire} color="#FF8200" />
            <PStat label="En retard" value={mine.retard} color="#C53030" />
            <PStat label="Bloquées" value={mine.bloque} color="#C53030" />
            <PStat label="Avec alerte" value={mine.alerte} color="#C5A028" />
            <PStat label="Corrections demandées" value={mine.corrections.length} color="#D97706" />
          </div>
        )}
        {isDirEditor && mine?.lastMaj && (
          <p className="text-[11px] text-[#718096] mt-3">Dernière mise à jour de votre portefeuille : <strong>{fmtDateTime(mine.lastMaj)}</strong></p>
        )}
      </div>

      {/* Correction requests addressed to this direction (Phase 2) */}
      {isDirEditor && mine?.corrections.length > 0 && (
        <div className="rounded-[8px] border border-[#D97706]/40 bg-[#D97706]/8 p-4" data-testid="correction-banner">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#92500A]">
            <Undo2 size={16} /> {mine.corrections.length} activité(s) de votre direction nécessitent une correction (demande du Validateur M&E)
          </div>
          <div className="mt-2 space-y-1.5">
            {mine.corrections.map((a) => {
              const c = lastCorrectionComment(a);
              return (
                <div key={a.id} data-testid={`correction-item-${a.id}`} className="flex items-start justify-between gap-3 rounded-[6px] bg-white border border-[#E2E8F0] px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="font-mono text-[11px] text-[#718096]">{a.code_action}</span> <span className="text-[#1A202C]">{a.intitule}</span>
                    {c && <div className="text-[12px] text-[#92500A] mt-0.5">Motif : « {c.text} » — {c.author}</div>}
                  </div>
                  <button data-testid={`correct-activity-${a.id}`} onClick={() => setEditing(a)}
                    className="shrink-0 text-xs font-medium text-[#D97706] hover:underline">Corriger</button>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-[#92500A]/80 mt-2">Une fois votre correction enregistrée, l'activité reste « Correction demandée » jusqu'à revue du Validateur M&E.</p>
        </div>
      )}

      {vue && (
        <div className="flex items-center justify-between gap-3 rounded-[6px] border border-[#FF8200]/30 bg-[#FF8200]/8 px-4 py-2.5" data-testid="vue-banner">
          <span className="text-sm font-medium text-[#9A4D00]">Vue filtrée : {VUE_LABEL[vue] || vue} · {filtered.length} activité(s)</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-[4px] border border-[#E2E8F0] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={15} className="text-[#4A5568]" />
          <span className="text-sm font-semibold text-[#1A202C]">Filtres</span>
          {active && <button data-testid="reset-filters" onClick={reset} className="ml-auto inline-flex items-center gap-1 text-xs text-[#C53030] hover:underline"><X size={12} /> Réinitialiser</button>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <Sel testid="filter-axe" label="Axe" value={f.axe} onChange={(v) => setF({ ...f, axe: v })} options={opts.axe} />
          <Sel testid="filter-produit" label="Produit" value={f.produit} onChange={(v) => setF({ ...f, produit: v })} options={opts.produit} />
          {!isDirEditor && <Sel testid="filter-direction" label="Direction" value={f.direction} onChange={(v) => setF({ ...f, direction: v })} options={opts.direction} />}
          <Sel testid="filter-statut" label="Statut" value={f.statut} onChange={(v) => setF({ ...f, statut: v })} options={STATUTS} />
          <Sel testid="filter-echeance" label="Échéance" value={f.echeance} onChange={(v) => setF({ ...f, echeance: v })} options={opts.echeance} />
          <Sel testid="filter-alerte" label="Alerte" value={f.alerte} onChange={(v) => setF({ ...f, alerte: v })} options={[["with", "Avec alerte"], ["without", "Sans alerte"]]} />
        </div>
        <p className="text-xs text-[#718096] mt-2" data-testid="filter-count">{filtered.length} activité(s) affichée(s)</p>
      </div>

      {/* Table */}
      <div className="bg-[var(--surface)] rounded-[10px] border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-sm" data-testid="activities-table">
            <thead className="bg-[var(--surface-soft)] text-[var(--ink-500)] text-[11px] uppercase tracking-wide sticky top-0 z-10">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Code</th>
                <th className="text-left px-3 py-2.5 font-semibold min-w-[320px]">Intitulé</th>
                <th className="text-left px-3 py-2.5 font-semibold">Direction</th>
                <th className="text-left px-3 py-2.5 font-semibold">Axe</th>
                <th className="text-right px-3 py-2.5 font-semibold">Prévu / Exécuté · Engagé</th>
                <th className="text-left px-3 py-2.5 font-semibold">Avancement</th>
                <th className="text-left px-3 py-2.5 font-semibold">Statut</th>
                <th className="text-left px-3 py-2.5 font-semibold">Échéance</th>
                <th className="text-center px-3 py-2.5 font-semibold">Éditer · Historique</th>
              </tr>
            </thead>
            <tbody>
              {!acts ? [...Array(6)].map((_, i) => <tr key={i}><td colSpan={9} className="p-2"><Skeleton className="h-8" /></td></tr>) :
                filtered.map((a) => (
                  <tr key={a.id} data-testid={`activity-row-${a.id}`}
                    className={`border-t border-[var(--border)] hover:bg-[var(--surface-warm)] ${a.validation_status === "correction_requested" ? "bg-[#D97706]/6 border-l-[3px] border-l-[#D97706]" : ""}`}>
                    <td className="px-3 py-2.5 font-mono text-xs text-[var(--ink-500)] whitespace-nowrap align-top">{a.code_action}</td>
                    <td className="px-3 py-2.5 min-w-[320px] align-top"><span className="text-[var(--ink-900)]" title={a.intitule}>{a.intitule}</span></td>
                    <td className="px-3 py-2.5 whitespace-nowrap align-top"><span className="text-xs">{a.direction}</span> <span className="text-[9px] text-[var(--ci-gold-600)]">à valider</span></td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap align-top">{a.axe_pol}</td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums whitespace-nowrap">
                      <div>{a.budget_prevu != null ? fmtMillions(a.budget_prevu) : <MissingValue label="manquant" />}</div>
                      <div className="text-[#718096]">{a.budget_execute != null ? fmtMillions(a.budget_execute) : "—"} <span className="text-[9px]">(démo)</span></div>
                      <div className="mt-0.5">{a.budget_engage != null ? fmtMillions(a.budget_engage) : <MissingValue label="engagé manquant" />}</div>
                    </td>
                    <td className="px-3 py-2.5 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${a.avancement || 0}%`, background: STATUT_COLOR[a.statut] || "#1F6FEB" }} /></div>
                        <span className="text-xs tabular-nums w-9 text-right">{a.avancement || 0}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[4px]" style={{ color: STATUT_COLOR[a.statut], background: `${STATUT_COLOR[a.statut]}14` }}>{a.statut}</span>
                      {a.alerte && <div className="flex items-center gap-1 text-[10px] text-[#C53030] mt-1"><AlertTriangle size={10} />{a.alerte}</div>}
                      {VALIDATION_OUTCOMES.includes(a.validation_status) && <div className="mt-1"><OriginBadge status={a.validation_status} testid={`activity-validation-${a.id}`} /></div>}
                    </td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">{a.echeance}</td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      {editable(a)
                        ? <button data-testid={`edit-activity-${a.id}`} onClick={() => setEditing(a)} className="inline-flex items-center justify-center w-7 h-7 rounded-[4px] text-[#4A5568] hover:bg-[#FF8200]/10 hover:text-[#FF8200] transition-colors"><Pencil size={14} /></button>
                        : <span className="inline-flex items-center gap-1 text-[#CBD5E0]" title="Lecture seule"><Pencil size={14} /><span className="text-[10px] text-[#A0AEC0]">Lecture</span></span>}
                      <button data-testid={`history-activity-${a.id}`} onClick={() => setHistory(a)} className="inline-flex items-center justify-center w-7 h-7 rounded-[4px] text-[#4A5568] hover:bg-[#1F6FEB]/10 hover:text-[#1F6FEB] transition-colors"><History size={14} /></button>
                      {canOdj && <button data-testid={`odj-activity-${a.id}`} title="Ajouter à l'ordre du jour (démo)" onClick={() => toOdj(a)} className="inline-flex items-center justify-center w-7 h-7 rounded-[4px] text-[#C89A2B] hover:bg-[#C89A2B]/10 transition-colors"><ClipboardList size={14} /></button>}
                      <ValidationActions entityType="activities" item={a} onStale={load}
                        onUpdated={(doc) => setActs((p) => p.map((x) => x.id === doc.id ? doc : x))} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <EditDialog activity={editing} onClose={() => setEditing(null)} onSaved={(updated) => { setActs((p) => p.map((x) => x.id === updated.id ? updated : x)); }} />
      <HistoryDialog activity={history} onClose={() => setHistory(null)} />
    </div>
  );
}

const FIELD_LABEL = { avancement: "Avancement", statut: "Statut", alerte: "Alerte", derniere_maj: "Dernière maj" };
function HistoryDialog({ activity, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (activity) { setData(null); metfpaApi.get(`/activities/${activity.id}/history`).then((r) => setData(r.data)); }
  }, [activity]);
  return (
    <Dialog open={!!activity} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="history-dialog" className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">Historique des modifications <OriginBadge origin="demo_tracking" /></DialogTitle>
          <DialogDescription className="text-xs text-[#718096]">{activity?.code_action} · {activity?.intitule} — lecture seule (journal d'audit).</DialogDescription>
        </DialogHeader>
        {!data ? <div className="animate-pulse h-24 bg-[#E2E8F0] rounded-[4px]" /> :
          data.entries.length === 0 ? <div data-testid="history-empty" className="text-sm text-[#A0AEC0] italic py-6 text-center rounded-[6px] border border-dashed border-[#E2E8F0]">Aucune modification enregistrée pour cette activité.</div> : (
            <div className="space-y-3" data-testid="history-entries">
              {data.entries.map((e, i) => (
                <div key={i} className="rounded-[6px] border border-[#E2E8F0] p-3">
                  <div className="flex items-center justify-between text-[11px] text-[#718096]">
                    <span>{fmtDateTime(e.horodatage)}</span>
                    <span className="font-medium text-[#4A5568]">{e.action} · {e.user}</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {Object.keys(e.apres || {}).filter((k) => k !== "derniere_maj").map((k) => (
                      <div key={k} className="flex items-center gap-2 text-xs">
                        <span className="w-24 text-[#718096]">{FIELD_LABEL[k] || k}</span>
                        <span className="text-[#C53030] line-through">{String(e.avant?.[k] ?? "—") || "∅"}</span>
                        <span className="text-[#CBD5E0]">→</span>
                        <span className="font-semibold text-[#009E49]">{String(e.apres?.[k] ?? "—") || "∅"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-[6px] border border-[#E2E8F0] text-[#4A5568] hover:bg-[#F7F7F5]">Fermer</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ activity, onClose, onSaved }) {
  const [avancement, setAvancement] = useState(0);
  const [statut, setStatut] = useState("");
  const [alerte, setAlerte] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activity) { setAvancement(activity.avancement ?? 0); setStatut(activity.statut || ""); setAlerte(activity.alerte || ""); }
  }, [activity]);

  const save = async () => {
    const av = Math.max(0, Math.min(100, Number(avancement) || 0));
    setSaving(true);
    try {
      const r = await metfpaApi.put(`/activities/${activity.id}`, { avancement: av, statut, alerte });
      onSaved(r.data);
      toast.success("Activité mise à jour", {
        description: `${activity.code_action} · ${av}% · ${statut} · maj ${fmtDateTime(r.data.derniere_maj)}`,
      });
      onClose();
    } catch (e) {
      toast.error("Échec de la mise à jour", { description: e?.response?.data?.detail || "Erreur réseau" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={!!activity} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="edit-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">Éditer l'activité <OriginBadge origin="demo_tracking" /></DialogTitle>
          <DialogDescription className="text-xs text-[#718096]">Suivi de démonstration · seuls l'avancement, le statut et l'alerte sont modifiables.</DialogDescription>
        </DialogHeader>
        {activity && (
          <div className="space-y-4">
            <div className="rounded-[6px] bg-[#F7F7F5] p-3 text-xs text-[#4A5568]">
              <span className="font-mono text-[#718096]">{activity.code_action}</span> · {activity.intitule}
            </div>
            <div>
              <label className="text-xs font-semibold text-[#4A5568]">Avancement (0–100 %)</label>
              <input data-testid="edit-avancement" type="number" min={0} max={100} value={avancement}
                onChange={(e) => setAvancement(e.target.value)}
                className="mt-1 w-full rounded-[6px] border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:border-[#FF8200]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#4A5568]">Statut</label>
              <select data-testid="edit-statut" value={statut} onChange={(e) => setStatut(e.target.value)}
                className="mt-1 w-full rounded-[6px] border border-[#E2E8F0] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#FF8200]">
                {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#4A5568]">Alerte (optionnel)</label>
              <input data-testid="edit-alerte" type="text" value={alerte} onChange={(e) => setAlerte(e.target.value)}
                placeholder="ex. Marché non attribué"
                className="mt-1 w-full rounded-[6px] border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:border-[#FF8200]" />
            </div>
            <p className="text-[11px] text-[#A0AEC0]">Modification de suivi <strong>démo</strong>, journalisée dans l'audit. Les budgets/financements/directions ne sont pas éditables.</p>
          </div>
        )}
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-[6px] border border-[#E2E8F0] text-[#4A5568] hover:bg-[#F7F7F5]">Annuler</button>
          <button data-testid="save-activity" onClick={save} disabled={saving} className="px-4 py-2 text-sm rounded-[6px] bg-[#FF8200] text-white font-medium hover:bg-[#E67500] disabled:opacity-60">{saving ? "Enregistrement…" : "Enregistrer"}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Sel({ label, value, onChange, options, testid }) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wide text-[#718096]">{label}</label>
      <select data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-[6px] border border-[#E2E8F0] px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-[#FF8200]">
        <option value="">Tous</option>
        {options.map((o) => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function PStat({ label, value, color }) {
  return (
    <div className="rounded-[6px] border border-[#E2E8F0] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#718096]">{label}</div>
      <div className="text-2xl font-bold tabular-nums mt-0.5" style={{ color }}>{value}</div>
    </div>
  );
}
