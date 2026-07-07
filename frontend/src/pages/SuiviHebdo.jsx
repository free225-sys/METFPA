import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import metfpaApi from "@/lib/metfpaApi";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DemoBanner } from "@/components/DemoBanner";
import { useAuth, isDircab, isAdmin } from "@/context/AuthContext";
import { getRelances, addRelance, updateRelance, getMeetingNotes, subscribeDemoStore } from "@/lib/demoStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarClock, AlertTriangle, Gavel, Send, Siren, Users2, History, ArrowRight, Plus, CheckCircle2 } from "lucide-react";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }
const STATUT_COLOR = { "Non démarré": "#718096", "À l'heure": "#1F6FEB", "En cours": "#C5A028", "En retard": "#FF8200", "Bloqué": "#C53030", "Achevé": "#009E49", "Suspendu": "#7C3AED" };

function currentQuarter() {
  const d = new Date();
  return `${d.getFullYear()}-T${Math.floor(d.getMonth() / 3) + 1}`;
}

export default function SuiviHebdo() {
  const { user } = useAuth();
  const nav = useNavigate();
  const canRelancer = isDircab(user?.role) || isAdmin(user?.role);
  const [acts, setActs] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [, forceTick] = useState(0);
  const [relanceDialog, setRelanceDialog] = useState(false);

  useEffect(() => {
    metfpaApi.get("/activities").then((r) => setActs(r.data));
    metfpaApi.get("/decisions").then((r) => setDecisions(r.data)).catch(() => {});
    metfpaApi.get("/cabinet/alerts").then((r) => setAlerts(r.data)).catch(() => {});
    return subscribeDemoStore(() => forceTick((t) => t + 1));
  }, []);

  const relances = getRelances();
  const meeting = getMeetingNotes();
  const trim = currentQuarter();

  const w = useMemo(() => {
    const list = acts || [];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    return {
      semaine: list.filter((a) => a.statut !== "Achevé" && (a.echeance === trim || (a.derniere_maj || "") >= weekAgo)),
      retard: list.filter((a) => a.statut === "En retard"),
      bloque: list.filter((a) => a.statut === "Bloqué"),
      decisionsAttente: decisions.filter((d) => ["draft", "pending"].includes(d.status) || d.arbitrage === "a_arbitrer"),
      directionsARelancer: [...new Set([
        ...list.filter((a) => ["En retard", "Bloqué"].includes(a.statut)).map((a) => a.direction),
        ...relances.filter((r) => r.statut === "ouverte").map((r) => r.direction),
      ].filter(Boolean))].sort(),
      dernieresDecisions: decisions.filter((d) => d.decision_date || ["approved", "implemented"].includes(d.status))
        .sort((a, b) => (b.decision_date || b.updated_at || "").localeCompare(a.decision_date || a.updated_at || "")).slice(0, 5),
    };
  }, [acts, decisions, relances, trim]);

  const critAlerts = (alerts?.alerts || []).filter((a) => ["critique", "eleve"].includes(a.severity)).slice(0, 8);

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-suivi-hebdo">
      <Breadcrumb items={[{ label: "Suivi hebdomadaire" }]} />
      <DemoBanner />
      <div className="rounded-[8px] border border-[#E2E8F0] bg-white p-6">
        <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#FF8200]"><CalendarClock size={13} className="inline mr-1" /> Rythme hebdomadaire · {trim}</div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">Suivi hebdomadaire</h1>
        <p className="text-sm text-[#4A5568] mt-2 max-w-3xl">Vue de la semaine : actions actives, retards, blocages, décisions en attente, directions à relancer et alertes. Les relances sont en <strong>mode démonstration (stockage local)</strong>.</p>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mt-5" data-testid="hebdo-kpis">
          <K label="Actions de la semaine" value={w.semaine.length} color="#1F6FEB" />
          <K label="En retard" value={w.retard.length} color="#FF8200" />
          <K label="Bloquées" value={w.bloque.length} color="#C53030" />
          <K label="Décisions en attente" value={w.decisionsAttente.length} color="#C89A2B" />
          <K label="Directions à relancer" value={w.directionsARelancer.length} color="#7C3AED" />
          <K label="Relances ouvertes" value={relances.filter((r) => r.statut === "ouverte").length} color="#D97706" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section icon={CalendarClock} color="#1F6FEB" title="Actions de la semaine" testid="hebdo-semaine">
          {!acts ? <Skeleton className="h-16" /> : <ActList rows={w.semaine.slice(0, 8)} empty="Aucune action active cette semaine." />}
        </Section>
        <Section icon={AlertTriangle} color="#C53030" title="Retards & blocages" testid="hebdo-retards">
          {!acts ? <Skeleton className="h-16" /> : <ActList rows={[...w.bloque, ...w.retard].slice(0, 8)} empty="Aucun retard ni blocage." />}
        </Section>

        <Section icon={Gavel} color="#C89A2B" title="Décisions en attente" testid="hebdo-decisions"
          action={<button onClick={() => nav("/decisions")} className="text-xs font-medium text-[#FF8200] hover:underline inline-flex items-center gap-1">Registre <ArrowRight size={12} /></button>}>
          {w.decisionsAttente.length === 0 ? <Empty label="Aucune décision en attente." /> : (
            <div className="space-y-1.5">{w.decisionsAttente.slice(0, 6).map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 rounded-[6px] border border-[#E2E8F0] px-3 py-2 text-sm">
                <span className="truncate text-[#1A202C]">{d.title}</span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {d.arbitrage === "a_arbitrer" && <Pill label="À arbitrer" color="#7C3AED" />}
                  <Pill label={d.status} color="#C89A2B" />
                </span>
              </div>))}</div>
          )}
        </Section>

        <Section icon={Siren} color="#FF8200" title="Alertes de la semaine" testid="hebdo-alertes">
          {!alerts ? <Skeleton className="h-16" /> : critAlerts.length === 0 ? <Empty label="Aucune alerte critique ou élevée." /> : (
            <div className="space-y-1.5">{critAlerts.map((a) => (
              <div key={a.alert_id} className="flex items-start gap-2 rounded-[6px] border border-[#E2E8F0] px-3 py-2 text-sm">
                <Pill label={a.severity} color={a.severity === "critique" ? "#C53030" : "#FF8200"} />
                <span className="text-[#1A202C] min-w-0"><span className="font-medium">{a.title}</span> <span className="text-[11px] text-[#718096]">{a.description}</span></span>
              </div>))}</div>
          )}
        </Section>

        <Section icon={Users2} color="#7C3AED" title="Directions à relancer" testid="hebdo-directions">
          {w.directionsARelancer.length === 0 ? <Empty label="Aucune direction à relancer." /> : (
            <div className="flex flex-wrap gap-2">{w.directionsARelancer.map((d) => (
              <span key={d} className="text-xs font-semibold px-2.5 py-1 rounded-[4px] bg-[#7C3AED]/10 text-[#5B21B6]">{d}</span>))}</div>
          )}
        </Section>

        <Section icon={History} color="#009E49" title="Décisions de la dernière réunion" testid="hebdo-reunion">
          {w.dernieresDecisions.length === 0 && meeting.length === 0 ? <Empty label="Aucune décision récente enregistrée." /> : (
            <div className="space-y-1.5">
              {w.dernieresDecisions.map((d) => (
                <div key={d.id} className="flex items-center gap-2 rounded-[6px] border border-[#E2E8F0] px-3 py-2 text-sm">
                  <CheckCircle2 size={13} className="text-[#009E49] shrink-0" /><span className="truncate">{d.title}</span>
                  <span className="ml-auto text-[11px] text-[#718096] shrink-0">{(d.decision_date || "").slice(0, 10)}</span>
                </div>))}
              {meeting.map((m, i) => (
                <div key={i} className="rounded-[6px] border border-dashed border-[#E2E8F0] px-3 py-2 text-sm text-[#4A5568]">{m.text} <span className="text-[10px] text-[#A0AEC0]">(synthèse démo)</span></div>))}
            </div>
          )}
        </Section>

        <Section icon={Send} color="#D97706" title="Relances (démo · stockage local)" testid="hebdo-relances"
          action={canRelancer && <button data-testid="add-relance-btn" onClick={() => setRelanceDialog(true)} className="inline-flex items-center gap-1 text-xs font-medium text-[#D97706] hover:underline"><Plus size={13} /> Nouvelle relance</button>}>
          {relances.length === 0 ? <Empty label="Aucune relance enregistrée." /> : (
            <div className="space-y-1.5">{relances.slice().reverse().slice(0, 8).map((r) => (
              <div key={r.id} data-testid={`relance-${r.id}`} className="flex items-center justify-between gap-2 rounded-[6px] border border-[#E2E8F0] px-3 py-2 text-sm">
                <span className="min-w-0 truncate"><strong className="text-[#5B21B6]">{r.direction}</strong> · {r.objet}{r.echeance && <span className="text-[11px] text-[#718096]"> — échéance {r.echeance}</span>}</span>
                {canRelancer && r.statut === "ouverte"
                  ? <button onClick={() => { updateRelance(r.id, { statut: "clôturée" }); toast.success("Relance clôturée (démo)"); }} className="shrink-0 text-[11px] font-medium text-[#009E49] hover:underline">Clôturer</button>
                  : <Pill label={r.statut} color={r.statut === "ouverte" ? "#D97706" : "#009E49"} />}
              </div>))}</div>
          )}
        </Section>
      </div>

      <RelanceDialog open={relanceDialog} onClose={() => setRelanceDialog(false)}
        directions={[...new Set((acts || []).map((a) => a.direction).filter(Boolean))].sort()} />
    </div>
  );
}

