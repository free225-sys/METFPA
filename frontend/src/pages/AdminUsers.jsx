import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import metfpaApi from "@/lib/metfpaApi";
import { useAuth, ROLE_LABELS } from "@/context/AuthContext";
import { DemoBanner } from "@/components/DemoBanner";
import { Breadcrumb } from "@/components/Breadcrumb";
import { toast } from "sonner";
import { ShieldCheck, Check, X, Users, BadgeCheck } from "lucide-react";

const ROLES = ["admin", "dircab", "agency_director"];

// Read-only mirror of the server-side permission model
// (backend/metfpa/auth.py : EDIT_ROLES, VALIDATE_ROLES, DECISION_ROLES).
const ROLE_MATRIX = [
  { cap: "Consultation (pages, registres, référentiels, PDF)", roles: ROLES },
  { cap: "Mise à jour des missions opérationnelles", roles: ROLES, note: "direction d'agence : son périmètre uniquement · DIRCAB et admin : consolidation globale" },
  { cap: "Créer / éditer / clôturer des décisions", roles: ROLES, note: "arbitrage final : DIRCAB uniquement · direction d'agence : son périmètre uniquement" },
  { cap: "Préparer les réunions et relancer les directions", roles: ["dircab", "admin"] },
  { cap: "Créer / éditer / supprimer des risques", roles: ROLES, note: "direction d'agence : son périmètre uniquement" },
  { cap: "Validation des données (indicateurs, activités, registres)", roles: ["dircab", "admin"] },
  { cap: "Promotion des référentiels (PND / POL / DIG)", roles: ["dircab", "admin"] },
  { cap: "Imports Excel (dry-run)", roles: ["dircab", "admin"] },
  { cap: "Journal d'audit", roles: ["dircab", "admin"] },
  { cap: "Gestion des utilisateurs et des rôles", roles: ["admin"] },
];

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }

export default function AdminUsers() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "roles" ? "roles" : "users";
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

  const directions = useMemo(() => [...new Set((rows || []).map((u) => u.direction).filter(Boolean))].sort(), [rows]);

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-admin-users">
      <Breadcrumb items={[{ label: tab === "roles" ? "Administration · Rôles et directions" : "Administration · Utilisateurs" }]} />
      <DemoBanner />
      <div className="rounded-[6px] border border-[#E2E8F0] bg-white p-6">
        <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#1A202C]"><ShieldCheck size={13} className="inline mr-1" /> Administration</div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">Utilisateurs & rôles</h1>
        <p className="text-sm text-[#4A5568] mt-2">Attribution des trois profils d'accès et des agences. Toute modification est auditée. Le dernier administrateur actif ne peut être retiré.</p>
        <div className="flex gap-2 mt-4" role="tablist" data-testid="admin-tabs">
          <TabBtn testid="tab-users" active={tab === "users"} icon={Users} onClick={() => setSearchParams({})}>Utilisateurs</TabBtn>
          <TabBtn testid="tab-roles" active={tab === "roles"} icon={BadgeCheck} onClick={() => setSearchParams({ tab: "roles" })}>Rôles et directions</TabBtn>
        </div>
      </div>

      {tab === "roles" ? (
        <RolesTab directions={directions} loading={!rows} />
      ) : (
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
      )}
    </div>
  );
}

function TabBtn({ active, icon: Icon, onClick, children, testid }) {
  return (
    <button data-testid={testid} role="tab" aria-selected={active} onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] text-sm font-medium border transition-colors ${
        active ? "bg-[#1A202C] text-white border-[#1A202C]" : "bg-white text-[#4A5568] border-[#E2E8F0] hover:bg-[#F7F7F5]"
      }`}>
      <Icon size={15} /> {children}
    </button>
  );
}

// Read-only view: the permission model itself is defined server-side; changing
// it requires a code change, not an admin action.
function RolesTab({ directions, loading }) {
  return (
    <div className="space-y-6" data-testid="roles-tab">
      <div className="bg-white rounded-[4px] border border-[#E2E8F0] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E2E8F0]">
          <h2 className="text-base font-semibold text-[#1A202C]">Matrice des trois rôles (appliquée côté serveur)</h2>
          <p className="text-xs text-[#718096] mt-0.5">Lecture seule — reflet du modèle d'autorisation du backend.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="roles-matrix">
            <thead className="bg-[#F7F7F5] text-[#718096] text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold min-w-[260px]">Capacité</th>
                {ROLES.map((r) => <th key={r} className="text-center px-4 py-2.5 font-semibold">{ROLE_LABELS[r]}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROLE_MATRIX.map((row) => (
                <tr key={row.cap} className="border-t border-[#E2E8F0]">
                  <td className="px-4 py-2.5 text-[#1A202C]">{row.cap}{row.note && <div className="text-[11px] text-[#718096]">{row.note}</div>}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-4 py-2.5 text-center">
                      {row.roles.includes(r)
                        ? <Check size={15} className="inline text-[#009E49]" aria-label="autorisé" />
                        : <X size={15} className="inline text-[#CBD5E0]" aria-label="refusé" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-[4px] border border-[#E2E8F0] p-5" data-testid="directions-list">
        <h2 className="text-base font-semibold text-[#1A202C] mb-1">Agences en usage</h2>
        <p className="text-xs text-[#718096] mb-3">Agences actuellement assignées aux comptes « Direction d'agence ».</p>
        {loading ? <Skeleton className="h-8" /> : directions.length === 0
          ? <p className="text-sm text-[#A0AEC0] italic">Aucune direction assignée.</p>
          : <div className="flex flex-wrap gap-2">{directions.map((d) => (
              <span key={d} className="text-xs font-semibold px-2.5 py-1 rounded-[4px] bg-[#FF8200]/10 text-[#9A4D00]">{d}</span>
            ))}</div>}
      </div>
    </div>
  );
}
