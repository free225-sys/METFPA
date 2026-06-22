import React, { useEffect, useMemo, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { Breadcrumb } from "@/components/Breadcrumb";
import { fmtDateTime } from "@/lib/format";
import { History, ShieldCheck } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }

const ACTION_COLOR = {
  login_success: "#009E49", login_failed: "#C53030",
  promote_framework: "#6E40C9", admin_update_user: "#1F6FEB",
  update_activity: "#FF8200", create_decision: "#C5A028", create_risk: "#C5A028",
  import_dryrun_complete: "#1F6FEB", export_cabinet_pdf: "#009E49",
};

export default function AuditLog() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    metfpaApi.get("/audit-log").then((r) => setRows(r.data)).catch(() => setRows([]));
  }, []);

  const sorted = useMemo(() => {
    const list = [...(rows || [])].sort((a, b) => (b.horodatage || "").localeCompare(a.horodatage || ""));
    if (!q) return list.slice(0, 300);
    const t = q.toLowerCase();
    return list.filter((e) =>
      [e.action, e.entite, e.entite_id, e.user].some((v) => String(v || "").toLowerCase().includes(t))
    ).slice(0, 300);
  }, [rows, q]);

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-audit-log">
      <Breadcrumb items={[{ label: "Journal d'audit" }]} />

      <div className="rounded-[8px] border border-[#1A202C]/10 bg-gradient-to-br from-[#1A202C] to-[#2D3748] p-6 text-white">
        <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#C5A028]">
          <ShieldCheck size={13} className="inline mr-1" /> Traçabilité & gouvernance
        </div>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Journal d'audit</h1>
        <p className="text-sm text-white/70 mt-2 max-w-3xl">
          Traçabilité immuable des actions sensibles (connexions, mises à jour, promotions, imports, exports).
          Chaque écriture conserve l'acteur, l'horodatage et la valeur avant/après.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <input data-testid="audit-search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrer par action, entité, acteur…"
          className="w-full max-w-sm h-10 px-3.5 rounded-[6px] border border-[#E2E8F0] focus:border-[#FF8200] outline-none text-sm bg-white" />
        <span className="text-xs text-[#718096] whitespace-nowrap" data-testid="audit-count">{sorted.length} entrée(s)</span>
      </div>

      <div className="bg-white rounded-[8px] border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="audit-table">
            <thead className="bg-[#F7F7F5] text-[#718096] text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Horodatage</th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
                <th className="text-left px-4 py-3 font-semibold">Entité</th>
                <th className="text-left px-4 py-3 font-semibold">Référence</th>
                <th className="text-left px-4 py-3 font-semibold">Acteur</th>
              </tr>
            </thead>
            <tbody>
              {!rows ? [...Array(8)].map((_, i) => <tr key={i}><td colSpan={5} className="p-2"><Skeleton className="h-7" /></td></tr>) :
                sorted.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-[#A0AEC0] italic">Aucune entrée d'audit.</td></tr> :
                sorted.map((e, i) => (
                  <tr key={i} data-testid="audit-row" className="border-t border-[#E2E8F0] hover:bg-[#F7F7F5]">
                    <td className="px-4 py-2.5 text-xs text-[#718096] whitespace-nowrap tabular-nums">{fmtDateTime(e.horodatage)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-[4px]"
                        style={{ color: ACTION_COLOR[e.action] || "#4A5568", background: `${ACTION_COLOR[e.action] || "#4A5568"}14` }}>
                        <History size={11} />{e.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#1A202C]">{e.entite || "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-[#718096] max-w-[220px] truncate">{e.entite_id || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-[#4A5568]">{e.user || "système"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
