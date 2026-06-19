import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export function Layout() {
  const [search, setSearch] = useState("");
  return (
    <div className="App">
      <Sidebar />
      <Header onSearch={setSearch} />
      <main className="ml-[280px] mt-[64px] min-h-[calc(100vh-64px)] bg-[#F7F7F5] p-8">
        <Outlet context={{ search }} />
      </main>
    </div>
  );
}
