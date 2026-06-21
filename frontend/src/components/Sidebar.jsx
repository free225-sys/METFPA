import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Layers, Target, Activity, ListChecks, GitMerge, Gauge, Gavel, ShieldAlert, Wallet, Crown, ShieldCheck, FileSpreadsheet } from "lucide-react";
import { CoatOfArms } from "@/components/icons/Ivorian";
import { useAuth, ROLE_LABELS, isAdmin, canValidate } from "@/context/AuthContext";

// S3A + S3B delivered views
const NAV = [
  { to: "/", label: "Accueil intégré", icon: LayoutDashboard, end: true, testid: "nav-accueil" },
  { to: "/pnd-402", label: "Vue PND 4.02", icon: Layers, testid: "nav-pnd" },
  { to: "/politique-eftp", label: "Politique EFTP", icon: Target, testid: "nav-politique" },
  { to: "/strategie-digitale", label: "Stratégie digitale", icon: Activity, testid: "nav-digital" },
  { to: "/plan-action", label: "Plan d'action", icon: ListChecks, testid: "nav-plan-action" },
  { to: "/alignement", label: "Alignement", icon: GitMerge, testid: "nav-alignement" },
  { to: "/kpi-cascade", label: "KPI en cascade", icon: Gauge, testid: "nav-kpi" },
];

const DECISIONNEL = [
  { to: "/pilotage-directeur", label: "Pilotage Directeur", icon: Crown, testid: "nav-cabinet" },
  { to: "/decisions", label: "Décisions", icon: Gavel, testid: "nav-decisions" },
  { to: "/risks", label: "Risques", icon: ShieldAlert, testid: "nav-risks" },
  { to: "/budget-consolide", label: "Budget consolidé", icon: Wallet, testid: "nav-budget" },
];

export function Sidebar() {
  const { user } = useAuth();
  const admin = isAdmin(user?.role);
  const validator = canValidate(user?.role);
  return (
    <aside className="fixed left-0 top-0 h-full w-[280px] bg-[#1A202C] text-white flex flex-col z-30">
      <div className="px-6 py-6 border-b border-white/10 flex items-center gap-3">
        <CoatOfArms size={42} stroke="#C5A028" />
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-tight">Cockpit METFPA</div>
          <div className="text-[11px] text-white/45 font-medium tracking-wide">SECTEUR 4.02 · EFTP</div>
        </div>
      </div>

      <div className="px-6 pt-6 pb-3">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-white/35 uppercase">Navigation</p>
      </div>
      <nav className="px-3 space-y-1 flex-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, end, testid }) => (
          <NavLink key={to} to={to} end={end} data-testid={testid}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-sm font-medium transition-all ${
                isActive ? "bg-[#FF8200] text-white" : "text-white/65 hover:text-white hover:bg-white/8"
              }`}>
            <Icon size={18} strokeWidth={1.6} /> {label}
          </NavLink>
        ))}

        <div className="px-3 pt-5 pb-2">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-white/35 uppercase">Décisionnel · Cabinet</p>
        </div>
        {DECISIONNEL.map(({ to, label, icon: Icon, testid }) => (
          <NavLink key={to} to={to} data-testid={testid}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-sm font-medium transition-all ${
                isActive ? "bg-[#FF8200] text-white" : "text-white/65 hover:text-white hover:bg-white/8"
              }`}>
            <Icon size={18} strokeWidth={1.6} /> {label}
          </NavLink>
        ))}

        {admin && (
          <>
            <div className="px-3 pt-5 pb-2">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-white/35 uppercase">Administration</p>
            </div>
            <NavLink to="/admin-users" data-testid="nav-admin-users"
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-sm font-medium transition-all ${
                  isActive ? "bg-[#FF8200] text-white" : "text-white/65 hover:text-white hover:bg-white/8"
                }`}>
              <ShieldCheck size={18} strokeWidth={1.6} /> Utilisateurs & rôles
            </NavLink>
          </>
        )}

        {validator && (
          <>
            <div className="px-3 pt-5 pb-2">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-white/35 uppercase">Données</p>
            </div>
            <NavLink to="/imports" data-testid="nav-imports"
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-sm font-medium transition-all ${
                  isActive ? "bg-[#FF8200] text-white" : "text-white/65 hover:text-white hover:bg-white/8"
                }`}>
              <FileSpreadsheet size={18} strokeWidth={1.6} /> Imports (dry-run)
            </NavLink>
          </>
        )}
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
