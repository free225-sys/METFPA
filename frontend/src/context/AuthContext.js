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
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const logout = async () => {
    try { await metfpaApi.post("/auth/logout"); } catch (e) {}
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
  admin: "Administrateur",
  me_validator: "Validateur M&E",
  direction_editor: "Éditeur Direction",
  cabinet_reader: "Lecteur Cabinet",
};
export const canEdit = (role) => ["direction_editor", "me_validator", "admin"].includes(role);
export const canValidate = (role) => ["me_validator", "admin"].includes(role);
export const isAdmin = (role) => role === "admin";
