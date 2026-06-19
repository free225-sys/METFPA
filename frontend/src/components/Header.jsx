import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, LogOut, Bell, Maximize2, Ban, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { fmtDate } from "@/lib/format";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const TITLES = {
  "/": "Tableau de bord exécutif",
  "/arborescence": "Arborescence du Plan",
  "/actions": "Registre des actions",
  "/ministeres": "Vue par ministère",
  "/budget": "Analyse budgétaire",
  "/alertes": "Centre d'alertes",
};

export function Header({ onSearch, onPresentation }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState({ items: [], total: 0 });
  const title = TITLES[loc.pathname] || "Cockpit PND 2026-2030";
  const initials = (user?.name || "PM").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  useEffect(() => { api.get("/notifications").then((r) => setNotifs(r.data)).catch(() => {}); }, [loc.pathname]);

  return (
    <header className="fixed top-0 right-0 left-[280px] h-[64px] bg-white border-b border-[#E2E8F0] z-20 px-8 flex items-center justify-between">
      <h1 className="text-lg font-bold tracking-tight text-[#1A202C]" data-testid="header-title">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AEC0]" strokeWidth={1.8} />
          <input data-testid="global-search-input" onChange={(e) => onSearch && onSearch(e.target.value)}
            placeholder="Rechercher une action, un code…"
            className="w-[280px] h-9 pl-9 pr-3 rounded-[6px] bg-[#F7F7F5] border border-transparent focus:border-[#FF8200]/40 focus:bg-white outline-none text-sm transition-all" />
        </div>

        <button data-testid="presentation-button" onClick={onPresentation} title="Mode présentation"
          className="w-9 h-9 rounded-[6px] border border-[#E2E8F0] flex items-center justify-center text-[#4A5568] hover:bg-[#F7F7F5] transition-colors">
          <Maximize2 size={17} strokeWidth={1.8} />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-testid="notifications-trigger" title="Notifications"
              className="relative w-9 h-9 rounded-[6px] border border-[#E2E8F0] flex items-center justify-center text-[#4A5568] hover:bg-[#F7F7F5] transition-colors">
              <Bell size={17} strokeWidth={1.8} />
              {notifs.total > 0 && (
                <span data-testid="notif-badge" className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C53030] text-white text-[10px] font-bold flex items-center justify-center pulse-red">
                  {notifs.total > 99 ? "99+" : notifs.total}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span className="font-semibold text-sm text-[#1A202C]">Notifications</span>
              <span className="text-xs text-[#718096] font-normal">{notifs.total} actives</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifs.items.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-[#718096]">Aucune notification</div>
            ) : notifs.items.map((n) => (
              <DropdownMenuItem key={`${n.code}-${n.type}`} data-testid={`notif-${n.code}`}
                onClick={() => navigate(`/arborescence?focus=${n.code}`)} className="cursor-pointer items-start gap-2.5 py-2.5">
                {n.type === "bloque" ? <Ban size={15} className="text-[#C53030] mt-0.5 shrink-0" /> : <Clock size={15} className="text-[#FF8200] mt-0.5 shrink-0" />}
                <div className="min-w-0">
                  <div className="text-[13px] text-[#1A202C] font-medium truncate">{n.title}</div>
                  <div className="text-[11px] text-[#718096]">{n.code} · {n.type === "bloque" ? "Bloquée" : "En retard"} · {fmtDate(n.date)}</div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/alertes")} className="cursor-pointer text-[#FF8200] font-medium justify-center">
              Voir toutes les alertes
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-testid="user-menu-trigger" className="flex items-center gap-2.5 outline-none">
              <div className="w-9 h-9 rounded-full bg-[#1A202C] text-white flex items-center justify-center text-xs font-bold">{initials}</div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="font-semibold text-sm text-[#1A202C]">{user?.name}</div>
              {user?.title && <div className="text-xs text-[#FF8200] font-medium">{user.title}</div>}
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
