import React from "react";
import { Link } from "react-router-dom";
import { Breadcrumb } from "@/components/Breadcrumb";
import { GraduationCap, ArrowRight } from "lucide-react";

const STEPS = [
  { n: 1, to: "/pilotage-directeur", title: "Ouvrir la Vue Directeur", detail: "Lecture de la situation en moins de deux minutes : décisions requises, alertes, échéances, risques, budget, avancement." },
  { n: 2, to: "/pilotage-directeur", title: "Passer en revue les alertes", detail: "Identifier les alertes critiques et élevées (règles déterministes) et repérer une activité bloquée." },
  { n: 3, to: "/plan-action", title: "Ouvrir une action bloquée", detail: "Dans le Plan d'action annuel, filtrer Statut = « Bloqué » et consulter le détail et l'historique de l'action." },
  { n: 4, to: "/alignement", title: "Vérifier son alignement PND / Politique", detail: "Dans la Matrice d'alignement, contrôler la chaîne Objectif PND → Effet → Axe Politique → Plan annuel, et le statut du lien." },
  { n: 5, to: "/plan-action", title: "Inscrire l'action à l'ordre du jour", detail: "Depuis la ligne de l'action (bouton « ODJ ») ou depuis le module Ordre du jour, ajouter le point avec la décision attendue." },
  { n: 6, to: "/ordre-du-jour", title: "Transformer le blocage en décision", detail: "Bouton « Transformer en décision » : le point crée une décision réelle au registre, marquée « à arbitrer »." },
  { n: 7, to: "/ordre-du-jour", title: "Affecter une relance à la direction", detail: "Bouton relance sur le point (ou dans Suivi hebdomadaire / Vue par Direction) : la direction apparaît « à suivre »." },
  { n: 8, to: "/reporting", title: "Générer la Note DIRCAB", detail: "Module Reporting → « Note hebdomadaire DIRCAB » : PDF réel généré par le serveur, journalisé dans l'audit." },
];

const ACCOUNTS = [
  { role: "DIRCAB / Cabinet décisionnel", email: "dircab@metfpa.ci", note: "déroule le scénario complet" },
  { role: "Administrateur système", email: "admin@metfpa.ci", note: "accès total + administration" },
  { role: "Direction d'agence (DAF)", email: "direction.daf@metfpa.ci", note: "met à jour uniquement le périmètre de son agence" },
];

export default function ScenarioFormation() {
  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-scenario">
      <Breadcrumb items={[{ label: "Guide interne équipe projet" }]} />

      <div className="rounded-[8px] border border-[#7C3AED]/25 bg-gradient-to-br from-[#7C3AED]/[0.06] to-white p-6">
        <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7C3AED]"><GraduationCap size={13} className="inline mr-1" /> Guide d'animation</div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">Guide interne équipe projet</h1>
        <p className="text-sm text-[#4A5568] mt-2 max-w-3xl">Déroulé recommandé de la démonstration : du constat (alerte, blocage) à la décision (arbitrage, relance, note). Compte conseillé pour l'animation : <strong>dircab@metfpa.ci</strong>.</p>
      </div>

      <div className="space-y-2.5" data-testid="scenario-steps">
        {STEPS.map((s) => (
          <Link key={s.n} to={s.to} data-testid={`scenario-step-${s.n}`}
            className="group flex items-start gap-4 bg-white rounded-[8px] border border-[#E2E8F0] p-4 hover:border-[#7C3AED]/50 hover:shadow-sm transition-all">
            <span className="shrink-0 w-8 h-8 rounded-full bg-[#7C3AED]/10 text-[#5B21B6] font-bold text-sm flex items-center justify-center">{s.n}</span>
            <span className="min-w-0 flex-1">
              <span className="text-sm font-semibold text-[#1A202C] group-hover:text-[#5B21B6]">{s.title}</span>
              <span className="block text-xs text-[#718096] mt-0.5">{s.detail}</span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-[#CBD5E0] group-hover:text-[#7C3AED] mt-1" />
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-[8px] border border-[#E2E8F0] p-5" data-testid="scenario-accounts">
        <h2 className="text-sm font-semibold text-[#1A202C] mb-3">Comptes de démonstration (mot de passe commun : <span className="font-mono">Metfpa@2026Demo</span>)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {ACCOUNTS.map((a) => (
            <div key={a.email} className="rounded-[6px] border border-[#E2E8F0] px-3 py-2.5">
              <div className="text-xs font-semibold text-[#1A202C]">{a.role}</div>
              <div className="font-mono text-[11px] text-[#5B21B6]">{a.email}</div>
              <div className="text-[11px] text-[#718096]">{a.note}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#A0AEC0] mt-3">Rappel : relances, points d'ordre du jour et statuts de lien de la matrice sont en mode démonstration (stockage local navigateur) ; décisions, activités et validations sont persistées côté serveur et auditées.</p>
      </div>
    </div>
  );
}
