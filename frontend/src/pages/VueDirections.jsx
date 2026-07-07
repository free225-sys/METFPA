import React, { useEffect, useMemo, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DemoBanner } from "@/components/DemoBanner";
import { useAuth, isDircab, isAdmin } from "@/context/AuthContext";
import { getRelances, addRelance, subscribeDemoStore } from "@/lib/demoStore";
import { toast } from "sonner";
import { Users2, Send, AlertTriangle } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }

export default function VueDirections() {
  const { user } = useAuth();
  const canRelancer = isDircab(user?.role) || isAdmin(user?.role);
  const [acts, setActs] = useState(null);
  const [, tick] = useState(0);
  useEffect(() => {
    metfpaApi.get("/activities").then((r) => setActs(r.data));
    return subscribeDemoStore(() => tick((t) => t + 1));
  }, []);

  const relances = getRelances();
  const rows = useMemo(() => {
    const grp = {};
    (acts || []).forEach((a) => {
      const d = a.direction || "Sans direction";
      const g = grp[d] = grp[d] || { direction: d, total: 0, enCours: 0, retard: 0, bloque: 0, acheve: 0, alerte: 0, avancement: 0 };
      g.total += 1;
      if (["En cours", "À l'heure"].includes(a.statut)) g.enCours += 1;
      if (a.statut === "En retard") g.retard += 1;
      if (a.statut === "Bloqué") g.bloque += 1;
      if (a.statut === "Achevé") g.acheve += 1;
      if (a.alerte) g.alerte += 1;
      g.avancement += a.avancement || 0;
    });
    return Object.values(grp).map((g) => ({
      ...g,
      avancementMoyen: g.total ? Math.round(g.avancement / g.total) : 0,
      relancesOuvertes: relances.filter((r) => r.direction === g.direction && r.statut === "ouverte").length,
      aRelancer: g.retard + g.bloque > 0 || relances.some((r) => r.direction === g.direction && r.statut === "ouverte"),
    })).sort((a, b) => (b.retard + b.bloque) - (a.retard + a.bloque) || b.total - a.total);
  }, [acts, relances]);

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-vue-directions">
      <Breadcrumb items={[{ label: "Vue par Direction" }]} />
      <DemoBanner />
      <div className="rounded-[8px] border border-[#E2E8F0] bg-white p-6">
        <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7C3AED]"><Users2 size={13} className="inline mr-1" /> Responsabilisation des structures</div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">Vue par Direction</h1>
        <p className="text-sm text-[#4A5568] mt-2 max-w-3xl">Portefeuille et niveau d'exécution de chaque direction responsable. Les directions en difficulté (retards/blocages) remontent en tête. Relances : <strong>démonstration (stockage local)</strong>.</p>
      </div>

      {!acts ? <Skeleton className="h-40" /> : (
        <div className="bg-white rounded-[4px] border border-[#E2E8F0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="directions-table">
              <thead className="bg-[#F7F7F5] text-[#718096] text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Direction</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Actions</th>
                  <th className="text-center px-4 py-2.5 font-semibold">En cours</th>
                  <th className="text-center px-4 py-2.5 font-semibold">En retard</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Bloquées</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Achevées</th>
                  <th className="text-left px-4 py-2.5 font-semibold min-w-[140px]">Avancement moyen</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Alertes</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Suivi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g) => (
                  <tr key={g.direction} data-testid={`direction-row-${g.direction}`} className={`border-t border-[#E2E8F0] hover:bg-[#F7F7F5] ${g.aRelancer ? "bg-[#7C3AED]/[0.03]" : ""}`}>
                    <td className="px-4 py-2.5 font-semibold text-[#1A202C] whitespace-nowrap">
                      {g.direction}
                      {g.aRelancer && <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-[3px] bg-[#7C3AED]/10 text-[#5B21B6]">à suivre</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center tabular-nums">{g.total}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-[#1F6FEB]">{g.enCours}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-[#FF8200]">{g.retard}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-[#C53030]">{g.bloque}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-[#009E49]">{g.acheve}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden"><div className="h-full rounded-full bg-[#009E49]" style={{ width: `${g.avancementMoyen}%` }} /></div>
                        <span className="text-xs tabular-nums w-9 text-right">{g.avancementMoyen}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">{g.alerte > 0 ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C53030]"><AlertTriangle size={11} /> {g.alerte}</span> : <span className="text-[#CBD5E0]">—</span>}</td>
                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                      {g.relancesOuvertes > 0 && <span className="text-[11px] font-semibold text-[#D97706] mr-1.5">{g.relancesOuvertes} relance(s)</span>}
                      {canRelancer && (
                        <button data-testid={`relance-direction-${g.direction}`} title="Affecter une relance (démo)"
                          onClick={() => { addRelance({ direction: g.direction, objet: "Relance de suivi hebdomadaire", source: "vue directions" }); toast.success("Relance affectée (démo)", { description: g.direction }); }}
                          className="w-7 h-7 rounded-[4px] text-[#D97706] hover:bg-[#D97706]/10 inline-flex items-center justify-center"><Send size={14} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
