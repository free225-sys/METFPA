import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtMillions, pillarColor, PILLAR_SHORT } from "@/lib/format";
import { ElephantMark } from "@/components/icons/Ivorian";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ReferenceLine,
} from "recharts";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }

function GroupTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A202C] text-white rounded-[6px] px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/70">P{p.name} · {PILLAR_SHORT[p.name]}:</span>
          <span className="font-semibold tabular-nums">{fmtMillions(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/analytics").then((r) => setData(r.data)); }, []);

  const years = [2026, 2027, 2028, 2029, 2030];
  const grouped = data ? years.map((y) => {
    const row = { year: String(y) };
    data.stacked.forEach((s) => { row[s.code] = s[String(y)]; });
    return row;
  }) : [];
  const pillarCodes = data ? data.stacked.map((s) => s.code) : [];

  const variance = data ? (() => {
    const { planned, actual } = data.variance;
    const gap = planned ? ((actual - planned) / planned) * 100 : 0;
    return { planned, actual, gap, rows: [{ name: "Planifié 2026", value: planned, color: "#94A3B8" }, { name: "Exécuté 2026", value: actual, color: "#009E49" }] };
  })() : null;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="bg-white rounded-[4px] p-6 border border-[#E2E8F0]">
        <div className="flex items-center gap-2 mb-1">
          <ElephantMark size={18} stroke="#C5A028" />
          <h3 className="text-base font-semibold tracking-tight text-[#1A202C]">Budget par pilier et par année</h3>
        </div>
        <p className="text-xs text-[#718096] mb-5">Comparaison des piliers · 2026-2030 (millions FCFA)</p>
        {!data ? <Skeleton className="h-[340px]" /> : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={grouped} margin={{ left: -4, right: 8 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F5" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#718096" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#718096" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtMillions(v)} width={64} />
              <Tooltip content={<GroupTip />} cursor={{ fill: "#F7F7F5" }} />
              {pillarCodes.map((c) => <Bar key={c} dataKey={c} name={c} fill={pillarColor(c)} radius={[3, 3, 0, 0]} maxBarSize={26} />)}
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4">
          {pillarCodes.map((c) => (
            <div key={c} className="flex items-center gap-1.5 text-xs text-[#4A5568]">
              <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: pillarColor(c) }} />P{c} · {PILLAR_SHORT[c]}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[4px] p-6 border border-[#E2E8F0]">
          <h3 className="text-base font-semibold tracking-tight text-[#1A202C]">Variance d'exécution 2026</h3>
          <p className="text-xs text-[#718096] mb-2">Budget planifié vs exécuté</p>
          {!variance ? <Skeleton className="h-[300px]" /> : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-sm font-bold ${variance.gap < 0 ? "text-[#C53030] bg-[#C5303010]" : "text-[#006B3F] bg-[#006B3F10]"}`}>
                  {variance.gap < 0 ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                  {Math.abs(variance.gap).toFixed(1)}%
                </span>
                <span className="text-xs text-[#718096]">d'écart par rapport au budget planifié</span>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={variance.rows} margin={{ left: -4, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F5" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#718096" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#718096" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtMillions(v)} width={64} />
                  <Tooltip cursor={{ fill: "#F7F7F5" }} content={({ active, payload }) => active && payload?.length ? (
                    <div className="bg-[#1A202C] text-white rounded-[6px] px-3 py-2 text-xs">{payload[0].payload.name}: {fmtMillions(payload[0].value)} FCFA</div>
                  ) : null} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={90}>
                    {variance.rows.map((r, i) => <Cell key={i} fill={r.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        <div className="bg-white rounded-[4px] p-6 border border-[#E2E8F0]">
          <h3 className="text-base font-semibold tracking-tight text-[#1A202C]">Taux d'exécution par secteur</h3>
          <p className="text-xs text-[#718096] mb-5">Secteurs les plus en retard · seuil cible 80% (—)</p>
          {!data ? <Skeleton className="h-[300px]" /> : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.execution.slice(0, 12)} layout="vertical" margin={{ left: 8, right: 28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F5" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#718096" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="sector" tick={{ fontSize: 10, fill: "#4A5568" }} axisLine={false} tickLine={false} width={135} />
                <Tooltip cursor={{ fill: "#F7F7F5" }} content={({ active, payload }) => active && payload?.length ? (
                  <div className="bg-[#1A202C] text-white rounded-[6px] px-3 py-2 text-xs"><div className="font-semibold">{payload[0].payload.sector}</div><div>Taux : {payload[0].value}%</div></div>
                ) : null} />
                <ReferenceLine x={80} stroke="#1A202C" strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={16}>
                  {data.execution.slice(0, 12).map((d, i) => <Cell key={i} fill={pillarColor(d.pillar_code)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
