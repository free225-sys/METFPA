import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import Login from "@/pages/Login";
import AccueilIntegre from "@/pages/AccueilIntegre";
import VuePND from "@/pages/VuePND";
import PolitiqueEFTP from "@/pages/PolitiqueEFTP";
import StrategieDigitale from "@/pages/StrategieDigitale";
import PlanAction from "@/pages/PlanAction";
import Alignement from "@/pages/Alignement";
import KpiCascade from "@/pages/KpiCascade";
import CabinetView from "@/pages/CabinetView";
import DecisionRegister from "@/pages/DecisionRegister";
import RiskRegister from "@/pages/RiskRegister";
import BudgetConsolide from "@/pages/BudgetConsolide";
import AdminUsers from "@/pages/AdminUsers";
import Dashboard from "@/pages/Dashboard";
import TreeView from "@/pages/TreeView";
import ActionsTable from "@/pages/ActionsTable";
import Analytics from "@/pages/Analytics";
import Alerts from "@/pages/Alerts";
import Ministries from "@/pages/Ministries";
import { Loader2, ShieldX } from "lucide-react";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading || user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5]">
        <Loader2 className="animate-spin text-[#FF8200]" size={28} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function AccessDenied() {
  return (
    <div data-testid="access-denied" className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-[#C53030]/10 flex items-center justify-center mb-4">
        <ShieldX className="text-[#C53030]" size={30} />
      </div>
      <h1 className="text-xl font-bold text-[#1A202C]">Accès refusé</h1>
      <p className="text-sm text-[#718096] mt-2 max-w-md">Votre rôle ne vous autorise pas à accéder à cette section. Contactez un administrateur si vous pensez qu'il s'agit d'une erreur.</p>
    </div>
  );
}

function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (user && roles.includes(user.role)) return children;
  return <AccessDenied />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<AccueilIntegre />} />
        <Route path="/pnd-402" element={<VuePND />} />
        <Route path="/politique-eftp" element={<PolitiqueEFTP />} />
        <Route path="/strategie-digitale" element={<StrategieDigitale />} />
        <Route path="/plan-action" element={<PlanAction />} />
        <Route path="/alignement" element={<Alignement />} />
        <Route path="/kpi-cascade" element={<KpiCascade />} />
        <Route path="/pilotage-directeur" element={<CabinetView />} />
        <Route path="/decisions" element={<DecisionRegister />} />
        <Route path="/risks" element={<RiskRegister />} />
        <Route path="/budget-consolide" element={<BudgetConsolide />} />
        <Route path="/admin-users" element={<RoleRoute roles={["admin"]}><AdminUsers /></RoleRoute>} />
        <Route path="/legacy-pnd" element={<Dashboard />} />
        <Route path="/arborescence" element={<TreeView />} />
        <Route path="/actions" element={<ActionsTable />} />
        <Route path="/ministeres" element={<Ministries />} />
        <Route path="/budget" element={<Analytics />} />
        <Route path="/alertes" element={<Alerts />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="bottom-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
