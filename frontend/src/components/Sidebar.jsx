import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Layers, Target, Activity, ListChecks, GitMerge, Gauge, Gavel,
  ShieldAlert, Wallet, Crown, FileSpreadsheet, Users, History, BadgeCheck, Clock,
  AlertTriangle, FileText, PanelLeftClose, PanelLeftOpen, Briefcase,
} from "lucide-react";
import { InstitutionalBrand } from "@/components/Institutional";
import { useAuth, ROLE_LABELS } from "@/context/AuthContext";

const REF_ITEMS = [
  { to: "/pnd-402", label: "PND 4.02", icon: Layers, testid: "nav-pnd" },
  { to: "/politique-eftp", label: "Politique EFTP", icon: Target, testid: "nav-politique" },
  { to: "/strategie-digitale", label: "Stratégie digitale", icon: Activity, testid: "nav-digital" },
  { to: "/alignement", label: "Alignement", icon: GitMerge, testid: "nav-alignement" },
];

function navConfig(role) {
  if (role === "cabinet_reader") return [
    { title: "Pilotage", items: [
      { to: "/pilotage-directeur", label: "Pilotage Directeur", icon: Crown, testid: "nav-cabinet" },
      { to: "/decisions", label: "Décisions", icon: Gavel, testid: "nav-decisions" },
      { to: "/risks", label: "Alertes et risques", icon: ShieldAlert, testid: "nav-risks" },
      { to: "/budget-consolide", label: "Budget consolidé", icon: Wallet, testid: "nav-budget" },
      { to: "/pilotage-directeur?focus=note", label: "Note de Cabinet", icon: FileText, testid: "nav-cabinet-note" },
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
      { to: "/plan-action", label: "Mon portefeuille", icon: Briefcase, testid: "nav-plan-action" },
      { to: "/plan-action?vue=updates", label: "Mises à jour requises", icon: Clock, testid: "nav-updates" },
      { to: "/plan-action?vue=delayed", label: "Activités en retard", icon: AlertTriangle, testid: "nav-delayed" },
      { to: "/plan-action?vue=alerts", label: "Alertes", icon: ShieldAlert, testid: "nav-alerts" },
      { to: "/kpi-cascade", label: "Mes indicateurs", icon: Gauge, testid: "nav-kpi" },
    ]},
    { title: "Référentiels", items: REF_ITEMS.slice(0, 3) },
  ];

  if (role === "me_validator") return [
    { title: "Suivi et validation", items: [
      { to: "/kpi-cascade", label: "Espace de validation", icon: BadgeCheck, testid: "nav-validation" },
      { to: "/plan-action", label: "Revue du plan d'action", icon: ListChecks, testid: "nav-plan-action" },
      { to: "/imports", label: "Qualité des données", icon: FileSpreadsheet, testid: "nav-imports" },
      { to: "/audit-log", label: "Historique d'audit", icon: History, testid: "nav-audit" },
    ]},
    { title: "Référentiels", items: REF_ITEMS },
  ];

  if (role === "admin") return [
    { title: "Administration", items: [
      { to: "/admin-users", label: "Utilisateurs", icon: Users, testid: "nav-admin-users" },
      { to: "/admin-users?tab=roles", label: "Rôles et directions", icon: BadgeCheck, testid: "nav-roles" },
      { to: "/imports", label: "Qualité des données", icon: FileSpreadsheet, testid: "nav-imports" },
      { to: "/audit-log", label: "Journal d'audit", icon: History, testid: "nav-audit" },
    ]},
    { title: "Application", items: [
      { to: "/pilotage-directeur", label: "Pilotage Directeur", icon: Crown, testid: "nav-cabinet" },
      { to: "/plan-action", label: "Plan d'action", icon: ListChecks, testid: "nav-plan-action" },
      { to: "/kpi-cascade", label: "KPI en cascade", icon: Gauge, testid: "nav-kpi" },
    ]},
    { title: "Référentiels", items: REF_ITEMS },
  ];

  return [{ title: "Navigation", items: [{ to: "/pilotage-directeur", label: "Pilotage Directeur", icon: Crown, testid: "nav-cabinet" }] }];
}

function SidebarItem({ to, label, icon: Icon, testid, collapsed, onNavigate }) {
  const loc = useLocation();
  const [path, qs = ""] = to.split("?");
  const active = loc.pathname === path && loc.search === (qs ? `?${qs}` : "");
  return (
    <Link to={to} data-testid={testid} onClick={onNavigate} title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center ${collapsed ? "justify-center" : "gap-3"} h-10 px-3 rounded-[7px] text-[13.5px] transition-colors border-l-[3px] ${
        active
          ? "bg-[rgba(244,124,32,0.16)] border-[var(--ci-orange-600)] text-white font-semibold"
          : "border-transparent text-white/60 hover:text-white hover:bg-white/[0.06] font-medium"
      }`}>
      <Icon size={18} strokeWidth={active ? 2.1 : 1.7} className={active ? "text-[var(--ci-orange-600)]" : ""} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export function Sidebar({ collapsed = false, onToggle, onNavigate }) {
  const { user } = useAuth();
  const groups = navConfig(user?.role);

  return (
    <aside data-testid="sidebar" data-collapsed={collapsed}
      className="h-full flex flex-col bg-[var(--ink-900)] text-white transition-[width] duration-200"
      style={{ width: collapsed ? 76 : 280 }}>
      <div className={`h-[78px] flex items-center border-b border-white/10 ${collapsed ? "justify-center px-2" : "px-5"}`}>
        <InstitutionalBrand collapsed={collapsed} />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" data-testid={`sidebar-nav-${user?.role || "anon"}`} aria-label="Navigation principale">
        {groups.map((g, gi) => (
          <div key={g.title} className={gi === 0 ? "" : "pt-3 mt-3 border-t border-white/[0.06]"}>
            {!collapsed && <p className="px-3 pb-2 text-[10.5px] font-semibold tracking-[0.1em] uppercase text-white/35">{g.title}</p>}
            {collapsed && gi > 0 && <div className="mx-3 mb-2 border-t border-white/[0.06]" />}
            <div className="space-y-0.5">
              {g.items.map((it) => <SidebarItem key={it.testid} {...it} collapsed={collapsed} onNavigate={onNavigate} />)}
            </div>
          </div>
        ))}
      </nav>

      {user && !collapsed && (
        <div className="px-5 py-3 border-t border-white/10" data-testid="sidebar-user">
          <div className="text-[12.5px] font-semibold text-white/90 truncate">{user.name || user.email}</div>
          <div className="text-[10.5px] text-[var(--ci-gold-600)] font-medium">{ROLE_LABELS[user.role] || user.role}{user.direction ? ` · ${user.direction}` : ""}</div>
        </div>
      )}

      <div className="border-t border-white/10 p-2">
        <button data-testid="sidebar-toggle" onClick={onToggle} aria-expanded={!collapsed} aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
          className={`hidden lg:flex items-center ${collapsed ? "justify-center" : "gap-2"} w-full h-9 px-3 rounded-[7px] text-white/55 hover:text-white hover:bg-white/[0.06] text-[12.5px] font-medium transition-colors`}>
          {collapsed ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} /> Replier</>}
        </button>
      </div>
    </aside>
  );
}
