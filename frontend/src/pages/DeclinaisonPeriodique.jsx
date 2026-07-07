import React, { useEffect, useMemo, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DemoBanner } from "@/components/DemoBanner";
import { Layers, CalendarRange, ArrowRight } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function stats(list, decisions) {
  return {
    total: list.length,
    enCours: list.filter((a) => ["En cours", "À l'heure"].includes(a.statut)).length,
    retard: list.filter((a) => a.statut === "En retard").length,
    bloque: list.filter((a) => a.statut === "Bloqué").length,
    acheve: list.filter((a) => a.statut === "Achevé").length,
    decisions: decisions.length,
    directions: [...new Set(list.map((a) => a.direction).filter(Boolean))].sort(),
  };
}

export default function DeclinaisonPeriodique() {
  const [acts, setActs] = useState(null);
  const [decisions, setDecisions] = useState([]);
  useEffect(() => {
    metfpaApi.get("/activities").then((r) => setActs(r.data));
    metfpaApi.get("/decisions").then((r) => setDecisions(r.data)).catch(() => {});
  }, []);

  const year = new Date().getFullYear();
  const curQ = Math.floor(new Date().getMonth() / 3) + 1;

  const data = useMemo(() => {
    const list = acts || [];
    const pendingDec = decisions.filter((d) => ["draft", "pending"].includes(d.status));
    const decQuarter = (d) => {
      const due = (d.due_date || "").slice(0, 7);
      if (!due.startsWith(String(year))) return null;
      return Math.floor((Number(due.slice(5, 7)) - 1) / 3) + 1;
    };
    const quarters = [1, 2, 3, 4].map((q) => {
      const qa = list.filter((a) => a.echeance === `${year}-T${q}`);
      return { key: `${year}-T${q}`, label: `Trimestre ${q} ${year}`, ...stats(qa, pendingDec.filter((d) => decQuarter(d) === q)) };
    });
    const annual = { key: String(year), label: `Plan annuel ${year}`, ...stats(list, pendingDec) };
    // Indicative monthly split of the current quarter (echeance is quarterly in
    // the source data; the monthly view spreads deadlines on the quarter's last
    // month and running actions across the quarter — flagged "indicatif").
    const qActs = list.filter((a) => a.echeance === `${year}-T${curQ}`);
    const months = [0, 1, 2].map((i) => {
      const m = (curQ - 1) * 3 + i;
      const due = i === 2 ? qActs : [];
      const running = qActs.filter((a) => ["En cours", "À l'heure", "En retard", "Bloqué"].includes(a.statut));
      return { label: MONTHS[m], due: due.length, running: running.length };
    });
    return { annual, quarters, months, qActs };
  }, [acts, decisions, year, curQ]);

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-declinaison">
      <Breadcrumb items={[{ label: "Déclinaison périodique" }]} />
      <DemoBanner />
      <div className="rounded-[8px] border border-[#E2E8F0] bg-white p-6">
        <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#1F6FEB]"><Layers size={13} className="inline mr-1" /> Chaîne opérationnelle</div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">Déclinaison périodique du plan d'action</h1>
        <div className="flex items-center flex-wrap gap-2 mt-3 text-sm font-medium text-[#4A5568]" data-testid="declinaison-chain">
          <Chip label={`Plan annuel ${year}`} color="#008751" /> <ArrowRight size={14} className="text-[#CBD5E0]" />
          <Chip label="Plans trimestriels" color="#F47C20" /> <ArrowRight size={14} className="text-[#CBD5E0]" />
          <Chip label="Actions mensuelles" color="#1F6FEB" /> <ArrowRight size={14} className="text-[#CBD5E0]" />
          <Chip label="Suivi hebdomadaire" color="#7C3AED" />
        </div>
        <p className="text-xs text-[#718096] mt-3">Les échéances source sont trimestrielles (format AAAA-Tn) ; la répartition mensuelle est <strong>indicative (démonstration)</strong>.</p>
      </div>

      {!acts ? <Skeleton className="h-40" /> : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3" data-testid="declinaison-cards">
            {[data.annual, ...data.quarters].map((p) => (
              <div key={p.key} className={`rounded-[8px] border p-4 ${p.key.endsWith(`T${curQ}`) ? "border-[#1F6FEB] bg-[#1F6FEB]/[0.04]" : "border-[#E2E8F0] bg-white"}`}>
                <div className="text-[11px] font-bold uppercase tracking-wide text-[#718096]">{p.label}{p.key.endsWith(`T${curQ}`) && <span className="ml-1 text-[#1F6FEB]">· en cours</span>}</div>
                <div className="text-2xl font-bold tabular-nums text-[#1A202C] mt-1">{p.total} <span className="text-xs font-medium text-[#718096]">actions</span></div>
                <div className="text-[11px] text-[#718096] mt-1">{p.acheve} achevées · {p.retard + p.bloque} en difficulté</div>
              </div>
            ))}
          </div>

          {/* Period table */}
          <div className="bg-white rounded-[4px] border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="declinaison-table">
                <thead className="bg-[#F7F7F5] text-[#718096] text-[11px] uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Période</th>
                    <th className="text-center px-4 py-2.5 font-semibold">Actions</th>
                    <th className="text-center px-4 py-2.5 font-semibold">En cours</th>
                    <th className="text-center px-4 py-2.5 font-semibold">En retard</th>
                    <th className="text-center px-4 py-2.5 font-semibold">Bloquées</th>
                    <th className="text-center px-4 py-2.5 font-semibold">Achevées</th>
                    <th className="text-center px-4 py-2.5 font-semibold">Décisions en attente</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Directions responsables</th>
                  </tr>
                </thead>
                <tbody>
                  {[data.annual, ...data.quarters].map((p) => (
                    <tr key={p.key} className={`border-t border-[#E2E8F0] ${p.key === String(year) ? "bg-[#F7F7F5] font-semibold" : "hover:bg-[#F7F7F5]"}`}>
                      <td className="px-4 py-2.5 whitespace-nowrap">{p.label}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums">{p.total}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-[#1F6FEB]">{p.enCours}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-[#FF8200]">{p.retard}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-[#C53030]">{p.bloque}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-[#009E49]">{p.acheve}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-[#C89A2B]">{p.decisions}</td>
                      <td className="px-4 py-2.5 text-xs text-[#4A5568] max-w-[280px]">{p.directions.slice(0, 6).join(", ")}{p.directions.length > 6 ? ` +${p.directions.length - 6}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Current quarter monthly breakdown (indicative) */}
          <div className="bg-white rounded-[8px] border border-[#E2E8F0] p-5" data-testid="declinaison-mois">
            <h2 className="text-sm font-semibold text-[#1A202C] flex items-center gap-2 mb-3"><CalendarRange size={15} className="text-[#1F6FEB]" /> Trimestre en cours (T{curQ}) — vue mensuelle indicative · {data.qActs.length} actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.months.map((m) => (
                <div key={m.label} className="rounded-[6px] border border-[#E2E8F0] p-3.5">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-[#718096]">{m.label}</div>
                  <div className="text-sm text-[#4A5568] mt-1.5">{m.running} action(s) en exécution</div>
                  <div className="text-sm mt-0.5" style={{ color: m.due ? "#FF8200" : "#A0AEC0" }}>{m.due ? `${m.due} échéance(s) de fin de trimestre` : "Aucune échéance"}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#A0AEC0] mt-3">Le suivi fin (hebdomadaire) est disponible dans le module <strong>Suivi hebdomadaire</strong>.</p>
          </div>
        </>
      )}
    </div>
  );
}

function Chip({ label, color }) {
  return <span className="text-xs font-semibold px-2.5 py-1 rounded-[5px]" style={{ color, background: `${color}14`, border: `1px solid ${color}40` }}>{label}</span>;
}
