import React, { useEffect, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { apiError, dateTime, pct, Pill } from "@/lib/operational";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DemoBanner } from "@/components/DemoBanner";
import { AlertTriangle, Building2, Loader2 } from "lucide-react";

export default function VueDirections() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { metfpaApi.get("/directions-performance").then((r) => setData(r.data)).catch((e) => setError(apiError(e))); }, []);
  return <div className="space-y-6 animate-slide-up" data-testid="page-vue-directions">
    <Breadcrumb items={[{ label: "Performance par direction" }]} /><DemoBanner />
    <div className="bg-white rounded-[8px] border border-[var(--border)] p-6"><div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[var(--ci-green-700)]"><Building2 size={13} className="inline mr-1" /> Consolidation directionnelle</div><h1 className="text-2xl font-bold mt-1">Vue par Direction</h1><p className="text-sm text-[var(--ink-700)] mt-2">Performance, complétude et fraîcheur des mises à jour. Une direction est à relancer après {data?.stale_after_days || 14} jours sans mise à jour.</p></div>
    {error ? <div className="p-5 border rounded-[8px] bg-white text-[#C93C37]"><AlertTriangle size={16} className="inline mr-2" />{error}</div> : !data ? <Loader2 className="animate-spin mx-auto" /> : <div className="bg-white border border-[var(--border)] rounded-[8px] overflow-x-auto"><table className="w-full text-sm" data-testid="directions-performance-table"><thead className="bg-[var(--surface-soft)] text-[11px] uppercase text-[var(--ink-500)]"><tr>{["Direction","Missions","Achevées","En cours","En retard","Exécution","Blocages","Décisions","Complétude","Dernière MAJ","Score","Suivi"].map((h) => <th key={h} className="text-left px-3 py-2.5 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{data.items.map((d) => <tr key={d.direction} className="border-t border-[var(--border)]"><Cell strong>{d.direction}</Cell><Cell>{d.missions_total}</Cell><Cell>{d.missions_completed}</Cell><Cell>{d.missions_in_progress}</Cell><Cell danger={d.missions_overdue}>{d.missions_overdue}</Cell><Cell>{pct(d.execution_rate)}</Cell><Cell danger={d.blockers}>{d.blockers}</Cell><Cell>{d.decisions_required}</Cell><Cell>{pct(d.completeness_rate)}</Cell><Cell>{dateTime(d.last_update)}</Cell><Cell>{d.update_score}/100</Cell><Cell>{d.needs_follow_up ? <Pill label="À relancer" color="#C93C37" /> : <Pill label="À jour" color="#16794A" />}</Cell></tr>)}</tbody></table></div>}
  </div>;
}
function Cell({ children, strong, danger }) { return <td className={`px-3 py-3 whitespace-nowrap ${strong ? "font-semibold" : ""} ${danger ? "text-[#C93C37] font-semibold" : ""}`}>{children}</td>; }
