import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { fmtMillions, fmtFCFA, fmtDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, Search, X, Building2, Calendar, Target, Banknote,
} from "lucide-react";

const LEVEL_META = {
  pillar: { color: "#FF8200" },
  sector: { color: "#009E49" },
  effect: { color: "#C5A028" },
  product: { color: "#4A5568" },
  action: { color: "#1A202C" },
};

function flattenActions(nodes, acc = []) {
  for (const n of nodes) {
    if (n.level === "action") acc.push(n);
    else if (n.children) flattenActions(n.children, acc);
  }
  return acc;
}

// Build a flat list of visible rows based on expanded set (no recursive component)
function buildVisibleRows(nodes, expanded, depth = 0, acc = []) {
  for (const node of nodes) {
    acc.push({ node, depth });
    if (node.level !== "action" && expanded.has(node.code) && node.children?.length) {
      buildVisibleRows(node.children, expanded, depth + 1, acc);
    }
  }
  return acc;
}

export default function TreeView() {
  const [tree, setTree] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [query, setQuery] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);

  useEffect(() => {
    api.get("/tree").then((r) => {
      setTree(r.data);
      setExpanded(new Set(r.data.map((p) => p.code)));
    });
  }, []);

  const allActions = useMemo(() => (tree ? flattenActions(tree) : []), [tree]);
  const visibleRows = useMemo(
    () => (tree ? buildVisibleRows(tree, expanded) : []),
    [tree, expanded]
  );
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allActions.filter((a) => a.name.toLowerCase().includes(q) || a.code.includes(q)).slice(0, 8);
  }, [query, allActions]);

  const toggle = (code) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const openAction = async (code) => {
    setSelected(code);
    setDetail(null);
    const { data } = await api.get(`/actions/${code}`);
    setDetail(data);
  };

  const jumpTo = (action) => {
    const parts = action.code.split(".");
    const codes = [parts[0], `${parts[0]}.${parts[1]}`, `${parts[0]}.${parts[1]}.${parts[2]}`,
      `${parts[0]}.${parts[1]}.${parts[2]}.${parts[3]}`];
    setExpanded((prev) => new Set([...prev, ...codes]));
    setQuery("");
    setShowSuggest(false);
    openAction(action.code);
  };

  return (
    <div className="animate-slide-up">
      {/* Search autocomplete */}
      <div className="relative mb-5 max-w-xl">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0AEC0]" />
        <input
          data-testid="tree-search-input"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowSuggest(true); }}
          onFocus={() => setShowSuggest(true)}
          placeholder="Rechercher une action par intitulé ou code…"
          className="w-full h-11 pl-10 pr-3 rounded-[8px] bg-white border border-[#E2E8F0] focus:border-[#FF8200] focus:ring-2 focus:ring-[#FF8200]/15 outline-none text-sm transition-all shadow-[0_2px_10px_rgba(26,32,44,0.04)]"
        />
        {showSuggest && suggestions.length > 0 && (
          <div className="absolute z-20 mt-2 w-full bg-white rounded-[8px] border border-[#E2E8F0] shadow-lg overflow-hidden">
            {suggestions.map((s) => (
              <button key={s.code} onClick={() => jumpTo(s)} data-testid={`suggest-${s.code}`}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#FFF7ED] text-left transition-colors">
                <span className="text-[10px] font-mono font-semibold text-[#FF8200] w-20 shrink-0">{s.code}</span>
                <span className="text-sm text-[#1A202C] truncate flex-1">{s.name}</span>
                <StatusBadge status={s.status} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-[8px] border border-[#1A202C]/5 shadow-[0_2px_10px_rgba(26,32,44,0.04)] p-3">
        <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-[#718096]">
          <span className="w-4" /><span className="w-1.5" /><span className="w-20">Code</span>
          <span className="flex-1">Intitulé</span>
          <span className="w-24 hidden md:block text-center">Avancement</span>
          <span className="w-20 text-right">Budget</span>
        </div>
        {!tree ? (
          <div className="space-y-2 p-2">
            {[...Array(8)].map((_, i) => <div key={i} className="h-9 animate-pulse bg-[#E2E8F0] rounded-[8px]" />)}
          </div>
        ) : (
          visibleRows.map(({ node, depth }) => {
            const meta = LEVEL_META[node.level];
            const isAction = node.level === "action";
            const isOpen = expanded.has(node.code);
            const hasChildren = node.children && node.children.length > 0;
            return (
              <div
                key={node.code}
                data-testid={`tree-node-${node.level}-${node.code}`}
                onClick={() => (isAction ? openAction(node.code) : toggle(node.code))}
                className={`flex items-center gap-2 py-2 pr-3 rounded-[8px] cursor-pointer transition-colors ${
                  selected === node.code ? "bg-[#FFF7ED]" : "hover:bg-[#F7F7F5]"
                }`}
                style={{ paddingLeft: depth * 20 + 8 }}>
                <span className="w-4 shrink-0 flex justify-center">
                  {hasChildren && !isAction && (
                    <ChevronRight size={15} className={`text-[#A0AEC0] transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  )}
                </span>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
                <span className="text-[10px] font-mono font-semibold shrink-0 w-20" style={{ color: meta.color }}>{node.code}</span>
                <span className={`text-sm truncate flex-1 ${isAction ? "text-[#4A5568]" : "text-[#1A202C] font-medium"}`}>{node.name}</span>
                {isAction && <StatusBadge status={node.status} />}
                <div className="w-24 shrink-0 hidden md:block"><ProgressBar value={node.progress} height={6} /></div>
                <span className="text-xs font-semibold tabular-nums text-[#718096] w-20 text-right shrink-0">{fmtMillions(node.budget)}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Slide-in detail panel */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)} className="fixed inset-0 bg-[#1A202C]/30 z-40" />
            <motion.div
              data-testid="action-detail-panel"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
              className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white z-50 shadow-2xl overflow-y-auto">
              {!detail ? (
                <div className="p-8 space-y-4">{[...Array(6)].map((_, i) => <div key={i} className="h-12 animate-pulse bg-[#E2E8F0] rounded-[8px]" />)}</div>
              ) : (
                <div>
                  <div className="sticky top-0 bg-white border-b border-[#E2E8F0] px-6 py-5 flex items-start justify-between">
                    <div>
                      <div className="text-[10px] font-mono font-semibold text-[#FF8200]">{detail.code}</div>
                      <h2 className="text-lg font-bold tracking-tight text-[#1A202C] mt-1 pr-4">{detail.title}</h2>
                    </div>
                    <button onClick={() => setSelected(null)} data-testid="close-panel-button"
                      className="text-[#A0AEC0] hover:text-[#1A202C] transition-colors shrink-0">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <StatusBadge status={detail.status} />
                      <span className="text-2xl font-bold tabular-nums text-[#1A202C]">{detail.progress}%</span>
                    </div>
                    <ProgressBar value={detail.progress} height={10} />

                    {detail.blocked_reason && (
                      <div className="bg-red-50 border border-red-100 rounded-[8px] p-3 text-sm text-red-700">
                        <span className="font-semibold">Motif de blocage : </span>{detail.blocked_reason}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <Info icon={Building2} label="Maître d'ouvrage" value={detail.owner} />
                      <Info icon={Banknote} label="Budget total" value={fmtFCFA(detail.total_budget)} />
                      <Info icon={Calendar} label="Début" value={fmtDate(detail.start_date)} />
                      <Info icon={Calendar} label="Échéance" value={fmtDate(detail.end_date)} />
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-2">Hiérarchie</div>
                      <div className="space-y-1.5 text-sm">
                        <HierRow color="#FF8200" label="Pilier" value={detail.pillar_name} />
                        <HierRow color="#009E49" label="Secteur" value={detail.sector_name} />
                        <HierRow color="#C5A028" label="Effet" value={detail.effect_name} />
                        <HierRow color="#4A5568" label="Produit" value={detail.product_name} />
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-2">Budget annuel (M FCFA)</div>
                      <div className="grid grid-cols-5 gap-2">
                        {Object.entries(detail.budget).map(([y, v]) => (
                          <div key={y} className="bg-[#F7F7F5] rounded-[8px] p-2 text-center">
                            <div className="text-[10px] text-[#718096] font-semibold">{y}</div>
                            <div className="text-xs font-bold text-[#1A202C] tabular-nums mt-0.5">{v.toLocaleString("fr-FR")}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-2 flex items-center gap-1.5">
                        <Target size={13} /> Indicateurs (KPIs)
                      </div>
                      <div className="space-y-1.5">
                        {detail.kpis.map((kpi, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-[#4A5568] bg-[#F7F7F5] rounded-[8px] px-3 py-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A028]" />{kpi}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="bg-[#F7F7F5] rounded-[8px] p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-[#718096]">
        <Icon size={12} />{label}
      </div>
      <div className="text-sm font-medium text-[#1A202C] mt-1 leading-snug">{value}</div>
    </div>
  );
}

function HierRow({ color, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-[#718096] w-16 shrink-0 text-xs">{label}</span>
      <span className="text-[#1A202C] truncate">{value}</span>
    </div>
  );
}
