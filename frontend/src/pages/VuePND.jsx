import React, { useEffect, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { fmtMillions } from "@/lib/format";
import { frameworkColor } from "@/lib/metfpaTheme";
import { OriginBadge } from "@/components/OriginBadge";
import { DemoBanner } from "@/components/DemoBanner";
import { Breadcrumb } from "@/components/Breadcrumb";
import { HierTree } from "@/components/HierTree";
import { Layers, Zap } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }

export default function VuePND() {
  const [data, setData] = useState(null);
  const color = frameworkColor("PND");

  useEffect(() => { metfpaApi.get("/pnd").then((r) => setData(r.data)); }, []);

  const fw = data?.framework;
  const nodes = data?.nodes || [];
  const secteur = nodes.find((n) => n.niveau === "secteur");
  const effets = nodes.filter((n) => n.niveau === "effet").length;
  const produits = nodes.filter((n) => n.niveau === "produit").length;

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-pnd">
      <Breadcrumb items={[{ label: "PND 4.02" }]} />
      <DemoBanner />

      <div className="rounded-[6px] border border-[#E2E8F0] bg-white p-6" style={{ borderTop: `3px solid ${color}` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.12em] uppercase" style={{ color }}>
              <Layers size={13} className="inline mr-1" /> PND 2026-2030 · Résultat sectoriel
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">
              Secteur 4.02 — Enseignement Technique & Formation Professionnelle
            </h1>
          </div>
          {fw && <OriginBadge origin={fw.data_origin} status={fw.validation_status} />}
        </div>
        {secteur && <p className="text-sm text-[#4A5568] mt-3 leading-relaxed max-w-4xl">{secteur.resultat}</p>}
        <div className="flex flex-wrap gap-3 mt-4">
          <Stat label="Effets attendus" value={fw ? effets : "…"} color={color} />
          <Stat label="Produits" value={fw ? produits : "…"} color={color} />
          <Stat label="Budget secteur" value={secteur ? fmtMillions(secteur.budget_total) : "…"} color={color} />
        </div>
        <div className="flex items-center gap-2 mt-3 text-[11px] text-[#1F6FEB]">
          <Zap size={12} /> Ancrage de la stratégie digitale : produit <strong>4.02.1.6</strong>
        </div>
      </div>

      <div className="bg-white rounded-[4px] border border-[#E2E8F0] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold tracking-tight text-[#1A202C]">Chaîne de résultats — Secteur → Effets → Produits</h2>
          {fw && <OriginBadge origin={fw.data_origin} status={fw.validation_status} />}
        </div>
        {!data ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          : <HierTree nodes={nodes} color={color} expandDepth={2} highlightCodes={["4.02.1.6"]} />}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="rounded-[6px] border border-[#E2E8F0] px-4 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#718096]">{label}</div>
      <div className="text-lg font-bold tabular-nums mt-0.5" style={{ color }}>{value}</div>
    </div>
  );
}
