import React from "react";
import { useLocation } from "react-router-dom";
import { LogOut, Menu, PanelLeft } from "lucide-react";
import { useAuth, ROLE_LABELS } from "@/context/AuthContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const TITLES = {
  "/accueil": "Accueil intégré METFPA",
  "/pnd-402": "Vue PND 4.02",
  "/politique-eftp": "Politique EFTP 2026-2035",
  "/strategie-digitale": "Stratégie digitale 2026-2031",
  "/plan-action": "Plan d'action annuel",
  "/alignement": "Matrice d'alignement",
  "/kpi-cascade": "KPI en cascade",
  "/pilotage-directeur": "Vue Directeur",
  "/suivi-hebdo": "Suivi hebdomadaire",
  "/ordre-du-jour": "Ordre du jour",
  "/declinaison": "Déclinaison périodique",
  "/vue-directions": "Vue par Direction",
  "/reporting": "Reporting",
  "/_internal/scenario-formation": "Guide interne · équipe projet",
  "/decisions": "Registre des décisions",
  "/risks": "Registre des risques",
  "/budget-consolide": "Budget consolidé",
  "/admin-users": "Administration · Utilisateurs",
  "/audit-log": "Journal d'audit",
  "/imports": "Imports (dry-run)",
};

export function Header({ onToggleSidebar, onOpenDrawer, isMobile }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const title = TITLES[loc.pathname] || "Cockpit METFPA";
  const initials = (user?.name || "PM").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-20 h-[64px] bg-[var(--surface)] border-b border-[var(--border)] px-4 sm:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        {isMobile ? (
          <button data-testid="mobile-menu-button" onClick={onOpenDrawer} aria-label="Ouvrir le menu"
            className="w-9 h-9 rounded-[7px] border border-[var(--border)] flex items-center justify-center text-[var(--ink-700)] hover:bg-[var(--surface-soft)]">
            <Menu size={18} />
          </button>
        ) : (
          <button data-testid="header-sidebar-toggle" onClick={onToggleSidebar} aria-label="Replier ou déplier le menu"
            className="w-9 h-9 rounded-[7px] border border-[var(--border)] flex items-center justify-center text-[var(--ink-700)] hover:bg-[var(--surface-soft)]">
            <PanelLeft size={18} />
          </button>
        )}
        <h1 className="text-[17px] font-bold tracking-tight text-[var(--ink-900)] truncate" data-testid="header-title">{title}</h1>
        <span
          data-testid="preview-badge"
          title="Environnement de prévisualisation — non officiel"
          className="hidden sm:inline-flex items-center gap-1.5 h-6 px-2 rounded-full border border-[var(--ci-gold-600)]/40 bg-[var(--ci-gold-600)]/8 text-[10.5px] font-semibold tracking-[0.08em] uppercase text-[var(--ci-gold-600)]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ci-gold-600)]" />
          Preview DIRCAB
        </span>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="hidden md:flex flex-col items-end leading-tight mr-1" data-testid="header-role">
            <span className="text-[12px] font-semibold text-[var(--ink-900)]">{ROLE_LABELS[user.role] || user.role}</span>
            {user.direction && <span className="text-[10px] text-[var(--ci-gold-600)] font-medium">{user.direction}</span>}
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-testid="user-menu-trigger" className="outline-none">
              <div className="w-9 h-9 rounded-full bg-[var(--ink-900)] text-white flex items-center justify-center text-xs font-bold">{initials}</div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="font-semibold text-sm text-[var(--ink-900)]">{user?.name}</div>
              <div className="text-xs text-[var(--ci-orange-600)] font-medium">{ROLE_LABELS[user?.role] || user?.role}{user?.direction ? ` · ${user.direction}` : ""}</div>
              <div className="text-xs text-[var(--ink-500)] font-normal mt-0.5">{user?.email}</div>
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
