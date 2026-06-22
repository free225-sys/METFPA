import React, { useEffect, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { fmtMillions } from "@/lib/format";
import { frameworkColor } from "@/lib/metfpaTheme";
import { OriginBadge } from "@/components/OriginBadge";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageHeader, DataStatusBanner } from "@/components/Institutional";
import { ArrowRight, Zap, FileText, Sparkles } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[var(--border)] rounded-[6px] ${className}`} />; }
const GREEN = frameworkColor("PND"), ORANGE = frameworkColor("POL"), BLUE = frameworkColor("DIG");

export default function Alignement() {
  const [al, setAl] = useState(null);
  useEffect(() => { metfpaApi.get("/alignments").then((r) => setAl(r.data)); }, []);

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
