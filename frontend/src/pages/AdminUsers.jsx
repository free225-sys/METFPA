import React, { useEffect, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { useAuth, ROLE_LABELS } from "@/context/AuthContext";
import { DemoBanner } from "@/components/DemoBanner";
import { Breadcrumb } from "@/components/Breadcrumb";
import { toast } from "sonner";
import { ShieldCheck, Check, X } from "lucide-react";

const ROLES = ["cabinet_reader", "direction_editor", "me_validator", "admin"];
function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }

export default function AdminUsers() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const load = () => metfpaApi.get("/admin/users").then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);

  const patch = async (u, data) => {
    try {
      await metfpaApi.put(`/admin/users/${u.id}`, data);
      toast.success("Utilisateur mis à jour", { description: u.email });
      load();
    } catch (e) {
      toast.error("Échec", { description: e?.response?.data?.detail || "Erreur" });
    }
  };

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-admin-users">
      <Breadcrumb items={[{ label: "Administration · Utilisateurs" }]} />
      <DemoBanner />
      <div className="rounded-[6px] border border-[#E2E8F0] bg-white p-6">
        <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#1A202C]"><ShieldCheck size={13} className="inline mr-1" /> Administration (dev)</div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">Utilisateurs & rôles</h1>
        <p className="text-sm text-[#4A5568] mt-2">Attribution des rôles et directions sur la base de développement <strong>metfpa_dev</strong>. Toute modification est auditée. Le dernier administrateur actif ne peut être retiré.</p>
      </div>

      <div className="bg-white rounded-[4px] border border-[#E2E8F0] overflow-hidden">
        <table className="w-full text-sm" data-testid="users-table">
          <thead className="bg-[#F7F7F5] text-[#718096] text-[11px] uppercase tracking-wide">
            <tr><th className="text-left px-4 py-2.5 font-semibold">Email</th><th className="text-left px-4 py-2.5 font-semibold">Nom</th><th className="text-left px-4 py-2.5 font-semibold">Rôle</th><th className="text-left px-4 py-2.5 font-semibold">Direction</th><th className="text-left px-4 py-2.5 font-semibold">Actif</th></tr>
          </thead>
          <tbody>
            {!rows ? <tr><td colSpan={5} className="p-3"><Skeleton className="h-16" /></td></tr> :
              rows.map((u) => (
                <tr key={u.id} data-testid={`user-row-${u.email}`} className="border-t border-[#E2E8F0]">
                  <td className="px-4 py-2.5 font-medium text-[#1A202C]">{u.email}{u.email === user?.email && <span className="ml-2 text-[10px] text-[#FF8200]">(vous)</span>}</td>
                  <td className="px-4 py-2.5 text-xs">{u.name}</td>
                  <td className="px-4 py-2.5">
                    <select data-testid={`role-select-${u.email}`} value={u.role} onChange={(e) => patch(u, { role: e.target.value })}
                      className="rounded-[6px] border border-[#E2E8F0] px-2 py-1 text-xs bg-white focus:outline-none focus:border-[#FF8200]">
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <input data-testid={`direction-input-${u.email}`} defaultValue={u.direction || ""} placeholder="—"
                      onBlur={(e) => { if (e.target.value !== (u.direction || "")) patch(u, { direction: e.target.value || null }); }}
                      className="w-24 rounded-[6px] border border-[#E2E8F0] px-2 py-1 text-xs focus:outline-none focus:border-[#FF8200]" />
                  </td>
                  <td className="px-4 py-2.5">
                    <button data-testid={`toggle-active-${u.email}`} onClick={() => patch(u, { active: !u.active })}
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-[4px] ${u.active ? "text-[#009E49] bg-[#009E49]/10" : "text-[#C53030] bg-[#C53030]/10"}`}>
                      {u.active ? <Check size={12} /> : <X size={12} />}{u.active ? "Actif" : "Inactif"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
