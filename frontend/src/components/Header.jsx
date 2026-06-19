import React from "react";
import { useLocation } from "react-router-dom";
import { Search, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const TITLES = {
  "/": "Tableau de bord exécutif",
  "/arborescence": "Arborescence du Plan",
  "/actions": "Registre des actions",
  "/budget": "Analyse budgétaire",
  "/alertes": "Centre d'alertes",
};

export function Header({ onSearch }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const title = TITLES[loc.pathname] || "Cockpit PND 2026-2030";
  const initials = (user?.name || "PM").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="fixed top-0 right-0 left-[280px] h-[64px] bg-white border-b border-[#E2E8F0] z-20 px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold tracking-tight text-[#1A202C]" data-testid="header-title">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AEC0]" strokeWidth={1.8} />
          <input
            data-testid="global-search-input"
            onChange={(e) => onSearch && onSearch(e.target.value)}
            placeholder="Rechercher une action, un code…"
            className="w-[300px] h-9 pl-9 pr-3 rounded-[8px] bg-[#F7F7F5] border border-transparent focus:border-[#FF8200]/40 focus:bg-white outline-none text-sm transition-all"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-testid="user-menu-trigger" className="flex items-center gap-2.5 outline-none">
              <div className="w-9 h-9 rounded-full bg-[#1A202C] text-white flex items-center justify-center text-xs font-bold">
                {initials}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="font-semibold text-sm text-[#1A202C]">{user?.name}</div>
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
