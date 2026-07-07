import React, { useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DemoBanner } from "@/components/DemoBanner";
import { toast } from "sonner";
import { FileText, FileDown, Files, CalendarDays, Building2, Gavel, Clock, Wallet, Gauge, Loader2 } from "lucide-react";

const REPORTS = [
  { key: "note-dircab", title: "Note hebdomadaire DIRCAB", desc: "Synthèse décisionnelle : décisions, alertes, échéances, risques, budget, avancement.", icon: FileText, color: "#1A202C", live: true },
  { key: "synthese-reunion", title: "Synthèse de réunion", desc: "Compte rendu des points inscrits à l'ordre du jour (module Ordre du jour).", icon: Files, color: "#C89A2B", link: "/ordre-du-jour" },
  { key: "mensuel", title: "Reporting mensuel", desc: "État d'exécution mensuel consolidé par direction.", icon: CalendarDays, color: "#1F6FEB" },
  { key: "tutelle", title: "Reporting tutelle", desc: "Rapport institutionnel à destination de la tutelle et des partenaires.", icon: Building2, color: "#008751" },
  { key: "decisions", title: "État des décisions", desc: "Registre des décisions : statuts, arbitrages, relances.", icon: Gavel, color: "#7C3AED" },
  { key: "retards", title: "Actions en retard", desc: "Liste des actions en retard ou bloquées, par direction.", icon: Clock, color: "#FF8200" },
  { key: "budget", title: "État budgétaire", desc: "Prévu / engagé / exécuté par cadre et par direction.", icon: Wallet, color: "#009E49" },
  { key: "kpi", title: "État des KPI", desc: "Indicateurs par niveau : valeurs, cibles, données manquantes.", icon: Gauge, color: "#C53030" },
];

export default function Reporting() {
  const [busy, setBusy] = useState(null);

  const run = async (r) => {
    if (r.live) {
      setBusy(r.key);
      try {
        const resp = await metfpaApi.get("/cabinet/export/pdf?note=Note%20DIRCAB%20hebdomadaire", { responseType: "blob" });
        const url = URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
        const a = document.createElement("a");
        a.href = url; a.download = `Note_DIRCAB_${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click(); URL.revokeObjectURL(url);
        toast.success("Note DIRCAB générée (PDF)");
      } catch (e) {
        toast.error("Échec de la génération", { description: e?.response?.status === 403 ? "Accès refusé" : "Erreur serveur" });
      } finally { setBusy(null); }
    } else if (r.link) {
      window.location.assign(r.link);
    } else {
      toast.info(`« ${r.title} » — à finaliser`, { description: "Rapport en cours de construction (version de démonstration)." });
    }
  };

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-reporting">
      <Breadcrumb items={[{ label: "Reporting" }]} />
      <DemoBanner />
      <div className="rounded-[8px] border border-[#E2E8F0] bg-white p-6">
        <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#008751]"><FileDown size={13} className="inline mr-1" /> Production documentaire</div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">Reporting</h1>
        <p className="text-sm text-[#4A5568] mt-2 max-w-3xl">Rapports du cockpit. La <strong>Note hebdomadaire DIRCAB</strong> est générée en PDF réel ; les autres formats sont <strong>à finaliser (démonstration)</strong>.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="reporting-cards">
        {REPORTS.map((r) => (
          <div key={r.key} data-testid={`report-${r.key}`} className="bg-white rounded-[8px] border border-[#E2E8F0] p-4 flex flex-col">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-[8px] flex items-center justify-center" style={{ background: `${r.color}12` }}><r.icon size={17} style={{ color: r.color }} /></span>
              {r.live
                ? <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] bg-[#009E49]/10 text-[#006B3F]">DISPONIBLE</span>
                : r.link
                  ? <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] bg-[#C89A2B]/10 text-[#8A6D1B]">VIA ORDRE DU JOUR</span>
                  : <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] bg-[#718096]/10 text-[#52667A]">À FINALISER · DÉMO</span>}
            </div>
            <h2 className="text-sm font-semibold text-[#1A202C] mt-3">{r.title}</h2>
            <p className="text-xs text-[#718096] mt-1 flex-1">{r.desc}</p>
            <button data-testid={`report-btn-${r.key}`} onClick={() => run(r)} disabled={busy === r.key}
              className={`mt-3 inline-flex items-center justify-center gap-1.5 rounded-[6px] px-3 py-2 text-xs font-medium transition-colors ${
                r.live ? "bg-[#1A202C] text-white hover:bg-black" : "border border-[#E2E8F0] text-[#4A5568] hover:bg-[#F7F7F5]"}`}>
              {busy === r.key ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
              {r.live ? "Générer le PDF" : r.link ? "Ouvrir le module" : "Aperçu (démo)"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
