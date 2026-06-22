import React from "react";
import { useLocation } from "react-router-dom";
import { LogOut, Maximize2 } from "lucide-react";
import { useAuth, ROLE_LABELS } from "@/context/AuthContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const TITLES = {
  "/accueil": "Accueil intégré METFPA",
  "/pnd-402": "Vue PND 4.02",
  "/politique-eftp": "Politique EFTP 2026-2035",
  "/strategie-digitale": "Stratégie digitale 2026-2031",
  "/plan-action": "Plan d'action ministériel",
  "/alignement": "Alignement stratégique",
  "/kpi-cascade": "KPI en cascade",
  "/pilotage-directeur": "Pilotage Directeur",
  "/decisions": "Registre des décisions",
  "/risks": "Registre des risques",
  "/budget-consolide": "Budget consolidé",
  "/admin-users": "Administration · Utilisateurs",
  "/audit-log": "Journal d'audit",
  "/imports": "Imports (dry-run)",
  "/legacy-pnd": "Tableau de bord exécutif (PND générique)",
};

export function Header({ onPresentation }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const title = TITLES[loc.pathname] || "Cockpit METFPA";
  const initials = (user?.name || "PM").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="fixed top-0 right-0 left-[280px] h-[64px] bg-white border-b border-[#E2E8F0] z-20 px-8 flex items-center justify-between">
      <div className="min-w-0">
        <h1 className="text-lg font-bold tracking-tight text-[#1A202C] truncate" data-testid="header-title">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="hidden md:flex flex-col items-end leading-tight mr-1" data-testid="header-role">
            <span className="text-[11px] font-semibold text-[#1A202C]">{ROLE_LABELS[user.role] || user.role}</span>
            {user.direction && <span className="text-[10px] text-[#C5A028] font-medium uppercase tracking-wide">{user.direction}</span>}
          </div>
        )}

        <button data-testid="presentation-button" onClick={onPresentation} title="Mode présentation"
          className="w-9 h-9 rounded-[6px] border border-[#E2E8F0] flex items-center justify-center text-[#4A5568] hover:bg-[#F7F7F5] transition-colors">
          <Maximize2 size={17} strokeWidth={1.8} />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-testid="user-menu-trigger" className="flex items-center gap-2.5 outline-none">
              <div className="w-9 h-9 rounded-full bg-[#1A202C] text-white flex items-center justify-center text-xs font-bold">{initials}</div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="font-semibold text-sm text-[#1A202C]">{user?.name}</div>
              <div className="text-xs text-[#FF8200] font-medium">{ROLE_LABELS[user?.role] || user?.role}{user?.direction ? ` · ${user.direction}` : ""}</div>
              <div className="text-xs text-[#718096] font-normal mt-0.5">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} data-testid="logout-button" className="text-red-600 cursor-pointer">
              <LogOut size={15} className="mr-2" /> Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
