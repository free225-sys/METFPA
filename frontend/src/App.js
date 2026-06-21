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
import Dashboard from "@/pages/Dashboard";
import TreeView from "@/pages/TreeView";
import ActionsTable from "@/pages/ActionsTable";
import Analytics from "@/pages/Analytics";
import Alerts from "@/pages/Alerts";
import Ministries from "@/pages/Ministries";
import { Loader2 } from "lucide-react";

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
