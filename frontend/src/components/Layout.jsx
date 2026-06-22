import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

const STORE_KEY = "metfpa_sidebar_collapsed";

export function Layout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORE_KEY) === "1");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 1023px)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggle = () => setCollapsed((c) => { localStorage.setItem(STORE_KEY, !c ? "1" : "0"); return !c; });
  const railWidth = collapsed ? 76 : 280;
  // On mobile the sidebar is an off-canvas drawer (always expanded labels).
  const effectiveCollapsed = isMobile ? false : collapsed;

  return (
    <div className="min-h-screen bg-[var(--surface-soft)]">
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div data-testid="sidebar-overlay" onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-[var(--ink-900)]/45 z-40 lg:hidden" />
      )}

      {/* Sidebar (fixed desktop rail / off-canvas mobile drawer) */}
      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:translate-x-0 ${
        isMobile ? (mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full") : "translate-x-0"
      }`}>
        <Sidebar collapsed={effectiveCollapsed} onToggle={toggle} onNavigate={() => setMobileOpen(false)} />
      </div>

      {/* Main column */}
      <div style={{ marginLeft: isMobile ? 0 : railWidth }} className="transition-[margin] duration-200">
        <Header collapsed={collapsed} onToggleSidebar={toggle} onOpenDrawer={() => setMobileOpen(true)} isMobile={isMobile} />
        <main>
          <div className="mx-auto w-full max-w-[1560px] px-5 sm:px-8 py-7">
            <Outlet context={{ search: "" }} />
          </div>
        </main>
      </div>
    </div>
  );
}
