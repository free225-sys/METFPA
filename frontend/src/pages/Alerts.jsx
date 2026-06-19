import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { fmtDate, pillarColor } from "@/lib/format";
import { PillarBadge } from "@/components/PillarBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, BellRing } from "lucide-react";

const ALL = "__all__";
const SEV = {
  critique: { label: "Critique", color: "#C53030" },
  majeur: { label: "Majeur", color: "#FF8200" },
  mineur: { label: "Mineur", color: "#C5A028" },
};
const TYPE_LABELS = { bloque: "Bloqué", retard: "En retard", budget_nul: "Budget nul" };

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }

export default function Alerts() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ pillars: [], owners: [] });
  const [types, setTypes] = useState({ bloque: true, retard: true, budget_nul: true });
  const [pillar, setPillar] = useState(ALL);
  const [owner, setOwner] = useState(ALL);
  const [severity, setSeverity] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    api.get("/alerts").then((r) => setData(r.data));
    api.get("/filters").then((r) => setFilters(r.data));
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.items.filter((a) => {
      if (!types[a.type]) return false;
      if (pillar !== ALL && a.pillar_code !== pillar) return false;
      if (owner !== ALL && a.owner !== owner) return false;
      if (severity !== ALL && a.severity !== severity) return false;
      if (from && new Date(a.end_date) < new Date(from)) return false;
      if (to && new Date(a.end_date) > new Date(to)) return false;
      return true;
    });
  }, [data, types, pillar, owner, severity, from, to]);

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[4px] bg-[#C5303010] flex items-center justify-center pulse-red">
          <BellRing size={18} className="text-[#C53030]" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#1A202C]">Centre d'alertes</h2>
          <p className="text-sm text-[#718096]">Supervision synthétique des actions critiques · {data ? data.total : "—"} alertes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[4px] border border-[#E2E8F0] p-4 flex flex-wrap items-end gap-5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-2">Type d'alerte</div>
          <div className="flex items-center gap-4">
            {Object.keys(TYPE_LABELS).map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm text-[#1A202C] cursor-pointer">
                <Checkbox data-testid={`filter-type-${t}`} checked={types[t]} onCheckedChange={(v) => setTypes({ ...types, [t]: !!v })} />
                {TYPE_LABELS[t]}
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-2">Sévérité</div>
          <div className="flex items-center gap-3">
            {[[ALL, "Toutes"], ["critique", "Critique"], ["majeur", "Majeur"], ["mineur", "Mineur"]].map(([v, l]) => (
              <label key={v} className="flex items-center gap-1.5 text-sm text-[#1A202C] cursor-pointer">
                <input type="radio" name="sev" checked={severity === v} onChange={() => setSeverity(v)} data-testid={`filter-sev-${v}`} className="accent-[#FF8200]" />{l}
              </label>
            ))}
          </div>
        </div>
        <FilterSelect label="Pilier" testid="filter-pillar" value={pillar} onChange={setPillar}
          options={[{ v: ALL, l: "Tous" }, ...filters.pillars.map((p) => ({ v: p.code, l: `P${p.code} · ${p.name}` }))]} />
        <FilterSelect label="Ministère" testid="filter-owner" value={owner} onChange={setOwner}
          options={[{ v: ALL, l: "Tous" }, ...filters.owners.map((o) => ({ v: o, l: o }))]} />
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-2">Échéance (période)</div>
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} data-testid="filter-from" className="h-9 border border-[#E2E8F0] rounded-[6px] px-2 text-sm outline-none" />
            <span className="text-[#A0AEC0]">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} data-testid="filter-to" className="h-9 border border-[#E2E8F0] rounded-[6px] px-2 text-sm outline-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[4px] border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#718096] border-b border-[#E2E8F0]">
                <th className="text-left py-3 px-5">Sévérité</th>
                <th className="text-left py-3 px-3">Code</th>
                <th className="text-left py-3 px-3">Pilier</th>
                <th className="text-left py-3 px-3">Intitulé</th>
                <th className="text-left py-3 px-3 hidden lg:table-cell">Ministère</th>
                <th className="text-left py-3 px-3">Type</th>
                <th className="text-left py-3 px-3">Détail</th>
                <th className="text-left py-3 px-3">Échéance</th>
                <th className="text-right py-3 px-3">Retard</th>
                <th className="text-right py-3 px-5">Action</th>
              </tr>
            </thead>
            <tbody>
              {!data ? [...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-[#E2E8F0]"><td colSpan={10} className="px-5 py-3"><Skeleton className="h-5" /></td></tr>
              )) : rows.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-16 text-[#718096] text-sm">Aucune alerte ne correspond aux filtres.</td></tr>
              ) : rows.map((a, idx) => (
                <tr key={`${a.code}-${a.type}-${idx}`} data-testid={`alert-row-${a.code}-${a.type}`} className="border-b border-[#E2E8F0] hover:bg-[#FFF7ED] transition-colors">
                  <td className="py-3 px-5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: SEV[a.severity].color }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: SEV[a.severity].color }} />{SEV[a.severity].label}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <button onClick={() => navigate(`/arborescence?focus=${a.code}`)} data-testid={`alert-code-${a.code}`}
                      className="text-xs font-mono font-semibold hover:underline" style={{ color: pillarColor(a.pillar_code) }}>{a.code}</button>
                  </td>
                  <td className="py-3 px-3"><PillarBadge code={a.pillar_code} /></td>
                  <td className="py-3 px-3 text-sm text-[#1A202C] max-w-[220px] truncate" title={a.title}>{a.title}</td>
                  <td className="py-3 px-3 text-xs text-[#718096] hidden lg:table-cell max-w-[160px] truncate" title={a.owner}>{a.owner}</td>
                  <td className="py-3 px-3 text-xs text-[#4A5568] whitespace-nowrap">{TYPE_LABELS[a.type]}</td>
                  <td className="py-3 px-3 text-xs text-[#4A5568] max-w-[240px] truncate" title={a.detail}>{a.detail}</td>
                  <td className="py-3 px-3 text-xs text-[#4A5568] whitespace-nowrap" title={fmtDate(a.end_date)}>{fmtDate(a.end_date)}</td>
                  <td className="py-3 px-3 text-right text-sm font-semibold tabular-nums" style={{ color: a.days_late > 0 ? "#C53030" : "#A0AEC0" }}>{a.days_late > 0 ? `${a.days_late} j` : "—"}</td>
                  <td className="py-3 px-5 text-right">
                    <button onClick={() => navigate(`/arborescence?focus=${a.code}`)} data-testid={`view-action-${a.code}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#FF8200] hover:bg-[#FFF7ED] rounded-[6px] px-2.5 py-1.5 transition-colors whitespace-nowrap">
                      Voir l'action <ArrowRight size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <div className="px-5 py-3 border-t border-[#E2E8F0] text-xs text-[#718096]">{rows.length} alerte(s) affichée(s) sur {data.total}</div>}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, testid }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-2">{label}</div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid={testid} className="h-9 w-auto min-w-[140px] max-w-[220px] rounded-[6px] border-[#E2E8F0] text-sm bg-white"><SelectValue /></SelectTrigger>
        <SelectContent className="max-h-[320px]">{options.map((o) => <SelectItem key={o.v} value={o.v} className="text-sm">{o.l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
