import React, { useEffect, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { fmtMillions } from "@/lib/format";
import { frameworkColor, axisColor } from "@/lib/metfpaTheme";
import { OriginBadge, MissingValue } from "@/components/OriginBadge";
import { DemoBanner } from "@/components/DemoBanner";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Activity, Zap, ChevronDown, ChevronRight } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }
const DIG = frameworkColor("DIG");

export default function StrategieDigitale() {
  const [data, setData] = useState(null);
  const [indics, setIndics] = useState(null);

  useEffect(() => {
    metfpaApi.get("/digital").then((r) => setData(r.data));
    metfpaApi.get("/indicators").then((r) => setIndics(r.data.filter((x) => x.niveau === "Stratégie digitale")));
  }, []);

  const fw = data?.framework;
  const nodes = data?.nodes || [];
  const profile = data?.profile;
  const axes = nodes.filter((n) => n.niveau === "axe");
  const objsByAxe = (axeCode) => nodes.filter((n) => n.niveau === "objectif" && n.parent_code === axeCode);

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-digital">
      <Breadcrumb items={[{ label: "Stratégie digitale" }]} />
      <DemoBanner />

      <div className="rounded-[6px] border border-[#E2E8F0] bg-white p-6" style={{ borderTop: `3px solid ${DIG}` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.12em] uppercase" style={{ color: DIG }}>
              <Activity size={13} className="inline mr-1" /> Stratégie de digitalisation
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">{fw?.label || "Stratégie digitale 2026-2031"}</h1>
          </div>
          {fw && <OriginBadge origin={fw.data_origin} status={fw.validation_status} />}
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <Stat label="Période" value={fw ? `${fw.period_start}-${fw.period_end}` : "…"} />
          <Stat label="Axes" value={fw ? axes.length : "…"} />
          <Stat label="Budget total" value={fw ? fmtMillions(fw.total) : "…"} />
        </div>
        {profile && (
          <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-[#1F6FEB]">
            <Zap size={12} /> Ancrages : PND <strong>{profile.pnd_ancre}</strong> · Politique <strong>{profile.pol_ancre}</strong>
          </div>
        )}
      </div>

      {/* Financing + annual profile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-[4px] border border-[#E2E8F0] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#1A202C]">Financement</h2>
            {profile && <OriginBadge origin={profile.data_origin} status={profile.validation_status} />}
          </div>
          {!profile ? <Skeleton className="h-20" /> : (
            <>
              <div className="flex h-7 rounded-[4px] overflow-hidden border border-[#E2E8F0]" data-testid="financing-bar">
                <div className="flex items-center justify-center text-[11px] font-semibold text-white" style={{ width: `${profile.financement.etat_pct}%`, background: "#009E49" }}>État {profile.financement.etat_pct}%</div>
                <div className="flex items-center justify-center text-[11px] font-semibold text-white" style={{ width: `${profile.financement.bailleur_pct}%`, background: DIG }}>Bailleurs {profile.financement.bailleur_pct}%</div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                <div><span className="text-[#718096] text-xs">État</span><div className="font-semibold tabular-nums">{fmtMillions(profile.financement.etat)}</div></div>
                <div><span className="text-[#718096] text-xs">Bailleurs</span><div className="font-semibold tabular-nums">{fmtMillions(profile.financement.bailleur)}</div></div>
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-[4px] border border-[#E2E8F0] p-5">
          <h2 className="text-base font-semibold text-[#1A202C] mb-3">Profil budgétaire annuel 2026-2031</h2>
          {!profile ? <Skeleton className="h-20" /> : (
            <div className="flex items-end gap-2 h-28" data-testid="annual-profile">
              {Object.entries(profile.annuel).map(([y, v]) => {
                const max = Math.max(...Object.values(profile.annuel));
                return (
                  <div key={y} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[10px] font-semibold tabular-nums text-[#4A5568]">{fmtMillions(v)}</div>
                    <div className="w-full rounded-t-[3px]" style={{ height: `${Math.max(6, (v / max) * 80)}px`, background: DIG }} />
                    <div className="text-[10px] text-[#718096]">{y}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Priorities P1-P4 */}
      <div className="bg-white rounded-[4px] border border-[#E2E8F0] p-5">
        <h2 className="text-base font-semibold text-[#1A202C] mb-3">Priorités P1 → P4</h2>
        {!profile ? <Skeleton className="h-24" /> : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3" data-testid="priorities">
            {profile.priorites.map((p) => (
              <div key={p.code} className="rounded-[6px] border border-[#E2E8F0] p-3" style={{ borderTop: `3px solid ${DIG}` }}>
                <div className="text-xs font-bold" style={{ color: DIG }}>{p.code} · {p.nom}</div>
                <div className="text-lg font-bold tabular-nums mt-1">{fmtMillions(p.total)}</div>
                <div className="text-[11px] text-[#718096] mt-1">{p.actions} actions · État {fmtMillions(p.etat)} · Bailleurs {fmtMillions(p.bailleur)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Axes → objectives → orientations */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-[#1A202C]">Axes → Objectifs stratégiques → Orientations</h2>
        {!data ? <Skeleton className="h-40" /> : axes.map((a) => (
          <AxisBlock key={a.code} axe={a} objectifs={objsByAxe(a.code)} />
        ))}
      </div>

      {/* Digital indicators */}
      <div className="bg-white rounded-[4px] border border-[#E2E8F0] p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-[#1A202C]">Indicateurs digitaux {indics && `(${indics.length})`}</h2>
          <OriginBadge origin="html_reference" status="pending_metfpa_validation" />
        </div>
        {!indics ? <Skeleton className="h-24" /> : (
          <div className="space-y-1.5" data-testid="digital-indicators">
            {indics.map((k, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-[6px] border border-[#E2E8F0] px-3 py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {k.axe && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[3px]" style={{ color: axisColor(k.axe), background: `${axisColor(k.axe)}14` }}>{k.axe}</span>}
                  <span className="text-[#1A202C] truncate">{k.libelle}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="text-[#718096]">Base <strong className="text-[#1A202C]">{k.base}</strong></span>
                  <span className="text-[#718096]">Cible <strong className="text-[#1A202C]">{k.cible}</strong></span>
                  {k.valeur_actuelle == null ? <MissingValue label="actuel manquant" /> : <span className="font-semibold">{k.valeur_actuelle}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AxisBlock({ axe, objectifs }) {
  const [open, setOpen] = useState(true);
  const c = axisColor(axe.code) || DIG;
  return (
    <div className="bg-white rounded-[4px] border border-[#E2E8F0]" data-testid={`dig-axe-${axe.code}`} style={{ borderLeft: `3px solid ${c}` }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="flex items-center gap-2 min-w-0">
          {open ? <ChevronDown size={16} className="text-[#4A5568]" /> : <ChevronRight size={16} className="text-[#4A5568]" />}
          <span className="text-[11px] font-bold uppercase px-1.5 py-0.5 rounded-[3px]" style={{ color: c, background: `${c}14` }}>{axe.code}</span>
          <span className="text-sm font-semibold text-[#1A202C]">{axe.nom}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[#718096]">{axe.pct}% · {fmtMillions(axe.budget_total)}</span>
          <OriginBadge origin={axe.data_origin} status={axe.validation_status} />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {objectifs.map((o) => (
            <div key={o.code} className="rounded-[6px] border border-[#E2E8F0] p-3">
              <div className="text-xs font-semibold text-[#1A202C]"><span className="text-[#718096]">{o.code}</span> · {o.nom}</div>
              <ul className="mt-1.5 space-y-1">
                {(o.orientations || []).map((or, i) => (
                  <li key={i} className="text-[11px] text-[#4A5568] flex gap-1.5"><span style={{ color: c }}>›</span>{or}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-[6px] border border-[#E2E8F0] px-4 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#718096]">{label}</div>
      <div className="text-lg font-bold tabular-nums mt-0.5" style={{ color: DIG }}>{value}</div>
    </div>
  );
}
