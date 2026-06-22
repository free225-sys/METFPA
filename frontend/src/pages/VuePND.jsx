import React, { useEffect, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { fmtMillions } from "@/lib/format";
import { frameworkColor } from "@/lib/metfpaTheme";
import { OriginBadge } from "@/components/OriginBadge";
import { Breadcrumb } from "@/components/Breadcrumb";
import { HierTree } from "@/components/HierTree";
import { PageHeader, InstitutionalSection, MetricCard, DataStatusBanner } from "@/components/Institutional";
import { Zap } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[var(--border)] rounded-[6px] ${className}`} />; }

export default function VuePND() {
  const [data, setData] = useState(null);
  const color = frameworkColor("PND");

  useEffect(() => { metfpaApi.get("/pnd").then((r) => setData(r.data)); }, []);

  const fw = data?.framework;
  const nodes = data?.nodes || [];
  const secteur = nodes.find((n) => n.niveau === "secteur");
  const effets = nodes.filter((n) => n.niveau === "effet").length;
  const produits = nodes.filter((n) => n.niveau === "produit").length;

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-pnd">
      <Breadcrumb items={[{ label: "PND 4.02" }]} />
      <DataStatusBanner />

      <div className="bg-[var(--surface)] rounded-[10px] border border-[var(--border)] border-t-[3px] p-6" style={{ borderTopColor: color }}>
        <PageHeader eyebrow="PND 2026-2030 · Résultat sectoriel" accent={color}
          title="Secteur 4.02 — Enseignement Technique et Formation Professionnelle"
          description={secteur?.resultat}
          actions={fw && <OriginBadge origin={fw.data_origin} status={fw.validation_status} />} />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
          <MetricCard label="Effets attendus" value={fw ? effets : "…"} accent={color} />
          <MetricCard label="Produits" value={fw ? produits : "…"} accent={color} />
          <MetricCard label="Budget secteur" value={secteur ? fmtMillions(secteur.budget_total) : "…"} accent={color} />
        </div>
        <div className="flex items-center gap-2 mt-4 text-[12.5px] text-[var(--info)]">
          <Zap size={13} /> Ancrage de la stratégie digitale : produit <strong>4.02.1.6</strong>
        </div>
      </div>

      <InstitutionalSection title="Chaîne de résultats — Secteur → Effets → Produits" accent={color}
        action={fw && <OriginBadge origin={fw.data_origin} status={fw.validation_status} />}>
        {!data ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          : <HierTree nodes={nodes} color={color} expandDepth={2} highlightCodes={["4.02.1.6"]} />}
      </InstitutionalSection>
    </div>
  );
}
