import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Minimize2 } from "lucide-react";

export function Layout() {
  const [search, setSearch] = useState("");
  const [presentation, setPresentation] = useState(false);

  if (presentation) {
    return (
      <div className="min-h-screen bg-[#0B0E14] p-8">
        <button data-testid="exit-presentation-button" onClick={() => setPresentation(false)}
          className="fixed top-5 right-6 z-50 inline-flex items-center gap-2 rounded-[6px] bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 text-sm font-medium transition-colors border border-white/15">
          <Minimize2 size={15} /> Quitter la présentation
        </button>
        <div className="presentation-scope">
          <Outlet context={{ search, presentation: true }} />
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Sidebar />
      <Header onSearch={setSearch} onPresentation={() => setPresentation(true)} />
      <main className="ml-[280px] mt-[64px] min-h-[calc(100vh-64px)] bg-[#F7F7F5] p-8">
        <Outlet context={{ search, presentation: false }} />
      </main>
    </div>
  );
}
