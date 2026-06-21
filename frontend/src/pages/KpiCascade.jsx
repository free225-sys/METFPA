import React, { useEffect, useMemo, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { frameworkColor, axisColor } from "@/lib/metfpaTheme";
import { OriginBadge, MissingValue } from "@/components/OriginBadge";
import { DemoBanner } from "@/components/DemoBanner";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Gauge, Info } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }

const LEVEL_META = {
  "PND (national)": { color: frameworkColor("PND"), label: "Niveau national — PND 4.02" },
  "Politique EFTP": { color: frameworkColor("POL"), label: "Niveau sectoriel — Politique EFTP" },
  "Stratégie digitale": { color: frameworkColor("DIG"), label: "Niveau digital — Stratégie 2026-2031" },
};

export default function KpiCascade() {
  const [indics, setIndics] = useState(null);
  useEffect(() => { metfpaApi.get("/indicators").then((r) => setIndics(r.data)); }, []);

  const grouped = useMemo(() => {
    const g = {};
    (indics || []).forEach((k) => { (g[k.niveau] = g[k.niveau] || []).push(k); });
    return g;
  }, [indics]);

  // Preserve stored order; do not invent hierarchy
  const order = ["PND (national)", "Politique EFTP", "Stratégie digitale"];
  const levels = indics ? [...new Set([...order.filter((l) => grouped[l]), ...Object.keys(grouped)])] : [];

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-kpi-cascade">
      <Breadcrumb items={[{ label: "KPI en cascade" }]} />
      <DemoBanner />

      <div className="rounded-[6px] border border-[#E2E8F0] bg-white p-6">
        <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#4A5568]">
          <Gauge size={13} className="inline mr-1" /> Indicateurs de résultat
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">KPI en cascade — national → sectoriel → digital</h1>
        <p className="text-sm text-[#4A5568] mt-2 max-w-3xl">
          {indics ? indics.length : "…"} indicateurs regroupés selon le niveau réellement enregistré dans la source.
        </p>
        <div className="flex items-start gap-2 rounded-[6px] border border-[#1F6FEB]/30 bg-[#1F6FEB]/8 px-4 py-2.5 mt-4">
          <Info size={15} className="text-[#1F6FEB] shrink-0 mt-0.5" />
          <p className="text-xs text-[#1A4E8A]">Valeur actuelle non renseignée dans la source → affichée <strong>« manquante »</strong> (jamais 0). Périodicité et responsable non fournis par la source.</p>
        </div>
      </div>

      {!indics ? <Skeleton className="h-40" /> : levels.map((lv) => {
        const meta = LEVEL_META[lv] || { color: "#1A202C", label: lv };
        const rows = grouped[lv] || [];
        return (
          <div key={lv} data-testid={`kpi-level-${lv}`} className="bg-white rounded-[4px] border border-[#E2E8F0] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E8F0]" style={{ borderLeft: `3px solid ${meta.color}` }}>
              <h2 className="text-base font-semibold" style={{ color: meta.color }}>{meta.label} <span className="text-[#A0AEC0] font-normal text-sm">({rows.length})</span></h2>
              <OriginBadge origin={rows[0]?.data_origin} status={rows[0]?.validation_status} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F7F7F5] text-[#718096] text-[11px] uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Indicateur</th>
                    <th className="text-left px-4 py-2 font-semibold">Axe</th>
                    <th className="text-center px-4 py-2 font-semibold">Base</th>
                    <th className="text-center px-4 py-2 font-semibold">Cible</th>
                    <th className="text-center px-4 py-2 font-semibold">Valeur actuelle</th>
                    <th className="text-left px-4 py-2 font-semibold">Source</th>
                    <th className="text-left px-4 py-2 font-semibold">Origine</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((k, i) => (
                    <tr key={i} data-testid="kpi-row" className="border-t border-[#E2E8F0] hover:bg-[#F7F7F5]">
                      <td className="px-4 py-2.5 max-w-[320px]"><span className="text-[#1A202C]">{k.libelle}</span></td>
                      <td className="px-4 py-2.5">{k.axe ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[3px]" style={{ color: axisColor(k.axe), background: `${axisColor(k.axe)}14` }}>{k.axe}</span> : <span className="text-[#CBD5E0]">—</span>}</td>
                      <td className="px-4 py-2.5 text-center text-xs tabular-nums">{k.base === "n.d." ? <span className="text-[#A0AEC0] italic">n.d.</span> : <span className="font-medium">{k.base}</span>}</td>
                      <td className="px-4 py-2.5 text-center text-xs tabular-nums font-semibold text-[#1A202C]">{k.cible}</td>
                      <td className="px-4 py-2.5 text-center">{k.valeur_actuelle == null ? <MissingValue label="manquante" /> : <span className="text-xs font-semibold tabular-nums">{k.valeur_actuelle}</span>}</td>
                      <td className="px-4 py-2.5 text-xs text-[#718096] max-w-[180px] truncate">{k.source}</td>
                      <td className="px-4 py-2.5"><OriginBadge origin={k.data_origin} status={k.validation_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
