import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtFCFA, fmtMillions, pillarColor, PILLAR_COLOR } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { PillarBadge } from "@/components/PillarBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { ElephantMark } from "@/components/icons/Ivorian";
import { Wallet, TrendingUp, Gauge, ListChecks, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Area, ComposedChart,
} from "recharts";

const ALL = "__all__";

function KpiCard({ icon: Icon, label, value, sub, accent, pulse, testid }) {
  return (
    <div data-testid={testid}
      className="bg-white rounded-[4px] p-5 border border-[#E2E8F0] hover:border-[#CBD5E0] transition-colors">
      <div className="flex items-start justify-between">
        <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#718096]">{label}</div>
        <div className={`w-9 h-9 rounded-[4px] flex items-center justify-center ${pulse ? "pulse-red" : ""}`}
          style={{ background: pulse ? "#C5303010" : `${accent}12` }}>
          <Icon size={17} strokeWidth={1.9} style={{ color: pulse ? "#C53030" : accent }} />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-[#1A202C] tabular-nums">{value}</div>
      {sub && <div className="text-xs text-[#718096] mt-1">{sub}</div>}
    </div>
  );
}

function ChartTooltip({ active, payload, label, suffix }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A202C] text-white rounded-[6px] px-3 py-2 text-xs shadow-lg">
      {label && <div className="font-semibold mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span className="text-white/70">{p.name}:</span>
          <span className="font-semibold tabular-nums">{fmtMillions(p.value)} {suffix}</span>
        </div>
      ))}
    </div>
  );
}

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }

