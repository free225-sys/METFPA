import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Layers, Target, Activity, ListChecks, GitMerge, Gauge, Gavel,
  ShieldAlert, Wallet, Crown, FileSpreadsheet, Users, History, BadgeCheck, Clock, AlertTriangle,
} from "lucide-react";
import { CoatOfArms } from "@/components/icons/Ivorian";
import { useAuth, ROLE_LABELS } from "@/context/AuthContext";

const REF_ITEMS = [
  { to: "/pnd-402", label: "PND 4.02", icon: Layers, testid: "nav-pnd" },
  { to: "/politique-eftp", label: "Politique EFTP", icon: Target, testid: "nav-politique" },
  { to: "/strategie-digitale", label: "Stratégie digitale", icon: Activity, testid: "nav-digital" },
  { to: "/alignement", label: "Alignement", icon: GitMerge, testid: "nav-alignement" },
];

// Role-specific navigation: each role sees a clearly different cockpit.
function navConfig(role) {
  if (role === "cabinet_reader") return [
    { title: "Pilotage", items: [
      { to: "/pilotage-directeur", label: "Pilotage Directeur", icon: Crown, testid: "nav-cabinet", end: true },
      { to: "/decisions", label: "Décisions", icon: Gavel, testid: "nav-decisions" },
      { to: "/risks", label: "Alertes & Risques", icon: ShieldAlert, testid: "nav-risks" },
      { to: "/budget-consolide", label: "Budget consolidé", icon: Wallet, testid: "nav-budget" },
    ]},
    { title: "Progression stratégique", items: [
      { to: "/accueil", label: "Progression intégrée", icon: LayoutDashboard, testid: "nav-accueil" },
      { to: "/plan-action", label: "Synthèse plan d'action", icon: ListChecks, testid: "nav-plan-action" },
      { to: "/kpi-cascade", label: "Synthèse KPI", icon: Gauge, testid: "nav-kpi" },
    ]},
    { title: "Référentiels", items: REF_ITEMS },
  ];

  if (role === "direction_editor") return [
    { title: "Ma Direction", items: [
      { to: "/plan-action", label: "Mon portefeuille", icon: ListChecks, testid: "nav-plan-action", end: true },
      { to: "/plan-action?vue=updates", label: "Mises à jour requises", icon: Clock, testid: "nav-updates" },
      { to: "/plan-action?vue=delayed", label: "Activités en retard", icon: AlertTriangle, testid: "nav-delayed" },
      { to: "/plan-action?vue=alerts", label: "Alertes", icon: ShieldAlert, testid: "nav-alerts" },
      { to: "/kpi-cascade", label: "Mes indicateurs", icon: Gauge, testid: "nav-kpi" },
    ]},
    { title: "Référentiels", items: REF_ITEMS.slice(0, 3) },
  ];

  if (role === "me_validator") return [
    { title: "Suivi & Validation", items: [
      { to: "/kpi-cascade", label: "Espace de validation", icon: BadgeCheck, testid: "nav-validation", end: true },
      { to: "/plan-action", label: "Revue du plan d'action", icon: ListChecks, testid: "nav-plan-action" },
      { to: "/imports", label: "Qualité des données", icon: FileSpreadsheet, testid: "nav-imports" },
      { to: "/audit-log", label: "Historique d'audit", icon: History, testid: "nav-audit" },
    ]},
    { title: "Référentiels", items: REF_ITEMS },
  ];

  if (role === "admin") return [
    { title: "Administration", items: [
      { to: "/admin-users", label: "Utilisateurs & rôles", icon: Users, testid: "nav-admin-users", end: true },
      { to: "/audit-log", label: "Journal d'audit", icon: History, testid: "nav-audit" },
      { to: "/imports", label: "Imports (dry-run)", icon: FileSpreadsheet, testid: "nav-imports" },
    ]},
    { title: "Application", items: [
      { to: "/pilotage-directeur", label: "Pilotage Directeur", icon: Crown, testid: "nav-cabinet" },
      { to: "/plan-action", label: "Plan d'action", icon: ListChecks, testid: "nav-plan-action" },
      { to: "/kpi-cascade", label: "KPI en cascade", icon: Gauge, testid: "nav-kpi" },
    ]},
    { title: "Référentiels", items: REF_ITEMS },
  ];

  return [{ title: "Navigation", items: [
    { to: "/pilotage-directeur", label: "Pilotage Directeur", icon: Crown, testid: "nav-cabinet" },
  ]}];
}

const linkClass = ({ isActive }) =>
  `group flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-sm font-medium transition-all ${
    isActive ? "bg-[#FF8200] text-white" : "text-white/65 hover:text-white hover:bg-white/8"
  }`;

export function Sidebar() {
  const { user } = useAuth();
  const groups = navConfig(user?.role);

  return (
    <aside className="fixed left-0 top-0 h-full w-[280px] bg-[#1A202C] text-white flex flex-col z-30" data-testid="sidebar">
      <div className="px-6 py-6 border-b border-white/10 flex items-center gap-3">
        <CoatOfArms size={42} stroke="#C5A028" />
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-tight">Cockpit METFPA</div>
          <div className="text-[11px] text-white/45 font-medium tracking-wide">SECTEUR 4.02 · EFTP</div>
        </div>
      </div>

      <nav className="px-3 pt-4 space-y-1 flex-1 overflow-y-auto" data-testid={`sidebar-nav-${user?.role || "anon"}`}>
        {groups.map((g, gi) => (
          <div key={g.title} className={gi === 0 ? "" : "pt-3"}>
            <div className="px-3 pt-2 pb-2">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-white/35 uppercase">{g.title}</p>
            </div>
            {g.items.map(({ to, label, icon: Icon, end, testid }) => (
              <NavLink key={testid} to={to} end={end} data-testid={testid} className={linkClass}>
                <Icon size={18} strokeWidth={1.6} /> {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {user && (
        <div className="px-6 py-3 border-t border-white/10" data-testid="sidebar-user">
          <div className="text-[12px] font-semibold text-white/85 truncate">{user.name || user.email}</div>
          <div className="text-[10px] text-[#C5A028] font-medium uppercase tracking-wide">{ROLE_LABELS[user.role] || user.role}{user.direction ? ` · ${user.direction}` : ""}</div>
        </div>
      )}

      <div className="px-6 py-5 border-t border-white/10">
        <p className="text-[11px] leading-relaxed text-white/45">
          PND 4.02 · Politique EFTP 2026-2035 · Stratégie digitale 2026-2031
        </p>
      </div>
    </aside>
  );
}
