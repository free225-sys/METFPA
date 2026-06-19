import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtMillions, fmtFCFA } from "@/lib/format";
import { ProgressBar } from "@/components/ProgressBar";
import { Landmark, AlertTriangle } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }

function execColor(r) { return r >= 80 ? "#006B3F" : r >= 50 ? "#C5A028" : "#C53030"; }

export default function Ministries() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/ministries").then((r) => setData(r.data)); }, []);

  const totalBudget = data ? data.reduce((s, m) => s + m.total_budget, 0) : 0;
  const totalActions = data ? data.reduce((s, m) => s + m.count, 0) : 0;
  const totalAlerts = data ? data.reduce((s, m) => s + m.alerts, 0) : 0;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Ministères pilotes" value={data ? data.length : "—"} icon={Landmark} accent="#FF8200" />
        <Stat label="Actions pilotées" value={totalActions || "—"} icon={Landmark} accent="#006B3F" />
        <Stat label="Budget consolidé" value={data ? fmtMillions(totalBudget) : "—"} icon={Landmark} accent="#C5A028" />
        <Stat label="Alertes ouvertes" value={totalAlerts || "—"} icon={AlertTriangle} accent="#C53030" pulse={totalAlerts > 0} />
      </div>

      <div className="bg-white rounded-[4px] border border-[#E2E8F0] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0]">
          <h3 className="text-base font-semibold tracking-tight text-[#1A202C]">Suivi consolidé par ministère responsable</h3>
          <p className="text-xs text-[#718096] mt-0.5">Budget, avancement et taux d'exécution 2026 par maître d'ouvrage</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#718096] border-b border-[#E2E8F0]">
                <th className="text-left py-3 px-6">Ministère responsable</th>
                <th className="text-right py-3 px-3">Actions</th>
                <th className="text-right py-3 px-3">Budget total</th>
                <th className="text-left py-3 px-4 w-44">Avancement</th>
                <th className="text-left py-3 px-4 w-44">Taux d'exécution 2026</th>
                <th className="text-right py-3 px-6">Alertes</th>
              </tr>
            </thead>
            <tbody>
              {!data ? [...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-[#E2E8F0]"><td colSpan={6} className="px-6 py-3"><Skeleton className="h-5" /></td></tr>
              )) : data.map((m) => (
                <tr key={m.owner} data-testid={`ministry-row-${m.owner}`} className="border-b border-[#E2E8F0] hover:bg-[#FFF7ED] transition-colors">
                  <td className="py-3.5 px-6 text-sm font-medium text-[#1A202C] max-w-[320px]" title={m.owner}>{m.owner}</td>
                  <td className="py-3.5 px-3 text-right text-sm tabular-nums text-[#4A5568]">{m.count}</td>
                  <td className="py-3.5 px-3 text-right text-sm font-semibold tabular-nums text-[#1A202C] whitespace-nowrap">{fmtMillions(m.total_budget)}</td>
                  <td className="py-3.5 px-4"><ProgressBar value={m.progress} showLabel /></td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-full bg-[#EDEEF0] h-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, m.exec_rate)}%`, background: execColor(m.exec_rate) }} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums w-10 text-right" style={{ color: execColor(m.exec_rate) }}>{m.exec_rate}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    {m.alerts > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#C53030] bg-[#C5303010] rounded-[4px] px-2 py-1">
                        <AlertTriangle size={12} /> {m.alerts}
                      </span>
                    ) : <span className="text-xs text-[#A0AEC0]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, accent, pulse }) {
  return (
    <div className="bg-white rounded-[4px] p-5 border border-[#E2E8F0]">
      <div className="flex items-start justify-between">
        <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#718096]">{label}</div>
        <div className={`w-9 h-9 rounded-[4px] flex items-center justify-center ${pulse ? "pulse-red" : ""}`} style={{ background: `${accent}12` }}>
          <Icon size={17} strokeWidth={1.9} style={{ color: accent }} />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-[#1A202C] tabular-nums">{value}</div>
    </div>
  );
}