export default function Dashboard() {
  const [filters, setFilters] = useState({ pillars: [], sectors: [], owners: [], years: [] });
  const [pillar, setPillar] = useState(ALL);
  const [sector, setSector] = useState(ALL);
  const [owner, setOwner] = useState(ALL);
  const [year, setYear] = useState(ALL);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get("/filters").then((r) => setFilters(r.data)); }, []);
  useEffect(() => {
    setLoading(true);
    const params = {};
    if (pillar !== ALL) params.pillar = pillar;
    if (sector !== ALL) params.sector = sector;
    if (owner !== ALL) params.owner = owner;
    if (year !== ALL) params.year = year;
    api.get("/dashboard", { params }).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [pillar, sector, owner, year]);

  const sectorOptions = filters.sectors.filter((s) => pillar === ALL || s.pillar_code === pillar);
  const k = data?.kpis;
  const donutTotal = data ? data.donut.reduce((s, d) => s + d.value, 0) : 0;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-[4px] p-3 border border-[#E2E8F0]">
        <span className="text-xs font-semibold tracking-[0.05em] uppercase text-[#718096] px-2">Filtres</span>
        <FilterSelect testid="filter-pillar" value={pillar} onChange={(v) => { setPillar(v); setSector(ALL); }}
          options={[{ v: ALL, l: "Tous les piliers" }, ...filters.pillars.map((p) => ({ v: p.code, l: `P${p.code} · ${p.name}` }))]} />
        <FilterSelect testid="filter-sector" value={sector} onChange={setSector}
          options={[{ v: ALL, l: "Tous les secteurs" }, ...sectorOptions.map((s) => ({ v: s.code, l: s.name }))]} />
        <FilterSelect testid="filter-owner" value={owner} onChange={setOwner}
          options={[{ v: ALL, l: "Tous les ministères" }, ...filters.owners.map((o) => ({ v: o, l: o }))]} />
        <FilterSelect testid="filter-year" value={year} onChange={setYear}
          options={[{ v: ALL, l: "Toutes les années" }, ...filters.years.map((y) => ({ v: String(y), l: String(y) }))]} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {loading || !k ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-[116px]" />) : (
          <>
            <KpiCard testid="kpi-card-budget" icon={Wallet} label="Budget total" accent="#FF8200" value={fmtMillions(k.total_budget)} sub={fmtFCFA(k.total_budget)} />
            <KpiCard testid="kpi-card-spent" icon={TrendingUp} label="Exécuté 2026" accent="#009E49" value={fmtMillions(k.spent)} sub={`Taux ${k.execution_rate}%`} />
            <KpiCard testid="kpi-card-progress" icon={Gauge} label="Avancement global" accent="#C5A028" value={`${k.global_progress}%`} sub="Pondéré par le budget" />
            <KpiCard testid="kpi-card-actions" icon={ListChecks} label="Actions" accent="#006B3F" value={k.total_actions} sub="Inscrites au plan" />
            <KpiCard testid="kpi-card-late" icon={AlertTriangle} label="Actions en retard" accent="#C53030" value={k.late_actions} sub="À surveiller" pulse={k.late_actions > 0} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[4px] p-6 border border-[#E2E8F0]">
          <div className="flex items-center gap-2 mb-1">
            <ElephantMark size={18} stroke="#C5A028" />
            <h3 className="text-base font-semibold tracking-tight text-[#1A202C]">Répartition par pilier</h3>
          </div>
          <p className="text-xs text-[#718096] mb-4">Budget total programmé 2026-2030</p>
          {loading || !data ? <Skeleton className="h-[220px]" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.donut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
                  {data.donut.map((d) => <Cell key={d.code} fill={pillarColor(d.code)} />)}
                </Pie>
                <Tooltip content={<ChartTooltip suffix="FCFA" />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="grid grid-cols-1 gap-1.5 mt-3">
            {data?.donut.map((d) => {
              const pct = donutTotal ? ((d.value / donutTotal) * 100).toFixed(1) : 0;
              return (
                <div key={d.code} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ background: pillarColor(d.code) }} />
                  <span className="text-[#4A5568] truncate flex-1">P{d.code} · {d.name}</span>
                  <span className="font-semibold tabular-nums text-[#1A202C]">{pct}%</span>
                  <span className="tabular-nums text-[#718096] w-16 text-right">{fmtMillions(d.value)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-[4px] p-6 border border-[#E2E8F0]">
          <h3 className="text-base font-semibold tracking-tight text-[#1A202C]">Trajectoire budgétaire cumulée</h3>
          <p className="text-xs text-[#718096] mb-4">Programmé vs Exécuté · 2026-2030 (millions FCFA)</p>
          {loading || !data ? <Skeleton className="h-[300px]" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.trajectory} margin={{ left: -8, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gExec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#009E49" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#009E49" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F5" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#718096" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#718096" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtMillions(v)} width={70} />
                <Tooltip content={<ChartTooltip suffix="FCFA" />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="planned" name="Programmé" stroke="#FF8200" strokeWidth={2.5} strokeDasharray="6 5" dot={{ r: 3, fill: "#FF8200" }} />
                <Area type="monotone" dataKey="actual" name="Exécuté" stroke="#009E49" strokeWidth={2.8} fill="url(#gExec)" dot={{ r: 4, fill: "#009E49" }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[4px] border border-[#E2E8F0] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h3 className="text-base font-semibold tracking-tight text-[#1A202C]">Top 10 des actions prioritaires</h3>
          <span className="text-xs text-[#718096]">Par budget programmé</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white text-[10px] font-semibold uppercase tracking-[0.05em] text-[#718096] border-b border-[#E2E8F0]">
                <th className="text-left py-3 px-6">Code</th>
                <th className="text-left py-3 px-4">Pilier</th>
                <th className="text-left py-3 px-4">Intitulé</th>
                <th className="text-left py-3 px-4 hidden md:table-cell">Ministère responsable</th>
                <th className="text-right py-3 px-4">Budget</th>
                <th className="text-left py-3 px-4 w-40">Avancement</th>
                <th className="text-left py-3 px-6">Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading || !data ? [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-[#E2E8F0]"><td colSpan={7} className="px-6 py-3"><Skeleton className="h-5" /></td></tr>
              )) : data.top_actions.map((a) => (
                <tr key={a.code} className="border-b border-[#E2E8F0] hover:bg-[#FFF7ED] transition-colors">
                  <td className="py-3.5 px-6 text-xs font-mono font-semibold" style={{ color: pillarColor(a.pillar_code) }}>{a.code}</td>
                  <td className="py-3.5 px-4"><PillarBadge code={a.pillar_code} /></td>
                  <td className="py-3.5 px-4 text-sm text-[#1A202C] max-w-xs truncate" title={a.title}>{a.title}</td>
                  <td className="py-3.5 px-4 text-xs text-[#718096] hidden md:table-cell max-w-[200px] truncate" title={a.owner}>{a.owner}</td>
                  <td className="py-3.5 px-4 text-sm font-semibold text-[#1A202C] text-right tabular-nums whitespace-nowrap">{fmtMillions(a.total_budget)}</td>
                  <td className="py-3.5 px-4"><ProgressBar value={a.progress} showLabel /></td>
                  <td className="py-3.5 px-6"><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options, testid }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-testid={testid} className="h-9 w-auto min-w-[160px] max-w-[260px] rounded-[6px] border-[#E2E8F0] text-sm bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-[320px]">
        {options.map((o) => <SelectItem key={o.v} value={o.v} className="text-sm">{o.l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
