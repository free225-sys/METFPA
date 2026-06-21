import React, { useEffect, useMemo, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { fmtMillions, fmtFCFA } from "@/lib/format";
import { frameworkColor } from "@/lib/metfpaTheme";
import { OriginBadge, MissingValue } from "@/components/OriginBadge";
import { DemoBanner } from "@/components/DemoBanner";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Wallet, Info, AlertTriangle } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }

const MODES = [
  { id: "total", label: "Total", field: "total", desc: "Budget total sur l'horizon complet du cadre." },
  { id: "annual_average", label: "Moyenne / an", field: "annual_average", desc: "Total ÷ nombre d'années — neutralise les horizons différents." },
  { id: "overlap_period", label: "Recouvrement 2026-2030", field: "overlap_value", desc: "Part estimée sur la période commune 2026-2030." },
  { id: "source_framework", label: "Par cadre source", field: "total", desc: "Vue par cadre avec document source — pas d'agrégation inter-cadres." },
];

export default function BudgetConsolide() {
  const [data, setData] = useState(null);
  const [mode, setMode] = useState("annual_average");
  useEffect(() => { metfpaApi.get("/budget/consolidated").then((r) => setData(r.data)); }, []);

  const m = MODES.find((x) => x.id === mode);
  const maxVal = useMemo(() => data ? Math.max(...data.items.map((i) => i[m.field] || 0)) : 1, [data, m]);

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-budget-consolide">
      <Breadcrumb items={[{ label: "Budget consolidé" }]} />
      <DemoBanner />

      <div className="rounded-[6px] border border-[#E2E8F0] bg-white p-6">
        <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#009E49]"><Wallet size={13} className="inline mr-1" /> Comparaison normalisée par période</div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">Budget consolidé — PND · Politique · Digital</h1>
        <div className="flex flex-wrap items-center gap-1 bg-[#F7F7F5] border border-[#E2E8F0] rounded-[6px] p-1 mt-4 w-fit">
          {MODES.map((x) => (
            <button key={x.id} data-testid={`budget-mode-${x.id}`} onClick={() => setMode(x.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors ${mode === x.id ? "bg-[#1A202C] text-white" : "text-[#4A5568] hover:bg-white"}`}>{x.label}</button>
          ))}
        </div>
        <p className="text-xs text-[#718096] mt-2">{m.desc}</p>
      </div>

      {/* Always-visible horizon warning */}
      {data && (
        <div className="flex items-start gap-2 rounded-[6px] border border-[#FF8200]/40 bg-[#FF8200]/8 px-4 py-3" data-testid="horizon-warning">
          <AlertTriangle size={16} className="text-[#FF8200] shrink-0 mt-0.5" />
          <div className="text-xs text-[#8A4B00]">
            <p>Les montants relèvent d'<strong>horizons et de périmètres différents</strong>. La comparaison directe des totaux peut être trompeuse. {mode === "overlap_period" && <span>{data.overlap_note}</span>}</p>
            <p className="mt-1">Comparaison <strong>requiert validation client</strong> (<code>requires_client_validation = {String(data.requires_client_validation)}</code>).</p>
          </div>
        </div>
      )}

      {/* Bars */}
      <div className="bg-white rounded-[4px] border border-[#E2E8F0] p-5">
        <h2 className="text-base font-semibold text-[#1A202C] mb-4">{m.label}</h2>
        {!data ? <Skeleton className="h-32" /> : (
          <div className="space-y-3" data-testid="budget-bars">
            {data.items.map((f) => {
              const c = frameworkColor(f.framework);
              const v = f[m.field] || 0;
              return (
                <div key={f.framework} data-testid={`budget-bar-${f.framework}`}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-[#1A202C]">{f.label}</span>
                    <span className="font-bold tabular-nums" style={{ color: c }}>{fmtMillions(v)}</span>
                  </div>
                  <div className="h-6 rounded-[4px] bg-[#F1F1EF] overflow-hidden"><div className="h-full rounded-[4px] transition-all" style={{ width: `${Math.max(2, (v / maxVal) * 100)}%`, background: c }} /></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail cards — full normalized fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {!data ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-64" />) :
          data.items.map((f) => {
            const c = frameworkColor(f.framework);
            return (
              <div key={f.framework} data-testid={`budget-card-${f.framework}`} className="bg-white rounded-[4px] border border-[#E2E8F0] p-5" style={{ borderTop: `3px solid ${c}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold text-[#1A202C]">{f.label}</div>
                  <OriginBadge origin={f.data_origin} status={f.validation_status} />
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  <Row k="Cadre">{f.framework}</Row>
                  <Row k="Période">{f.period_start} → {f.period_end} <span className="text-[#A0AEC0]">({f.period_years} ans)</span></Row>
                  <Row k="Total">{fmtMillions(f.total)}</Row>
                  <Row k="Moyenne / an">{fmtMillions(f.annual_average)}</Row>
                  <Row k="Recouvr. 2026-2030">{fmtMillions(f.overlap_value)} <span className="text-[#A0AEC0]">({f.overlap_years} ans)</span></Row>
                  <Row k="Périmètre">{f.budget_scope}</Row>
                  <Row k="Statut"><OriginBadge status={f.validation_status} /></Row>
                </div>
                <div className="mt-3 pt-3 border-t border-[#E2E8F0] text-[11px] text-[#718096]">Source : {f.source}</div>
                <div className="mt-2 text-[11px] flex items-center gap-1.5 flex-wrap">Engagé/exécuté : <MissingValue label="donnée absente" /></div>
              </div>
            );
          })}
      </div>

      {data && (
        <div className="flex items-start gap-2 rounded-[6px] border border-[#1F6FEB]/30 bg-[#1F6FEB]/8 px-4 py-3 text-xs text-[#1A4E8A]" data-testid="financing-note">
          <Info size={15} className="text-[#1F6FEB] shrink-0 mt-0.5" />
          <p>Répartition <strong>État 15% / Bailleurs 85%</strong> applicable uniquement à la <strong>Stratégie digitale</strong> (cf. document source). Aucune source de financement par activité n'est inventée pour le PND ou la Politique.</p>
        </div>
      )}
    </div>
  );
}

function Row({ k, children }) { return <div className="flex items-center justify-between gap-2"><span className="text-[#718096]">{k}</span><span className="font-semibold text-[#1A202C] tabular-nums text-right">{children}</span></div>; }
