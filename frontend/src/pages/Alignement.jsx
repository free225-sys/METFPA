import React, { useEffect, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { fmtMillions } from "@/lib/format";
import { OriginBadge } from "@/components/OriginBadge";
import { DemoBanner } from "@/components/DemoBanner";
import { Breadcrumb } from "@/components/Breadcrumb";
import { GitMerge, ArrowRight, Zap, FileText, Sparkles } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }
const GREEN = "#009E49", ORANGE = "#FF8200", BLUE = "#1F6FEB";

export default function Alignement() {
  const [al, setAl] = useState(null);
  useEffect(() => { metfpaApi.get("/alignments").then((r) => setAl(r.data)); }, []);

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-alignement">
      <Breadcrumb items={[{ label: "Alignement stratégique" }]} />
      <DemoBanner />

      <div className="rounded-[6px] border border-[#E2E8F0] bg-white p-6">
        <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#4A5568]">
          <GitMerge size={13} className="inline mr-1" /> Cohérence inter-référentiels
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">Alignement PND 4.02 ⇄ Politique EFTP ⇄ Stratégie digitale</h1>
        <p className="text-sm text-[#4A5568] mt-2 max-w-3xl">
          Rattachements entre les effets sectoriels du PND, les axes de la Politique EFTP et l'ancrage de la Stratégie digitale.
        </p>

        {/* Legend — distinguish mapping types */}
        <div className="flex flex-wrap gap-3 mt-4" data-testid="alignment-legend">
          <LegendItem icon={FileText} color="#C5A028" label="Rattachement de référence (à valider)" />
          <LegendItem icon={Zap} color={BLUE} label="Ancrage digital explicite" />
          <LegendItem icon={Sparkles} color="#A0AEC0" label="Rattachement inféré — aucun généré automatiquement" muted />
        </div>
      </div>

      {!al ? <Skeleton className="h-40" /> : (
        <div className="space-y-4">
          {al.map((a) => (
            <div key={a.pol_axe} data-testid={`alignment-${a.pol_axe}`} className="bg-white rounded-[4px] border border-[#E2E8F0] p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-[4px] text-[#8A6D1B] bg-[#C5A028]/12">
                  <FileText size={12} /> Rattachement de référence · à valider
                </span>
                <OriginBadge origin={a.data_origin} status={a.validation_status} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
                {/* PND effect */}
                <Card color={GREEN} tag={`PND ${a.pnd_effet}`} title={a.pnd_effet_nom} foot={`Budget effet : ${fmtMillions(a.pnd_total)}`} />
                <div className="flex flex-col items-center text-[#A0AEC0]">
                  <span className="text-[10px] font-semibold text-[#718096]">contribue à</span>
                  <ArrowRight size={20} className="rotate-90 md:rotate-0" />
                </div>
                {/* Policy axis */}
                <Card color={ORANGE} tag={`Politique ${a.pol_axe}`} title={a.pol_axe_nom} foot={`${a.nb_produits} produits · ${fmtMillions(a.pol_total)}`} />
              </div>

              {/* Digital anchor — explicit */}
              {a.dig_ancrage && (
                <div data-testid={`alignment-anchor-${a.pol_axe}`} className="mt-3 flex flex-wrap items-center gap-2 rounded-[6px] border border-[#1F6FEB]/40 bg-[#1F6FEB]/6 px-4 py-2.5">
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
    <div className="rounded-[6px] border border-[#E2E8F0] p-3" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="text-[10px] font-bold uppercase" style={{ color }}>{tag}</div>
      <p className="text-xs text-[#1A202C] mt-1 leading-snug">{title}</p>
      <div className="text-[11px] text-[#718096] mt-2 tabular-nums">{foot}</div>
    </div>
  );
}

function LegendItem({ icon: Icon, color, label, muted }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${muted ? "text-[#A0AEC0]" : "text-[#4A5568]"}`}>
      <Icon size={13} style={{ color }} /> {label}
    </span>
  );
}