function RelanceDialog({ open, onClose, directions }) {
  const [f, setF] = useState({ direction: "", objet: "", echeance: "" });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="relance-dialog" className="max-w-md">
        <DialogHeader><DialogTitle>Affecter une relance</DialogTitle>
          <DialogDescription className="text-xs text-[#718096]">Mode démonstration : la relance est stockée localement (pas de persistance serveur).</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <label className="block"><span className="text-xs font-semibold text-[#4A5568]">Direction *</span>
            <select data-testid="relance-direction" value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value })} className="mt-1 w-full rounded-[6px] border border-[#E2E8F0] px-3 py-2 text-sm bg-white">
              <option value="">—</option>{directions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select></label>
          <label className="block"><span className="text-xs font-semibold text-[#4A5568]">Objet *</span>
            <input data-testid="relance-objet" value={f.objet} onChange={(e) => setF({ ...f, objet: e.target.value })} className="mt-1 w-full rounded-[6px] border border-[#E2E8F0] px-3 py-2 text-sm" placeholder="ex. Transmettre l'état d'exécution T3" /></label>
          <label className="block"><span className="text-xs font-semibold text-[#4A5568]">Échéance</span>
            <input type="date" value={f.echeance} onChange={(e) => setF({ ...f, echeance: e.target.value })} className="mt-1 w-full rounded-[6px] border border-[#E2E8F0] px-3 py-2 text-sm" /></label>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-[6px] border border-[#E2E8F0] text-[#4A5568]">Annuler</button>
          <button data-testid="relance-confirm" disabled={!f.direction || !f.objet.trim()}
            onClick={() => { addRelance(f); toast.success("Relance affectée (démo)", { description: `${f.direction} · ${f.objet}` }); setF({ direction: "", objet: "", echeance: "" }); onClose(); }}
            className="px-4 py-2 text-sm rounded-[6px] bg-[#D97706] text-white font-medium disabled:opacity-40">Affecter</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActList({ rows, empty }) {
  if (!rows.length) return <Empty label={empty} />;
  return (
    <div className="space-y-1.5">{rows.map((a) => (
      <div key={a.id} className="flex items-center justify-between gap-2 rounded-[6px] border border-[#E2E8F0] px-3 py-2 text-sm">
        <span className="min-w-0 truncate"><span className="font-mono text-[11px] text-[#718096]">{a.code_action}</span> {a.intitule}</span>
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-[#718096]">{a.direction}</span>
          <Pill label={a.statut} color={STATUT_COLOR[a.statut] || "#718096"} />
        </span>
      </div>))}</div>
  );
}

function Section({ icon: Icon, color, title, children, action, testid }) {
  return (
    <div data-testid={testid} className="bg-white rounded-[8px] border border-[#E2E8F0] p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#1A202C] flex items-center gap-2"><Icon size={15} style={{ color }} /> {title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
function K({ label, value, color }) {
  return (<div className="rounded-[6px] border border-[#E2E8F0] p-3">
    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#718096]">{label}</div>
    <div className="text-2xl font-bold tabular-nums mt-0.5" style={{ color }}>{value}</div>
  </div>);
}
function Pill({ label, color }) { return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[4px] capitalize whitespace-nowrap" style={{ color, background: `${color}14` }}>{label}</span>; }
function Empty({ label }) { return <div className="text-sm text-[#A0AEC0] italic py-3 text-center rounded-[6px] border border-dashed border-[#E2E8F0]">{label}</div>; }
