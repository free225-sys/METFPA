import React, { useEffect, useMemo, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { fmtMillions, fmtFCFA } from "@/lib/format";
import { frameworkColor } from "@/lib/metfpaTheme";
import { OriginBadge, MissingValue } from "@/components/OriginBadge";
import { DemoBanner } from "@/components/DemoBanner";
import { ChevronRight, Info, Layers, Target, ListChecks, AlertTriangle, Activity } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }

const FW_LABEL = { PND: "PND 4.02", POL: "Politique EFTP", DIG: "Stratégie digitale" };

export default function AccueilIntegre() {
  const [budget, setBudget] = useState(null);
  const [cabinet, setCabinet] = useState(null);
  const [counts, setCounts] = useState(null);
  const [mode, setMode] = useState("total"); // total | annual_average

  useEffect(() => {
    Promise.all([
      metfpaApi.get("/budget/consolidated"),
      metfpaApi.get("/cabinet"),
      metfpaApi.get("/pnd"), metfpaApi.get("/politique"), metfpaApi.get("/digital"),
    ]).then(([b, c, pnd, pol, dig]) => {
      setBudget(b.data); setCabinet(c.data);
      const pn = pnd.data.nodes, po = pol.data.nodes, di = dig.data.nodes;
      const cnt = (arr, lv) => arr.filter((n) => n.niveau === lv).length;
      const orient = di.filter((n) => n.niveau === "objectif").reduce((s, o) => s + (o.orientations?.length || 0), 0);
      setCounts({
        pnd: { effets: cnt(pn, "effet"), produits: cnt(pn, "produit") },
        pol: { axes: cnt(po, "axe"), produits: cnt(po, "produit"), actions: cnt(po, "action") },
        dig: { axes: cnt(di, "axe"), objectifs: cnt(di, "objectif"), orientations: orient,
               ancre: dig.data.profile ? `${dig.data.profile.pnd_ancre} / ${dig.data.profile.pol_ancre}` : "—" },
      });
    });
  }, []);

  const maxVal = useMemo(() => budget ? Math.max(...budget.items.map((i) => i[mode])) : 1, [budget, mode]);

  return (
    <div className="space-y-6 animate-slide-up">
      <DemoBanner />

      {/* Hero */}
      <div className="rounded-[6px] border border-[#E2E8F0] bg-white p-6">
        <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#718096]">Cockpit METFPA intégré</div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">Du PND 4.02 au suivi opérationnel des directions</h1>
        <p className="text-sm text-[#4A5568] mt-2 max-w-3xl">
          Vue intégrée du résultat sectoriel <strong>EFTP (PND 4.02)</strong>, de la <strong>Politique EFTP 2026-2035</strong>,
          de la <strong>Stratégie de digitalisation 2026-2031</strong> et du plan d'action ministériel.
        </p>
      </div>

      {/* Framework budget cards (period-normalized) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold tracking-tight text-[#1A202C]">Budget par cadre — comparaison normalisée</h2>
          <div className="flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-[6px] p-1">
            {[["total", "Total"], ["annual_average", "Moyenne / an"]].map(([v, l]) => (
              <button key={v} data-testid={`budget-mode-${v}`} onClick={() => setMode(v)}
                className={`px-3 py-1 text-xs font-medium rounded-[4px] transition-colors ${mode === v ? "bg-[#1A202C] text-white" : "text-[#4A5568] hover:bg-[#F7F7F5]"}`}>{l}</button>
            ))}
          </div>
        </div>

        {budget && (
          <div className="flex items-start gap-2 rounded-[6px] border border-[#1F6FEB]/30 bg-[#1F6FEB]/8 px-4 py-2.5 mb-3" data-testid="horizon-warning">
            <Info size={15} className="text-[#1F6FEB] shrink-0 mt-0.5" />
            <p className="text-xs text-[#1A4E8A]">{budget.annotation}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {!budget ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-[200px]" />) :
            budget.items.map((f) => {
              const c = frameworkColor(f.framework);
              return (
                <div key={f.framework} data-testid={`framework-card-${f.framework}`}
                  className="bg-white rounded-[4px] border border-[#E2E8F0] p-5" style={{ borderTop: `3px solid ${c}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: c }}>{FW_LABEL[f.framework]}</div>
                      <div className="text-sm font-medium text-[#1A202C] mt-0.5">{f.budget_scope}</div>
                    </div>
                    <OriginBadge origin={f.data_origin} status={f.validation_status} />
                  </div>

                  <div className="mt-4 text-2xl font-bold tabular-nums text-[#1A202C]">{fmtMillions(f[mode])}</div>
                  <div className="text-xs text-[#718096]">{mode === "total" ? "Budget total" : "Moyenne annuelle"} · {fmtFCFA(f[mode])}</div>

                  <div className="mt-4 space-y-1.5 text-xs">
                    <Row k="Période">{f.period} <span className="text-[#A0AEC0]">({f.period_years} ans)</span></Row>
                    <Row k="Total">{fmtMillions(f.total)}</Row>
                    <Row k="Moyenne / an">{fmtMillions(f.annual_average)}</Row>
                    <Row k="Statut"><OriginBadge status={f.validation_status} /></Row>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#E2E8F0] text-[11px] text-[#718096]">Source : {f.source}</div>
                </div>
              );
            })}
        </div>
        <p className="text-[11px] text-[#A0AEC0] mt-2">
          Comparaison <strong>requiert validation client</strong> · exécuté / engagé par activité : <MissingValue label="donnée absente (missing)" />
        </p>
      </div>

      {/* Chaîne de résultats */}
      <div className="bg-white rounded-[4px] border border-[#E2E8F0] p-6">
        <h2 className="text-base font-semibold tracking-tight text-[#1A202C] mb-1">Chaîne de résultats intégrée</h2>
        <p className="text-xs text-[#718096] mb-5">PND 4.02 → Politique EFTP → Stratégie digitale → Plan d'action <OriginBadge origin="html_reference" status="pending_metfpa_validation" /></p>
        {!counts ? <Skeleton className="h-32" /> : (
          <div className="space-y-3">
            <ChainRow color={frameworkColor("PND")} icon={Layers} title="PND 4.02 — résultat sectoriel EFTP"
              steps={["Pilier P4", "Secteur 4.02", `${counts.pnd.effets} Effets`, `${counts.pnd.produits} Produits`]} />
            <ChainRow color={frameworkColor("POL")} icon={Target} title="Politique EFTP 2026-2035"
              steps={[`${counts.pol.axes} Axes`, `${counts.pol.produits} Produits`, `${counts.pol.actions} Actions clés`]} />
            <ChainRow color={frameworkColor("DIG")} icon={Activity} title="Stratégie digitale 2026-2031"
              steps={[`${counts.dig.axes} Axes`, `${counts.dig.objectifs} Objectifs`, `${counts.dig.orientations} Orientations`, `Ancrage ${counts.dig.ancre}`]} />
          </div>
        )}
      </div>

      {/* KPIs opérationnels (démo) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-semibold tracking-tight text-[#1A202C]">Suivi opérationnel</h2>
          <OriginBadge origin="demo_tracking" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {!cabinet ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-[96px]" />) : (
            <>
              <KpiChip icon={ListChecks} label="Activités suivies" value={cabinet.kpis.activites} color="#1F6FEB" />
              <KpiChip icon={AlertTriangle} label="Alertes" value={cabinet.kpis.alertes} color="#C5A028" />
              <KpiChip icon={AlertTriangle} label="Bloquées" value={cabinet.kpis.bloques} color="#C53030" pulse={cabinet.kpis.bloques > 0} />
              <KpiChip icon={AlertTriangle} label="En retard" value={cabinet.kpis.en_retard} color="#FF8200" />
            </>
          )}
        </div>
        {cabinet && <p className="text-[11px] text-[#A0AEC0] mt-2">{cabinet.data_notice}</p>}
      </div>
    </div>
  );
}

function Row({ k, children }) {
  return <div className="flex items-center justify-between"><span className="text-[#718096]">{k}</span><span className="font-semibold text-[#1A202C] tabular-nums">{children}</span></div>;
}

function ChainRow({ color, icon: Icon, title, steps }) {
  return (
    <div className="rounded-[6px] border border-[#E2E8F0] p-3" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} style={{ color }} /><span className="text-sm font-semibold text-[#1A202C]">{title}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <span className="text-xs px-2 py-1 rounded-[4px] font-medium" style={{ color, background: `${color}12` }}>{s}</span>
            {i < steps.length - 1 && <ChevronRight size={13} className="text-[#CBD5E0]" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function KpiChip({ icon: Icon, label, value, color, pulse }) {
  return (
    <div className="bg-white rounded-[4px] border border-[#E2E8F0] p-4">
      <div className="flex items-start justify-between">
        <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#718096]">{label}</div>
        <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center ${pulse ? "pulse-red" : ""}`} style={{ background: `${color}12` }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-[#1A202C]">{value}</div>
    </div>
  );
}
