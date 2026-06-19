import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Network, Table2, BarChart3, BellRing, Star } from "lucide-react";
import { CoatOfArms } from "@/components/icons/Ivorian";

const NAV = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard, end: true, testid: "nav-dashboard" },
  { to: "/arborescence", label: "Arborescence", icon: Network, testid: "nav-tree" },
  { to: "/actions", label: "Actions", icon: Table2, testid: "nav-actions" },
  { to: "/budget", label: "Analyse budgétaire", icon: BarChart3, testid: "nav-analytics" },
  { to: "/alertes", label: "Centre d'alertes", icon: BellRing, testid: "nav-alerts" },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-[280px] bg-[#1A202C] text-white flex flex-col z-30">
      <div className="px-6 py-6 border-b border-white/8 flex items-center gap-3">
        <CoatOfArms size={42} stroke="#C5A028" />
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-tight">Cockpit PND</div>
          <div className="text-[11px] text-white/45 font-medium tracking-wide">RÉPUBLIQUE DE CÔTE D'IVOIRE</div>
        </div>
      </div>

      <div className="px-6 pt-6 pb-3">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-white/35 uppercase">Navigation</p>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {NAV.map(({ to, label, icon: Icon, end, testid }) => (
          <NavLink key={to} to={to} end={end} data-testid={testid}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#FF8200] text-white shadow-[0_4px_14px_rgba(255,130,0,0.35)]"
                  : "text-white/65 hover:text-white hover:bg-white/6"
              }`
            }>
            {({ isActive }) => (
              <>
                <Icon size={18} strokeWidth={1.6} className={isActive ? "text-white" : "text-white/55 group-hover:text-white"} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-5 border-t border-white/8">
        <div className="flex items-start gap-2.5">
          <Star size={15} strokeWidth={1.5} className="text-[#C5A028] mt-0.5 shrink-0" />
          <p className="text-[11px] leading-relaxed text-white/45">
            Plan National de Développement<br />
            <span className="text-white/70 font-semibold">2026 — 2030</span>
          </p>
        </div>
      </div>
    </aside>
  );
}
