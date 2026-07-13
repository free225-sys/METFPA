import React, { createContext, useContext, useEffect, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { formatApiErrorDetail } from "@/lib/api";

const AuthContext = createContext(null);
const TOKEN_KEY = "metfpa_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = logged out
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setUser(false); setLoading(false); return; }
    metfpaApi.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => { localStorage.removeItem(TOKEN_KEY); setUser(false); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await metfpaApi.post("/auth/login", { email, password });
      localStorage.setItem(TOKEN_KEY, data.access_token);
      setUser(data.user);
      return { ok: true, user: data.user };
    } catch (e) {
      const status = e.response?.status;
      let error;
      if (status === 401) error = "Adresse e-mail ou mot de passe incorrect.";
      else if (status === 403) error = "Ce compte n'est pas autorisé à accéder au cockpit.";
      else if (status === 422) error = "Les informations saisies sont invalides.";
      else if (status >= 500) error = "Une erreur serveur empêche actuellement la connexion.";
      else if (!e.response) error = "Le service d'authentification est momentanément indisponible.";
      else error = formatApiErrorDetail(e.response?.data?.detail) || "Une erreur est survenue. Veuillez réessayer.";
      return { ok: false, error };
    }
  };

  const logout = async () => {
    try { await metfpaApi.post("/auth/logout"); }
    catch (error) { console.error("Logout request failed:", error); }
    localStorage.removeItem(TOKEN_KEY);
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Role helpers
export const ROLE_LABELS = {
  admin: "Administrateur système",
  me_validator: "Validateur Suivi-Évaluation",
  direction_editor: "Point focal Direction",
  dircab: "DIRCAB / Cabinet décisionnel",
  coordination: "Chef de cabinet / Coordination",
};

// Role-specific operational landing page
export const ROLE_HOME = {
  direction_editor: "/ma-direction",
  me_validator: "/kpi-cascade",
  admin: "/admin-users",
  dircab: "/pilotage-directeur",
  coordination: "/pilotage-directeur",
};
export const roleHome = (role) => ROLE_HOME[role] || "/pilotage-directeur";

export const canEdit = (role) => ["direction_editor", "me_validator", "admin"].includes(role);
export const canValidate = (role) => ["me_validator", "admin"].includes(role);
export const isAdmin = (role) => role === "admin";
// DIRCAB workflow: decision management (create/update/close, arbitration, relances)
export const canManageDecisions = (role) => ["direction_editor", "me_validator", "admin", "dircab", "coordination"].includes(role);
export const isDircab = (role) => role === "dircab";
export const isCoordination = (role) => role === "coordination";
