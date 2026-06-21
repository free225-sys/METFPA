import React, { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Zap } from "lucide-react";
import { fmtMillions } from "@/lib/format";

const NIVEAU_LABEL = {
  secteur: "Secteur", effet: "Effet", produit: "Produit",
  axe: "Axe", action: "Action", objectif: "Objectif",
};

export function buildChildrenMap(nodes) {
  const codes = new Set(nodes.map((n) => n.code));
  const byParent = {};
  nodes.forEach((n) => {
    const p = n.parent_code && codes.has(n.parent_code) ? n.parent_code : "__root__";
    if (!byParent[p]) byParent[p] = [];
    byParent[p].push(n);
  });
  return byParent;
}

export function HierTree({ nodes, color, expandDepth = 1, highlightCodes = [] }) {
  const byParent = useMemo(() => buildChildrenMap(nodes), [nodes]);
  const [collapsed, setCollapsed] = useState({});

  const visible = useMemo(() => {
    const out = [];
    const walk = (parentKey, depth) => {
      const kids = byParent[parentKey] || [];
      for (const node of kids) {
        const hasKids = (byParent[node.code] || []).length > 0;
        const isOpen = collapsed[node.code] === undefined ? depth < expandDepth : !collapsed[node.code];
        out.push({ node, depth, hasKids, isOpen });
        if (hasKids && isOpen) walk(node.code, depth + 1);
      }
    };
    walk("__root__", 0);
    return out;
  }, [byParent, collapsed, expandDepth]);

  const toggle = (code) => setCollapsed((c) => {
    const cur = c[code] === undefined ? false : c[code];
    return { ...c, [code]: !cur };
  });

  return (
    <div data-testid="hier-tree" className="space-y-1">
      {visible.map(({ node, depth, hasKids, isOpen }) => {
        const isAnchor = highlightCodes.includes(node.code) || node.ancre_digital === true;
        const budget = node.budget_total != null ? node.budget_total : node.budget;
        const childCount = (byParent[node.code] || []).length;
        return (
          <div key={node.code} data-testid={`tree-node-${node.code}`}
            className={`flex items-start gap-2 rounded-[6px] border px-3 py-2.5 transition-colors ${
              isAnchor ? "border-[#1F6FEB]/50 bg-[#1F6FEB]/6" : "border-[#E2E8F0] bg-white hover:bg-[#F7F7F5]"
            }`}
            style={{ marginLeft: depth * 22, borderLeft: `3px solid ${color}` }}>
            <button data-testid={`tree-toggle-${node.code}`} onClick={() => hasKids && toggle(node.code)}
              className={`mt-0.5 shrink-0 ${hasKids ? "text-[#4A5568]" : "text-[#CBD5E0] cursor-default"}`}>
              {hasKids ? (isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : <span className="inline-block w-4" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-[3px]"
                  style={{ color, background: `${color}14` }}>
                  {NIVEAU_LABEL[node.niveau] || node.niveau} {node.code}
                </span>
                {isAnchor && (
                  <span data-testid={`anchor-${node.code}`}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-[3px] text-[#1F6FEB] bg-[#1F6FEB]/12">
                    <Zap size={11} /> Ancrage digital
                  </span>
                )}
              </div>
              <p className="text-sm text-[#1A202C] mt-1 leading-snug">{node.nom}</p>
              {node.effet && <p className="text-[11px] text-[#718096] mt-1 italic">{node.effet}</p>}
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-semibold tabular-nums text-[#1A202C]">
                {budget != null ? fmtMillions(budget) : <span className="text-[#A0AEC0]">—</span>}
              </div>
              {hasKids && <div className="text-[10px] text-[#A0AEC0]">{childCount} élément(s)</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
