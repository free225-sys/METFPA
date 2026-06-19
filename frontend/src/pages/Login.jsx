import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { CoatOfArms } from "@/components/icons/Ivorian";
import { Loader2, Lock } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("ministre@pnd.ci");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) navigate("/");
    else setError(res.error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5] px-4 relative overflow-hidden">
      {/* subtle flag accent bars */}
      <div className="absolute top-0 left-0 w-full h-1.5 flex">
        <div className="flex-1 bg-[#FF8200]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#009E49]" />
      </div>

      <div className="w-full max-w-md animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <CoatOfArms size={68} stroke="#C5A028" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#1A202C]">Cockpit PND 2026-2030</h1>
          <p className="text-sm text-[#718096] mt-1 font-medium tracking-wide">RÉPUBLIQUE DE CÔTE D'IVOIRE</p>
          <p className="text-xs text-[#A0AEC0] mt-2 text-center">Plan National de Développement · Pilotage stratégique</p>
        </div>

        <div className="bg-white rounded-[8px] shadow-[0_4px_24px_rgba(26,32,44,0.06)] border border-[#1A202C]/5 p-8">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold tracking-[0.05em] uppercase text-[#718096] mb-2">Adresse e-mail</label>
              <input
                data-testid="login-email-input"
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full h-11 px-3.5 rounded-[8px] border border-[#E2E8F0] focus:border-[#FF8200] focus:ring-2 focus:ring-[#FF8200]/15 outline-none text-sm transition-all"
                placeholder="ministre@pnd.ci"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-[0.05em] uppercase text-[#718096] mb-2">Mot de passe</label>
              <input
                data-testid="login-password-input"
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full h-11 px-3.5 rounded-[8px] border border-[#E2E8F0] focus:border-[#FF8200] focus:ring-2 focus:ring-[#FF8200]/15 outline-none text-sm transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div data-testid="login-error" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-[8px] px-3.5 py-2.5">
                {error}
              </div>
            )}

            <button
              data-testid="login-submit-button" type="submit" disabled={loading}
              className="w-full h-11 rounded-[8px] bg-[#1A202C] text-white font-semibold text-sm hover:bg-[#1A202C]/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} strokeWidth={2} />}
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-[#A0AEC0] mt-6">Accès réservé aux institutions de l'État · Confidentiel</p>
      </div>
    </div>
  );
}
