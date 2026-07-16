import React from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";

// Mention de fiabilité : elle doit rester visible (les données ne sont pas
// officielles) sans consommer le haut de page, qui appartient au verdict de la
// semaine. D'où une ligne compacte, le détail complet restant à un clic.
export function DemoBanner() {
  return (
    <details data-testid="demo-banner"
      className="group rounded-[6px] border border-[#C5A028]/40 bg-[#C5A028]/10 text-[#8A6D1B]">
      <summary className="flex items-center gap-2 px-3 py-1.5 cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A028] rounded-[6px]">
        <AlertTriangle size={14} className="shrink-0 text-[#C5A028]" aria-hidden="true" />
        <span className="text-xs font-medium">
          Données <strong>provisoires</strong> et <strong>de démonstration</strong> — non officielles.
        </span>
        <ChevronDown size={14} className="ml-auto shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <p className="text-xs leading-snug px-3 pb-2.5 pt-0.5 border-t border-[#C5A028]/25">
        Référentiels en attente de validation METFPA · suivi opérationnel de démonstration.
        Aucun budget engagé/exécuté ni liste de directions officielle n'est présenté comme validé.
      </p>
    </details>
  );
}
