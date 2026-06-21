import React from "react";
import { AlertTriangle } from "lucide-react";

export function DemoBanner() {
  return (
    <div data-testid="demo-banner"
      className="flex items-center gap-2.5 rounded-[6px] border border-[#C5A028]/40 bg-[#C5A028]/10 px-4 py-2.5 text-[#8A6D1B]">
      <AlertTriangle size={16} className="shrink-0 text-[#C5A028]" />
      <p className="text-xs md:text-sm font-medium leading-snug">
        Données de référence <strong>provisoires</strong> (en attente de validation METFPA) ·
        suivi opérationnel <strong>de démonstration</strong> — non officiel.
        Aucun budget engagé/exécuté ni liste de directions officielle n'est présenté comme validé.
      </p>
    </div>
  );
}
