import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtMillions, PILLAR_COLORS } from "@/lib/format";
import { ElephantMark } from "@/components/icons/Ivorian";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
} from "recharts";

const YEAR_COLORS = ["#FF8200", "#009E49", "#C5A028", "#1A202C", "#E5703B"];

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[8px] ${className}`} />; }

function Tip({ active, payload, label, suffix = "FCFA" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A202C] text-white rounded-[8px] px-3 py-2 text-xs shadow-lg">
      {label && <div className="font-semibold mb-1">{label}</div>}
      {payload.filter((p) => p.dataKey !== "base").map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-white/70">{p.name}:</span>
          <span className="font-semibold tabular-nums">{fmtMillions(Math.abs(p.value))} {suffix}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get("/analytics").then((r) => setData(r.data)); }, []);

  const waterfall = data ? (() => {
    const planned = data.waterfall[0].value;
    const actual = data.waterfall[2].value;
    return [
      { name: "Planifié 2026", base: 0, bar: planned, color: "#FF8200" },
      { name: "Écart", base: actual, bar: planned - actual, color: "#dc2626" },
      { name: "Exécuté 2026", base: 0, bar: actual, color: "#009E49" },
    ];
  })() : [];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Stacked bar */}
      <div className="bg-white rounded-[8px] p-6 border border-[#1A202C]/5 shadow-[0_2px_10px_rgba(26,32,44,0.04)]">
        <div className="flex items-center gap-2 mb-1">
          <ElephantMark size={18} stroke="#C5A028" />
          <h3 className="text-base font-semibold tracking-tight text-[#1A202C]">Budget par pilier et par année</h3>
        </div>
        <p className="text-xs text-[#718096] mb-5">Programmation pluriannuelle 2026-2030 (millions FCFA)</p>
        {!data ? <Skeleton className="h-[340px]" /> : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={data.stacked} margin={{ left: -4, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F5" vertical={false} />
              <XAxis dataKey="pillar" tick={{ fontSize: 12, fill: "#718096" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#718096" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtMillions(v)} width={64} />
              <Tooltip content={<Tip />} cursor={{ fill: "#FFF7ED" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {[2026, 2027, 2028, 2029, 2030].map((y, i) => (
                <Bar key={y} dataKey={String(y)} stackId="a" name={String(y)} fill={YEAR_COLORS[i]} radius={i === 4 ? [4, 4, 0, 0] : 0} maxBarSize={70} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waterfall */}
        <div className="bg-white rounded-[8px] p-6 border border-[#1A202C]/5 shadow-[0_2px_10px_rgba(26,32,44,0.04)]">
          <h3 className="text-base font-semibold tracking-tight text-[#1A202C]">Variance d'exécution 2026</h3>
          <p className="text-xs text-[#718096] mb-5">Écart entre budget planifié et exécuté</p>
          {!data ? <Skeleton className="h-[300px]" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={waterfall} margin={{ left: -4, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F5" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#718096" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#718096" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtMillions(v)} width={64} />
                <Tooltip content={<Tip />} cursor={{ fill: "#FFF7ED" }} />
                <Bar dataKey="base" stackId="w" fill="transparent" />
                <Bar dataKey="bar" stackId="w" name="Montant" radius={[4, 4, 0, 0]} maxBarSize={80}>
                  {waterfall.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Execution rate by sector */}
        <div className="bg-white rounded-[8px] p-6 border border-[#1A202C]/5 shadow-[0_2px_10px_rgba(26,32,44,0.04)]">
          <h3 className="text-base font-semibold tracking-tight text-[#1A202C]">Taux d'exécution par secteur</h3>
          <p className="text-xs text-[#718096] mb-5">Top secteurs · réalisé / programmé 2026 (%)</p>
          {!data ? <Skeleton className="h-[300px]" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.execution.slice(0, 10)} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F5" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#718096" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="sector" tick={{ fontSize: 10, fill: "#4A5568" }} axisLine={false} tickLine={false} width={130} />
                <Tooltip cursor={{ fill: "#FFF7ED" }} content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return <div className="bg-[#1A202C] text-white rounded-[8px] px-3 py-2 text-xs"><div className="font-semibold">{payload[0].payload.sector}</div><div>Taux : {payload[0].value}%</div></div>;
                }} />
                <Bar dataKey="rate" name="Taux" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {data.execution.slice(0, 10).map((d, i) => (
                    <Cell key={i} fill={d.rate >= 70 ? "#009E49" : d.rate >= 40 ? "#C5A028" : "#FF8200"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
