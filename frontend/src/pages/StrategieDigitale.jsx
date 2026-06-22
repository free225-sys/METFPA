import React, { useEffect, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { fmtMillions } from "@/lib/format";
import { frameworkColor, axisColor } from "@/lib/metfpaTheme";
import { OriginBadge, MissingValue } from "@/components/OriginBadge";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageHeader, InstitutionalSection, MetricCard, DataStatusBanner } from "@/components/Institutional";
import { Zap, ChevronDown, ChevronRight } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[var(--border)] rounded-[6px] ${className}`} />; }
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
      <DataStatusBanner />

      <div className="bg-[var(--surface)] rounded-[10px] border border-[var(--border)] border-t-[3px] p-6" style={{ borderTopColor: DIG }}>
        <PageHeader eyebrow="Stratégie de digitalisation" accent={DIG}
          title={fw?.label || "Stratégie digitale 2026-2031"}
          actions={fw && <OriginBadge origin={fw.data_origin} status={fw.validation_status} />} />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
          <MetricCard label="Période" value={fw ? `${fw.period_start}-${fw.period_end}` : "…"} accent={DIG} />
          <MetricCard label="Axes" value={fw ? axes.length : "…"} accent={DIG} />
          <MetricCard label="Budget total" value={fw ? fmtMillions(fw.total) : "…"} accent={DIG} />
        </div>
        {profile && (
          <div className="flex flex-wrap items-center gap-2 mt-4 text-[12.5px] text-[var(--info)]">
            <Zap size={13} /> Ancrages : PND <strong>{profile.pnd_ancre}</strong> · Politique <strong>{profile.pol_ancre}</strong>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <InstitutionalSection title="Financement" accent={DIG}
          action={profile && <OriginBadge origin={profile.data_origin} status={profile.validation_status} />}>
          {!profile ? <Skeleton className="h-20" /> : (
            <>
              <div className="flex h-8 rounded-[6px] overflow-hidden border border-[var(--border)]" data-testid="financing-bar">
                <div className="flex items-center justify-center text-[11px] font-semibold text-white" style={{ width: `${profile.financement.etat_pct}%`, background: "var(--ci-green-600)" }}>État {profile.financement.etat_pct}%</div>
                <div className="flex items-center justify-center text-[11px] font-semibold text-white" style={{ width: `${profile.financement.bailleur_pct}%`, background: DIG }}>Bailleurs {profile.financement.bailleur_pct}%</div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                <div><span className="text-[var(--ink-500)] text-xs">État</span><div className="font-semibold tabular-nums text-[var(--ink-900)]">{fmtMillions(profile.financement.etat)}</div></div>
                <div><span className="text-[var(--ink-500)] text-xs">Bailleurs</span><div className="font-semibold tabular-nums text-[var(--ink-900)]">{fmtMillions(profile.financement.bailleur)}</div></div>
              </div>
            </>
          )}
        </InstitutionalSection>

        <InstitutionalSection title="Profil budgétaire annuel 2026-2031" accent={DIG}>
          {!profile ? <Skeleton className="h-20" /> : (
            <div className="flex items-end gap-2 h-28" data-testid="annual-profile">
              {Object.entries(profile.annuel).map(([y, v]) => {
                const max = Math.max(...Object.values(profile.annuel));
                return (
                  <div key={y} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[10px] font-semibold tabular-nums text-[var(--ink-700)]">{fmtMillions(v)}</div>
                    <div className="w-full rounded-t-[3px]" style={{ height: `${Math.max(6, (v / max) * 80)}px`, background: DIG }} />
                    <div className="text-[10px] text-[var(--ink-500)]">{y}</div>
                  </div>
                );
              })}
            </div>
          )}
        </InstitutionalSection>
      </div>

      <InstitutionalSection title="Priorités P1 → P4" accent={DIG}>
        {!profile ? <Skeleton className="h-24" /> : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3" data-testid="priorities">
            {profile.priorites.map((p) => (
              <div key={p.code} className="rounded-[8px] border border-[var(--border)] p-3.5" style={{ borderTop: `3px solid ${DIG}` }}>
                <div className="text-xs font-bold" style={{ color: DIG }}>{p.code} · {p.nom}</div>
                <div className="text-lg font-bold tabular-nums mt-1 text-[var(--ink-900)]">{fmtMillions(p.total)}</div>
                <div className="text-[11px] text-[var(--ink-500)] mt-1">{p.actions} actions · État {fmtMillions(p.etat)} · Bailleurs {fmtMillions(p.bailleur)}</div>
              </div>
            ))}
          </div>
        )}
      </InstitutionalSection>

      <InstitutionalSection title="Axes → Objectifs stratégiques → Orientations" accent={DIG}>
        {!data ? <Skeleton className="h-40" /> : (
          <div className="divide-y divide-[var(--border)] -my-2">
            {axes.map((a) => <AxisBlock key={a.code} axe={a} objectifs={objsByAxe(a.code)} />)}
          </div>
        )}
      </InstitutionalSection>

      <InstitutionalSection title="Indicateurs digitaux" count={indics ? indics.length : undefined} accent={DIG}
        action={<OriginBadge origin="html_reference" status="pending_metfpa_validation" />}>
        {!indics ? <Skeleton className="h-24" /> : (
          <div className="space-y-1.5" data-testid="digital-indicators">
            {indics.map((k, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-[6px] border border-[var(--border)] px-3 py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {k.axe && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[3px]" style={{ color: axisColor(k.axe), background: `${axisColor(k.axe)}14` }}>{k.axe}</span>}
                  <span className="text-[var(--ink-900)] truncate" title={k.libelle}>{k.libelle}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="text-[var(--ink-500)]">Base <strong className="text-[var(--ink-900)]">{k.base}</strong></span>
                  <span className="text-[var(--ink-500)]">Cible <strong className="text-[var(--ink-900)]">{k.cible}</strong></span>
                  {k.valeur_actuelle == null ? <MissingValue label="actuel manquant" /> : <span className="font-semibold text-[var(--ink-900)]">{k.valeur_actuelle}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </InstitutionalSection>
    </div>
  );
}

function AxisBlock({ axe, objectifs }) {
  const [open, setOpen] = useState(true);
  const c = axisColor(axe.code) || DIG;
  return (
    <div data-testid={`dig-axe-${axe.code}`} className="py-2">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center justify-between gap-3 py-1.5 text-left">
        <div className="flex items-center gap-2 min-w-0">
          {open ? <ChevronDown size={16} className="text-[var(--ink-500)]" /> : <ChevronRight size={16} className="text-[var(--ink-500)]" />}
          <span className="text-[11px] font-bold uppercase px-1.5 py-0.5 rounded-[3px]" style={{ color: c, background: `${c}14` }}>{axe.code}</span>
          <span className="text-[14px] font-semibold text-[var(--ink-900)]">{axe.nom}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[var(--ink-500)] tabular-nums">{axe.pct}% · {fmtMillions(axe.budget_total)}</span>
          <OriginBadge origin={axe.data_origin} status={axe.validation_status} />
        </div>
      </button>
      {open && (
        <div className="mt-1.5 space-y-2.5">
          {objectifs.map((o) => (
            <div key={o.code} className="pl-3.5 py-0.5 border-l-2" style={{ borderColor: `${c}55` }}>
              <div className="text-[13px] font-semibold text-[var(--ink-900)]"><span className="text-[var(--ink-500)]">{o.code}</span> · {o.nom}</div>
              <ul className="mt-1 space-y-0.5">
                {(o.orientations || []).map((or, i) => (
                  <li key={i} className="text-[12px] text-[var(--ink-700)] flex gap-1.5 leading-relaxed"><span style={{ color: c }}>›</span>{or}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
