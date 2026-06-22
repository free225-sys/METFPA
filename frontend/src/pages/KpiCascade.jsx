import React, { useEffect, useMemo, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { frameworkColor, axisColor } from "@/lib/metfpaTheme";
import { OriginBadge, MissingValue } from "@/components/OriginBadge";
import { DemoBanner } from "@/components/DemoBanner";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useAuth } from "@/context/AuthContext";
import { fmtDateTime } from "@/lib/format";
import { Gauge, Info, BadgeCheck, AlertCircle, ClipboardList, FileQuestion, Activity as ActivityIcon } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }

const LEVEL_META = {
  "PND (national)": { color: frameworkColor("PND"), label: "Niveau national — PND 4.02" },
  "Politique EFTP": { color: frameworkColor("POL"), label: "Niveau sectoriel — Politique EFTP" },
  "Stratégie digitale": { color: frameworkColor("DIG"), label: "Niveau digital — Stratégie 2026-2031" },
};

export default function KpiCascade() {
  const { user } = useAuth();
  const isValidator = user?.role === "me_validator";
  const [indics, setIndics] = useState(null);
  const [acts, setActs] = useState([]);

  useEffect(() => {
    metfpaApi.get("/indicators").then((r) => setIndics(r.data));
    if (isValidator) metfpaApi.get("/activities").then((r) => setActs(r.data)).catch(() => {});
  }, [isValidator]);

  const grouped = useMemo(() => {
    const g = {};
    (indics || []).forEach((k) => { (g[k.niveau] = g[k.niveau] || []).push(k); });
    return g;
  }, [indics]);

  const order = ["PND (national)", "Politique EFTP", "Stratégie digitale"];
  const levels = indics ? [...new Set([...order.filter((l) => grouped[l]), ...Object.keys(grouped)])] : [];

  // Validation workspace buckets (computed from real data, nothing invented)
  const vw = useMemo(() => {
    const list = indics || [];
    return {
      missingValue: list.filter((k) => k.valeur_actuelle == null),
      pending: list.filter((k) => String(k.validation_status || "").startsWith("pending")),
      noSource: list.filter((k) => !k.source),
      incomplete: list.filter((k) => k.base === "n.d." || k.cible == null || k.cible === ""),
      recent: [...acts]
        .filter((a) => a.derniere_maj)
        .sort((a, b) => (b.derniere_maj || "").localeCompare(a.derniere_maj || ""))
        .slice(0, 6),
    };
  }, [indics, acts]);

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-kpi-cascade">
      <Breadcrumb items={[{ label: isValidator ? "Espace de validation M&E" : "KPI en cascade" }]} />
      <DemoBanner />

      {isValidator ? (
        <div className="rounded-[10px] border border-[var(--border)] border-t-[3px] border-t-[var(--ci-green-600)] bg-[var(--surface)] p-6" data-testid="validation-workspace">
          <div className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[var(--ci-green-700)]">
            <BadgeCheck size={13} className="inline mr-1" /> Suivi et évaluation · contrôle qualité
          </div>
          <h1 className="text-[27px] leading-tight font-bold tracking-tight text-[var(--ink-900)] mt-1">Espace de validation M&amp;E</h1>
          <p className="text-[15px] text-[var(--ink-700)] mt-2 max-w-3xl leading-relaxed">
            Vue priorisée des données à fiabiliser avant validation : valeurs manquantes, statut en attente,
            sources de vérification absentes et enregistrements incomplets.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            <VWStat testid="vw-missing" label="Valeurs actuelles manquantes" value={vw.missingValue.length} color="#D97706" icon={AlertCircle} />
            <VWStat testid="vw-pending" label="En attente de validation" value={vw.pending.length} color="#C89A2B" icon={ClipboardList} />
            <VWStat testid="vw-nosource" label="Sans source de vérification" value={vw.noSource.length} color="#52667A" icon={FileQuestion} />
            <VWStat testid="vw-incomplete" label="Enregistrements incomplets" value={vw.incomplete.length} color="#52667A" icon={Info} />
          </div>
        </div>
      ) : (
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
      )}

      {/* Validation-first sections (M&E Validator only) */}
      {isValidator && !indics && <Skeleton className="h-32" />}
      {isValidator && indics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <VWList testid="vw-list-missing" title="① Indicateurs sans valeur actuelle" color="#FF8200"
            rows={vw.missingValue} render={(k) => k.libelle} empty="Toutes les valeurs sont renseignées." />
          <VWList testid="vw-list-pending" title="② Données en attente de validation" color="#C5A028"
            rows={vw.pending} render={(k) => k.libelle} badge={(k) => <OriginBadge origin={k.data_origin} status={k.validation_status} />}
            empty="Aucune donnée en attente." />
          <VWList testid="vw-list-nosource" title="③ Indicateurs sans source de vérification" color="#C53030"
            rows={vw.noSource} render={(k) => k.libelle} empty="Toutes les sources sont renseignées." />
          <VWList testid="vw-list-incomplete" title="④ Enregistrements incohérents / incomplets" color="#1F6FEB"
            rows={vw.incomplete} render={(k) => `${k.libelle} ${k.base === "n.d." ? "· base n.d." : ""}`}
            empty="Aucun enregistrement incomplet." />
          <div className="lg:col-span-2 bg-white rounded-[8px] border border-[#E2E8F0] p-5" data-testid="vw-recent">
            <h2 className="text-sm font-semibold text-[#1A202C] flex items-center gap-2 mb-3"><ActivityIcon size={15} className="text-[#009E49]" /> ⑤ Mises à jour opérationnelles récentes</h2>
            {vw.recent.length === 0 ? <p className="text-sm text-[#A0AEC0] italic">Aucune mise à jour récente enregistrée.</p> : (
              <div className="space-y-1.5">
                {vw.recent.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 text-sm rounded-[6px] border border-[#E2E8F0] px-3 py-2">
                    <span className="truncate"><span className="font-mono text-[11px] text-[#718096]">{a.code_action}</span> {a.intitule}</span>
                    <span className="text-[11px] text-[#718096] whitespace-nowrap tabular-nums">{fmtDateTime(a.derniere_maj)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isValidator && (
        <div className="px-1">
          <h2 className="text-base font-semibold text-[#1A202C]">⑥ Tableau de référence KPI complet</h2>
          <p className="text-xs text-[#718096] mt-0.5">Référentiel intégral des indicateurs (lecture).</p>
        </div>
      )}

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
                      <td className="px-4 py-2.5 text-xs text-[#718096] max-w-[180px] truncate">{k.source || <MissingValue label="source absente" />}</td>
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

function VWStat({ label, value, color, icon: Icon, testid }) {
  return (
    <div data-testid={testid} className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] p-3.5">
      <div className="flex items-center gap-2">
        <Icon size={16} style={{ color }} />
        <span className="text-2xl font-bold tabular-nums text-[var(--ink-900)]">{value}</span>
      </div>
      <div className="text-[11.5px] text-[var(--ink-500)] leading-tight mt-1">{label}</div>
    </div>
  );
}

function VWList({ title, color, rows, render, badge, empty, testid }) {
  return (
    <div data-testid={testid} className="bg-white rounded-[8px] border border-[#E2E8F0] p-5">
      <h2 className="text-sm font-semibold text-[#1A202C] mb-3 flex items-center justify-between">
        <span style={{ color }}>{title}</span>
        <span className="text-xs font-normal text-[#718096]">{rows.length}</span>
      </h2>
      {rows.length === 0 ? <p className="text-sm text-[#009E49] italic">{empty}</p> : (
        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
          {rows.map((k, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-sm rounded-[6px] border border-[#E2E8F0] px-3 py-2">
              <span className="text-[#1A202C] truncate">{render(k)}</span>
              {badge ? badge(k) : <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
