import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { fmtFCFA, fmtDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Ban, Clock, CircleSlash, BellRing, Send } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[8px] ${className}`} />; }

function AlertCard({ a, kind }) {
  const meta = {
    blocked: { tint: "border-l-red-600", icon: Ban, color: "text-red-600" },
    overdue: { tint: "border-l-[#FF8200]", icon: Clock, color: "text-[#FF8200]" },
    zero_budget: { tint: "border-l-[#C5A028]", icon: CircleSlash, color: "text-[#C5A028]" },
  }[kind];
  const remind = () => toast.success("Rappel envoyé", {
    description: `Notification transmise au ${a.owner}.`,
  });
  return (
    <div data-testid={`alert-card-${a.code}`}
      className={`bg-white rounded-[8px] border border-[#1A202C]/5 border-l-4 ${meta.tint} shadow-[0_2px_10px_rgba(26,32,44,0.04)] p-4 hover:shadow-[0_6px_20px_rgba(26,32,44,0.08)] transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold text-[#FF8200]">{a.code}</span>
            <StatusBadge status={a.status} />
          </div>
          <h4 className="text-sm font-semibold text-[#1A202C] mt-1.5 leading-snug">{a.title}</h4>
          <p className="text-xs text-[#718096] mt-1">{a.owner}</p>
        </div>
        <meta.icon size={18} className={`${meta.color} shrink-0`} strokeWidth={1.8} />
      </div>

      {a.blocked_reason && (
        <div className="mt-3 text-xs text-red-700 bg-red-50 rounded-[8px] px-3 py-2">{a.blocked_reason}</div>
      )}
      <div className="mt-3 flex items-center justify-between text-xs text-[#718096]">
        <div className="flex gap-4">
          <span>Échéance : <span className="font-medium text-[#1A202C]">{fmtDate(a.end_date)}</span></span>
          <span>Avancement : <span className="font-medium text-[#1A202C]">{a.progress}%</span></span>
          <span className="hidden md:inline">Budget : <span className="font-medium text-[#1A202C]">{fmtFCFA(a.total_budget)}</span></span>
        </div>
        <button data-testid={`remind-button-${a.code}`} onClick={remind}
          className="inline-flex items-center gap-1.5 text-[#1A202C] hover:bg-[#FFF7ED] rounded-[6px] px-2.5 py-1.5 font-medium transition-colors">
          <Send size={13} /> Envoyer un rappel
        </button>
      </div>
    </div>
  );
}

export default function Alerts() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get("/alerts").then((r) => setData(r.data)); }, []);

  const TABS = [
    { key: "blocked", label: "Actions bloquées", icon: Ban, desc: "Actions à l'arrêt nécessitant un arbitrage" },
    { key: "overdue", label: "Actions en retard", icon: Clock, desc: "Échéance dépassée et avancement < 50%" },
    { key: "zero_budget", label: "Budget nul", icon: CircleSlash, desc: "Actions sans dotation budgétaire" },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[8px] bg-red-50 flex items-center justify-center pulse-red">
          <BellRing size={18} className="text-red-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#1A202C]">Centre d'alertes</h2>
          <p className="text-sm text-[#718096]">Supervision des actions critiques du Plan</p>
        </div>
      </div>

      {!data ? (
        <div className="grid md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : (
        <Tabs defaultValue="blocked">
          <TabsList className="bg-white border border-[#E2E8F0] rounded-[8px] p-1 h-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} data-testid={`tab-${t.key}`}
                className="data-[state=active]:bg-[#1A202C] data-[state=active]:text-white rounded-[6px] px-4 py-2 text-sm flex items-center gap-2">
                <t.icon size={15} /> {t.label}
                <span className="ml-1 text-xs font-bold rounded-full bg-current/10 px-1.5 data-[state=active]:bg-white/20"
                  style={{ background: "rgba(0,0,0,0.06)" }}>{data.counts[t.key]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-5">
              <p className="text-sm text-[#718096] mb-4">{t.desc} · <span className="font-semibold text-[#1A202C]">{data[t.key].length} action(s)</span></p>
              {data[t.key].length === 0 ? (
                <div className="bg-white rounded-[8px] border border-[#1A202C]/5 p-12 text-center text-[#718096] text-sm">
                  Aucune alerte dans cette catégorie. 
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {data[t.key].slice(0, 40).map((a) => <AlertCard key={a.code} a={a} kind={t.key} />)}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
