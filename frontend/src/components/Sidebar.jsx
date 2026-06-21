import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Lock } from "lucide-react";
import { CoatOfArms } from "@/components/icons/Ivorian";

// Phase S3 modules — listed but not yet built (no S3 work started in S2)
const UPCOMING = [
  "Vue PND 4.02", "Politique EFTP", "Stratégie digitale", "Plan d'action",
  "Alignement", "KPI en cascade", "Pilotage Directeur",
];

export function Sidebar() {
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
      <nav className="px-3 space-y-1">
        <NavLink to="/" end data-testid="nav-accueil"
          className={({ isActive }) =>
            `group flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-sm font-medium transition-all ${
              isActive ? "bg-[#FF8200] text-white" : "text-white/65 hover:text-white hover:bg-white/8"
            }`}>
          <LayoutDashboard size={18} strokeWidth={1.6} /> Accueil intégré
        </NavLink>
      </nav>

      <div className="px-6 pt-6 pb-3">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-white/35 uppercase">Modules · à venir (S3+)</p>
      </div>
      <nav className="px-3 space-y-1 flex-1">
        {UPCOMING.map((label) => (
          <div key={label} data-testid={`nav-upcoming-${label}`}
            className="flex items-center gap-3 px-3 py-2 rounded-[6px] text-sm text-white/30 cursor-not-allowed select-none">
            <Lock size={15} strokeWidth={1.6} /> {label}
          </div>
        ))}
      </nav>

      <div className="px-6 py-5 border-t border-white/10">
        <p className="text-[11px] leading-relaxed text-white/45">
          PND 4.02 · Politique EFTP 2026-2035 · Stratégie digitale 2026-2031
        </p>
      </div>
    </aside>
  );
}
