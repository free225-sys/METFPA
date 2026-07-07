import React, { useEffect, useMemo, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { fmtMillions } from "@/lib/format";
import { frameworkColor } from "@/lib/metfpaTheme";
import { OriginBadge } from "@/components/OriginBadge";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageHeader, DataStatusBanner } from "@/components/Institutional";
import { useAuth, canValidate, isDircab } from "@/context/AuthContext";
import { getLinkStatuses, setLinkStatus, LINK_STATUSES, LINK_STATUS_COLOR, subscribeDemoStore } from "@/lib/demoStore";
import { toast } from "sonner";
import { ArrowRight, Zap, FileText, Sparkles, Grid3X3, Scale } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[var(--border)] rounded-[6px] ${className}`} />; }
const GREEN = frameworkColor("PND"), ORANGE = frameworkColor("POL"), BLUE = frameworkColor("DIG");
const DEFAULT_LINK = "lien à compléter";

export default function Alignement() {
  const { user } = useAuth();
  const validator = canValidate(user?.role);
  const dircab = isDircab(user?.role);
  const [al, setAl] = useState(null);
  const [acts, setActs] = useState([]);
  const [indics, setIndics] = useState([]);
  const [, tick] = useState(0);
  useEffect(() => {
    metfpaApi.get("/alignments").then((r) => setAl(r.data));
    metfpaApi.get("/activities").then((r) => setActs(r.data)).catch(() => {});
    metfpaApi.get("/indicators").then((r) => setIndics(r.data)).catch(() => {});
    return subscribeDemoStore(() => tick((t) => t + 1));
  }, []);

  const linkStates = getLinkStatuses();
  const matrix = useMemo(() => (al || []).map((a) => {
    const axeActs = acts.filter((x) => x.axe_pol === a.pol_axe);
    const axeKpi = indics.filter((k) => k.axe === a.pol_axe);
    const saved = linkStates[a.pol_axe];
    return {
      ...a,
      actions: axeActs,
      directions: [...new Set(axeActs.map((x) => x.direction).filter(Boolean))].sort(),
      budgetPrevu: axeActs.reduce((s, x) => s + (x.budget_prevu || 0), 0),
      kpiCount: axeKpi.length,
      linkStatus: saved?.status || DEFAULT_LINK,
      linkAuthor: saved?.author,
    };
  }), [al, acts, indics, linkStates]);

  const setStatus = (axe, status) => {
    setLinkStatus(axe, status, user?.email);
    toast.success(`Lien ${axe} : « ${status} »`, { description: "Statut enregistré (démonstration · stockage local)" });
  };

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-alignement">
      <Breadcrumb items={[{ label: "Alignement stratégique" }]} />
      <DataStatusBanner />

      <div className="bg-[var(--surface)] rounded-[10px] border border-[var(--border)] border-t-[3px] border-t-[var(--info)] p-6">
        <PageHeader eyebrow="Cohérence inter-référentiels" accent="var(--info)"
          title="Alignement PND 4.02 ⇄ Politique EFTP ⇄ Stratégie digitale"
          description="Rattachements entre les effets sectoriels du PND, les axes de la Politique EFTP et l'ancrage de la Stratégie digitale." />
        <div className="flex flex-wrap gap-4 mt-4" data-testid="alignment-legend">
          <LegendItem icon={FileText} color="var(--ci-gold-600)" label="Rattachement de référence (à valider)" />
          <LegendItem icon={Zap} color={BLUE} label="Ancrage digital explicite" />
          <LegendItem icon={Sparkles} color="var(--ink-500)" label="Rattachement inféré — aucun généré automatiquement" muted />
        </div>
      </div>

      {/* Matrice d'alignement complète (chaîne stratégique → opérationnelle) */}
      <div className="bg-[var(--surface)] rounded-[10px] border border-[var(--border)] overflow-hidden" data-testid="alignment-matrix">
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-[var(--ink-900)] flex items-center gap-2"><Grid3X3 size={16} className="text-[var(--info)]" /> Matrice d'alignement — PND → Politique EFTP → Plan annuel</h2>
          <span className="text-[11px] text-[#718096]">Statut du lien : {validator ? "modifiable (Validateur S-E / Admin)" : dircab ? "marquage « à arbitrer » (DIRCAB)" : "lecture"} · <strong>démo (stockage local)</strong></span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="alignment-matrix-table">
            <thead className="bg-[#F7F7F5] text-[#718096] text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Objectif PND</th>
                <th className="text-left px-3 py-2.5 font-semibold min-w-[180px]">Effet / Produit PND</th>
                <th className="text-left px-3 py-2.5 font-semibold">Axe Politique EFTP</th>
                <th className="text-left px-3 py-2.5 font-semibold">Action politique</th>
                <th className="text-center px-3 py-2.5 font-semibold">Plan annuel</th>
                <th className="text-center px-3 py-2.5 font-semibold">KPI</th>
                <th className="text-right px-3 py-2.5 font-semibold">Budget</th>
                <th className="text-left px-3 py-2.5 font-semibold">Responsable</th>
                <th className="text-left px-3 py-2.5 font-semibold min-w-[160px]">Statut du lien</th>
              </tr>
            </thead>
            <tbody>
              {!al ? <tr><td colSpan={9} className="p-3"><Skeleton className="h-16" /></td></tr> :
                matrix.map((m) => (
                  <tr key={m.pol_axe} data-testid={`matrix-row-${m.pol_axe}`} className="border-t border-[var(--border)] hover:bg-[#F7F7F5] align-top">
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap"><span className="font-semibold" style={{ color: GREEN }}>PND 4.02</span><div className="text-[10px] text-[#718096]">Capital humain · EFTP</div></td>
                    <td className="px-3 py-2.5 text-xs"><span className="font-mono text-[10px] text-[#718096]">{m.pnd_effet}</span> {m.pnd_effet_nom}</td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap"><span className="font-bold" style={{ color: ORANGE }}>{m.pol_axe}</span><div className="text-[10px] text-[#718096] max-w-[150px] truncate" title={m.pol_axe_nom}>{m.pol_axe_nom}</div></td>
                    <td className="px-3 py-2.5 text-xs tabular-nums">{m.nb_produits} produit(s)</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-xs font-semibold">{m.actions.length} <span className="font-normal text-[#718096]">action(s)</span></td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-xs">{m.kpiCount}</td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums whitespace-nowrap">{fmtMillions(m.pol_total)}<div className="text-[10px] text-[#718096]">{m.budgetPrevu ? `${fmtMillions(m.budgetPrevu)} prévu (démo)` : "prévu n.d."}</div></td>
                    <td className="px-3 py-2.5 text-[11px] text-[#4A5568] max-w-[150px]">{m.directions.slice(0, 4).join(", ") || "—"}{m.directions.length > 4 ? ` +${m.directions.length - 4}` : ""}</td>
                    <td className="px-3 py-2.5">
                      {validator ? (
                        <select data-testid={`link-status-${m.pol_axe}`} value={m.linkStatus} onChange={(e) => setStatus(m.pol_axe, e.target.value)}
                          className="w-full rounded-[5px] border border-[#E2E8F0] px-1.5 py-1 text-[11px] font-semibold bg-white" style={{ color: LINK_STATUS_COLOR[m.linkStatus] }}>
                          {LINK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span data-testid={`link-status-${m.pol_axe}`} className="text-[11px] font-semibold px-2 py-0.5 rounded-[4px] whitespace-nowrap" style={{ color: LINK_STATUS_COLOR[m.linkStatus], background: `${LINK_STATUS_COLOR[m.linkStatus]}14` }}>{m.linkStatus}</span>
                          {dircab && m.linkStatus !== "à arbitrer" && (
                            <button data-testid={`link-arbitrer-${m.pol_axe}`} title="Marquer « à arbitrer » (DIRCAB)" onClick={() => setStatus(m.pol_axe, "à arbitrer")}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-[#7C3AED] hover:underline"><Scale size={11} /> à arbitrer</button>
                          )}
                        </div>
                      )}
                      {m.linkAuthor && <div className="text-[9px] text-[#A0AEC0] mt-0.5">par {m.linkAuthor}</div>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {!al ? <Skeleton className="h-40" /> : (
        <div className="space-y-4">
          {al.map((a) => (
            <div key={a.pol_axe} data-testid={`alignment-${a.pol_axe}`} className="bg-[var(--surface)] rounded-[10px] border border-[var(--border)] p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-[5px] text-[#8A6D1B] bg-[var(--ci-gold-100)]">
                  <FileText size={12} /> Rattachement de référence · à valider
                </span>
                <OriginBadge origin={a.data_origin} status={a.validation_status} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
                <Card color={GREEN} tag={`PND ${a.pnd_effet}`} title={a.pnd_effet_nom} foot={`Budget effet : ${fmtMillions(a.pnd_total)}`} />
                <div className="flex flex-col items-center text-[var(--ink-500)]">
                  <span className="text-[10px] font-semibold">contribue à</span>
                  <ArrowRight size={20} className="rotate-90 md:rotate-0" />
                </div>
                <Card color={ORANGE} tag={`Politique ${a.pol_axe}`} title={a.pol_axe_nom} foot={`${a.nb_produits} produits · ${fmtMillions(a.pol_total)}`} />
              </div>

              {a.dig_ancrage && (
                <div data-testid={`alignment-anchor-${a.pol_axe}`} className="mt-3 flex flex-wrap items-center gap-2 rounded-[8px] border border-[#1F6FEB]/40 bg-[#1F6FEB]/[0.06] px-4 py-2.5">
                  <Zap size={15} className="text-[#1F6FEB]" />
                  <span className="text-xs font-semibold text-[#1A4E8A]">Ancrage digital explicite :</span>
                  <span className="text-xs text-[#1A4E8A]">PND <strong>{a.dig_ancrage.pnd_ancre}</strong> · Politique <strong>{a.dig_ancrage.pol_ancre}</strong> · Stratégie digitale 2026-2031</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ color, tag, title, foot }) {
  return (
    <div className="rounded-[8px] border border-[var(--border)] p-3.5" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color }}>{tag}</div>
      <p className="text-[13px] text-[var(--ink-900)] mt-1 leading-snug">{title}</p>
      <div className="text-[11px] text-[var(--ink-500)] mt-2 tabular-nums">{foot}</div>
    </div>
  );
}

function LegendItem({ icon: Icon, color, label, muted }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${muted ? "text-[var(--ink-500)]" : "text-[var(--ink-700)]"}`}>
      <Icon size={13} style={{ color }} /> {label}
    </span>
  );
}
