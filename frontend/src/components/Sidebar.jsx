import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Layers, Target, Activity, ListChecks, GitMerge, Gauge, Gavel,
  ShieldAlert, Wallet, Crown, FileSpreadsheet, Users, History, BadgeCheck, Clock,
  AlertTriangle, PanelLeftClose, PanelLeftOpen, Briefcase, CalendarClock,
  ClipboardList, Layers3, Users2, FileDown, GraduationCap, BellRing,
} from "lucide-react";
import { InstitutionalBrand } from "@/components/Institutional";
import { useAuth, ROLE_LABELS } from "@/context/AuthContext";

// Ordre recommandé DIRCAB : Vue Directeur → référentiels →
// alignement → plan/déclinaison/suivi → directions → budget & KPI →
// décisions & risques → reporting → administration.
const NAV_PILOTAGE = [
  { to: "/pilotage-directeur", label: "Vue Directeur", icon: Crown, testid: "nav-cabinet" },
];
const NAV_REFERENTIELS = [
  { to: "/pnd-402", label: "PND 4.02", icon: Layers, testid: "nav-pnd" },
  { to: "/politique-eftp", label: "Politique EFTP", icon: Target, testid: "nav-politique" },
  { to: "/strategie-digitale", label: "Stratégie digitale", icon: Activity, testid: "nav-digital" },
  { to: "/alignement", label: "Matrice d'alignement", icon: GitMerge, testid: "nav-alignement" },
];
const NAV_PLAN = [
  { to: "/plan-action", label: "Plan d'action annuel", icon: ListChecks, testid: "nav-plan-action" },
  { to: "/declinaison", label: "Déclinaison périodique", icon: Layers3, testid: "nav-declinaison" },
  { to: "/suivi-hebdo", label: "Suivi hebdomadaire", icon: CalendarClock, testid: "nav-suivi-hebdo" },
  { to: "/ordre-du-jour", label: "Ordre du jour", icon: ClipboardList, testid: "nav-ordre-du-jour" },
  { to: "/vue-directions", label: "Vue par Direction", icon: Users2, testid: "nav-vue-directions" },
];
const NAV_BUDGET_KPI = [
  { to: "/budget-consolide", label: "Budget consolidé", icon: Wallet, testid: "nav-budget" },
  { to: "/kpi-cascade", label: "KPI en cascade", icon: Gauge, testid: "nav-kpi" },
];
const NAV_DECISION = [
  { to: "/alertes-arbitrages", label: "Alertes & arbitrages", icon: BellRing, testid: "nav-alertes-arbitrages" },
  { to: "/decisions", label: "Décisions", icon: Gavel, testid: "nav-decisions" },
  { to: "/risks", label: "Risques", icon: ShieldAlert, testid: "nav-risks" },
  { to: "/reporting", label: "Reporting", icon: FileDown, testid: "nav-reporting" },
];
const NAV_ADMIN = [
  { to: "/admin-users", label: "Utilisateurs", icon: Users, testid: "nav-admin-users" },
  { to: "/admin-users?tab=roles", label: "Rôles et directions", icon: BadgeCheck, testid: "nav-roles" },
  { to: "/imports", label: "Qualité des données", icon: FileSpreadsheet, testid: "nav-imports" },
  { to: "/audit-log", label: "Journal d'audit", icon: History, testid: "nav-audit" },
];
const NAV_FORMATION = [
  { to: "/_internal/scenario-formation", label: "Guide interne (équipe projet)", icon: GraduationCap, testid: "nav-scenario" },
];

const COMMON_GROUPS = [
  { title: "Pilotage", items: NAV_PILOTAGE },
  { title: "Référentiels stratégiques", items: NAV_REFERENTIELS },
  { title: "Plan & suivi", items: NAV_PLAN },
  { title: "Budget & KPI", items: NAV_BUDGET_KPI },
  { title: "Décisions & reporting", items: NAV_DECISION },
];

// Single source of truth mirroring the RoleRoute guards in App.js. Any route not
// listed here is open to every authenticated role. The sidebar filters its items
// against this map so a role can never see a link that leads to « Accès refusé ».
const ROUTE_ROLES = {
  "/ma-direction": ["agency_director"],
  "/pilotage-directeur": ["dircab", "admin"],
  "/alertes-arbitrages": ["dircab", "admin"],
  "/suivi-hebdo": ["dircab", "admin"],
  "/ordre-du-jour": ["dircab", "admin"],
  "/vue-directions": ["dircab", "admin"],
  "/reporting": ["dircab", "admin"],
  "/_internal/scenario-formation": ["admin"],
  "/admin-users": ["admin"],
  "/audit-log": ["dircab", "admin"],
  "/imports": ["dircab", "admin"],
};
export function canAccessRoute(role, to) {
  const path = (to || "").split("?")[0];
  const allowed = ROUTE_ROLES[path];
  return !allowed || allowed.includes(role);
}

function navConfig(role) {
  if (role === "admin") return [
    ...COMMON_GROUPS,
    { title: "Administration", items: NAV_ADMIN },
    { title: "Ressources internes", items: NAV_FORMATION },
  ];

  if (role === "agency_director") return [
    { title: "Mon agence", items: [
      { to: "/ma-direction", label: "Mon espace", icon: Briefcase, testid: "nav-my-direction" },
      { to: "/ma-direction?vue=updates", label: "Mises à jour requises", icon: Clock, testid: "nav-updates" },
      { to: "/ma-direction?vue=delayed", label: "Missions en retard", icon: AlertTriangle, testid: "nav-delayed" },
      { to: "/kpi-cascade", label: "Mes indicateurs", icon: Gauge, testid: "nav-kpi" },
    ]},
    { title: "Référentiels stratégiques", items: NAV_REFERENTIELS },
  ];

  // DIRCAB consolidates the former coordination and M&E validation workflows.
  if (role === "dircab") return [
    ...COMMON_GROUPS,
    { title: "Qualité & audit", items: [
      { to: "/imports", label: "Qualité des données", icon: FileSpreadsheet, testid: "nav-imports" },
      { to: "/audit-log", label: "Historique d'audit", icon: History, testid: "nav-audit" },
    ]},
  ];

  return [{ title: "Navigation", items: NAV_PILOTAGE }];
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
  // Filter every item against the route-access map so the menu can never offer
  // a link the current role cannot open; drop groups left empty.
  const groups = navConfig(user?.role)
    .map((g) => ({ ...g, items: g.items.filter((it) => canAccessRoute(user?.role, it.to)) }))
    .filter((g) => g.items.length > 0);

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
