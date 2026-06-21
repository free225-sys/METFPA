import React, { useEffect, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { fmtMillions } from "@/lib/format";
import { frameworkColor } from "@/lib/metfpaTheme";
import { OriginBadge } from "@/components/OriginBadge";
import { DemoBanner } from "@/components/DemoBanner";
import { Breadcrumb } from "@/components/Breadcrumb";
import { HierTree } from "@/components/HierTree";
import { Target, ArrowRight } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }

export default function PolitiqueEFTP() {
  const [data, setData] = useState(null);
  const color = frameworkColor("POL");

  useEffect(() => { metfpaApi.get("/politique").then((r) => setData(r.data)); }, []);

  const fw = data?.framework;
  const nodes = data?.nodes || [];
  const axes = nodes.filter((n) => n.niveau === "axe");
  const produits = nodes.filter((n) => n.niveau === "produit").length;
  const actions = nodes.filter((n) => n.niveau === "action").length;

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-politique">
      <Breadcrumb items={[{ label: "Politique EFTP" }]} />
      <DemoBanner />

      <div className="rounded-[6px] border border-[#E2E8F0] bg-white p-6" style={{ borderTop: `3px solid ${color}` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.12em] uppercase" style={{ color }}>
              <Target size={13} className="inline mr-1" /> Politique sectorielle décennale
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">{fw?.label || "Politique EFTP 2026-2035"}</h1>
          </div>
          {fw && <OriginBadge origin={fw.data_origin} status={fw.validation_status} />}
        </div>
        {fw?.vision && <p className="text-sm text-[#4A5568] mt-3 leading-relaxed italic max-w-4xl">{fw.vision}</p>}
        <div className="flex flex-wrap gap-3 mt-4">
          <Stat label="Période" value={fw ? `${fw.period_start}-${fw.period_end} (${fw.period_years} ans)` : "…"} color={color} />
          <Stat label="Axes" value={fw ? axes.length : "…"} color={color} />
          <Stat label="Produits" value={fw ? produits : "…"} color={color} />
          <Stat label="Actions clés" value={fw ? actions : "…"} color={color} />
          <Stat label="Budget total" value={fw ? fmtMillions(fw.total) : "…"} color={color} />
        </div>
        <p className="text-[11px] text-[#718096] mt-3">Périmètre : {fw?.budget_scope} · Source : {fw?.source_document}</p>
      </div>

      {/* Axe → PND effect linkage */}
      <div className="bg-white rounded-[4px] border border-[#E2E8F0] p-5">
        <h2 className="text-base font-semibold tracking-tight text-[#1A202C] mb-1">Rattachement des axes au PND 4.02</h2>
        <p className="text-xs text-[#718096] mb-4">Chaque axe de la Politique contribue à un effet sectoriel du PND.</p>
        {!data ? <Skeleton className="h-24" /> : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {axes.map((a) => (
              <div key={a.code} data-testid={`axe-link-${a.code}`} className="rounded-[6px] border border-[#E2E8F0] p-3" style={{ borderLeft: `3px solid ${color}` }}>
                <div className="text-[10px] font-bold uppercase" style={{ color }}>{a.code}</div>
                <p className="text-xs text-[#1A202C] mt-1 leading-snug font-medium">{a.nom}</p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#718096]">
                  contribue à <ArrowRight size={12} /> <span className="font-semibold text-[#009E49]">PND {a.pnd_effet}</span>
                </div>
                <div className="mt-1.5"><OriginBadge origin={a.data_origin} status={a.validation_status} /></div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-[4px] border border-[#E2E8F0] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold tracking-tight text-[#1A202C]">Hiérarchie — Axe → Produit → Action clé</h2>
          {fw && <OriginBadge origin={fw.data_origin} status={fw.validation_status} />}
        </div>
        {!data ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          : <HierTree nodes={nodes} color={color} expandDepth={1} highlightCodes={[]} />}
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
