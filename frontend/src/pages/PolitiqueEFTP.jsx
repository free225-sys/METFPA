import React, { useEffect, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { fmtMillions } from "@/lib/format";
import { frameworkColor } from "@/lib/metfpaTheme";
import { OriginBadge } from "@/components/OriginBadge";
import { Breadcrumb } from "@/components/Breadcrumb";
import { HierTree } from "@/components/HierTree";
import { PageHeader, InstitutionalSection, MetricCard, DataStatusBanner } from "@/components/Institutional";
import { ArrowRight } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[var(--border)] rounded-[6px] ${className}`} />; }

export default function PolitiqueEFTP() {
  const [data, setData] = useState(null);
  const color = frameworkColor("POL");

  useEffect(() => { metfpaApi.get("/politique").then((r) => setData(r.data)); }, []);

  const fw = data?.framework;
  const nodes = data?.nodes || [];
  const axes = nodes.filter((n) => n.niveau === "axe");
  const produits = nodes.filter((n) => n.niveau === "produit").length;
  const actions = nodes.filter((n) => n.niveau === "action").length;

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-politique">
      <Breadcrumb items={[{ label: "Politique EFTP" }]} />
      <DataStatusBanner />

      <div className="bg-[var(--surface)] rounded-[10px] border border-[var(--border)] border-t-[3px] p-6" style={{ borderTopColor: color }}>
        <PageHeader eyebrow="Politique sectorielle décennale" accent={color}
          title={fw?.label || "Politique EFTP 2026-2035"}
          description={fw?.vision}
          actions={fw && <OriginBadge origin={fw.data_origin} status={fw.validation_status} />} />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
          <MetricCard label="Période" value={fw ? `${fw.period_start}-${fw.period_end}` : "…"} accent={color} hint={fw ? `${fw.period_years} ans` : null} />
          <MetricCard label="Axes" value={fw ? axes.length : "…"} accent={color} />
          <MetricCard label="Produits" value={fw ? produits : "…"} accent={color} />
          <MetricCard label="Actions clés" value={fw ? actions : "…"} accent={color} />
          <MetricCard label="Budget total" value={fw ? fmtMillions(fw.total) : "…"} accent={color} />
        </div>
        {fw && <p className="text-[12px] text-[var(--ink-500)] mt-3">Périmètre : {fw.budget_scope} · Source : {fw.source_document}</p>}
      </div>

      <InstitutionalSection title="Rattachement des axes au PND 4.02" accent={color}>
        <p className="text-[13px] text-[var(--ink-500)] -mt-1 mb-4">Chaque axe de la Politique contribue à un effet sectoriel du PND.</p>
        {!data ? <Skeleton className="h-24" /> : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {axes.map((a) => (
              <div key={a.code} data-testid={`axe-link-${a.code}`} className="rounded-[8px] border border-[var(--border)] p-3.5" style={{ borderLeft: `3px solid ${color}` }}>
                <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color }}>{a.code}</div>
                <p className="text-[13px] text-[var(--ink-900)] mt-1 leading-snug font-medium">{a.nom}</p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[var(--ink-500)]">
                  contribue à <ArrowRight size={12} /> <span className="font-semibold text-[var(--ci-green-700)]">PND {a.pnd_effet}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </InstitutionalSection>

      <InstitutionalSection title="Hiérarchie — Axe → Produit → Action clé" accent={color}
        action={fw && <OriginBadge origin={fw.data_origin} status={fw.validation_status} />}>
        {!data ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          : <HierTree nodes={nodes} color={color} expandDepth={1} highlightCodes={[]} />}
      </InstitutionalSection>
    </div>
  );
}
