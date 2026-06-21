import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import metfpaApi from "@/lib/metfpaApi";
import { fmtMillions } from "@/lib/format";
import { OriginBadge, MissingValue } from "@/components/OriginBadge";
import { DemoBanner } from "@/components/DemoBanner";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Gavel, AlertTriangle, CalendarClock, ShieldAlert, Wallet, BarChart3, StickyNote, ArrowRight, CheckCircle2, Siren, FileDown } from "lucide-react";
import { toast } from "sonner";

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }
const SEV_COLOR = { critique: "#C53030", eleve: "#FF8200", modere: "#C5A028", faible: "#718096" };
const STATUT_COLOR = { "Non démarré": "#718096", "À l'heure": "#1F6FEB", "En cours": "#C5A028", "En retard": "#FF8200", "Bloqué": "#C53030", "Achevé": "#009E49" };

export default function CabinetView() {
  const [c, setC] = useState(null);
  const [budget, setBudget] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [note, setNote] = useState(() => localStorage.getItem("metfpa_director_note") || "");
  const nav = useNavigate();

  useEffect(() => {
    metfpaApi.get("/cabinet").then((r) => setC(r.data));
    metfpaApi.get("/budget/consolidated").then((r) => setBudget(r.data));
    metfpaApi.get("/cabinet/alerts").then((r) => setAlerts(r.data));
  }, []);

  const saveNote = (v) => { setNote(v); localStorage.setItem("metfpa_director_note", v); };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const r = await metfpaApi.get(`/cabinet/export/pdf?note=${encodeURIComponent(note)}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `METFPA_Cabinet_Brief_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success("Note de Cabinet exportée (PDF)");
    } catch (e) {
      toast.error("Échec de l'export PDF", { description: e?.response?.status === 403 ? "Accès refusé" : "Erreur" });
    } finally { setExporting(false); }
  };

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-cabinet">
      <Breadcrumb items={[{ label: "Pilotage Directeur" }]} />
      <DemoBanner />

      <div className="rounded-[6px] border border-[#E2E8F0] bg-white p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#FF8200]">Cockpit décisionnel · Cabinet</div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">Pilotage Directeur — Secteur 4.02</h1>
            <p className="text-sm text-[#4A5568] mt-2 max-w-3xl">Synthèse décisionnelle en moins de deux minutes : décisions, alertes, échéances, risques, budget, avancement.</p>
          </div>
          <button data-testid="export-pdf-btn" onClick={exportPdf} disabled={exporting}
            className="shrink-0 inline-flex items-center gap-2 rounded-[6px] bg-[#1A202C] text-white px-4 py-2.5 text-sm font-medium hover:bg-black transition-colors disabled:opacity-60">
            <FileDown size={16} /> {exporting ? "Génération…" : "Exporter la note (PDF)"}
          </button>
        </div>
        <p className="text-[11px] text-[#A0AEC0] mt-3 flex items-center gap-1"><OriginBadge origin="demo_tracking" /> indicateurs opérationnels non officiels — synthèse décisionnelle ci-dessous.</p>
      </div>

      {/* ① Decisions requiring action */}
      <Section icon={Gavel} color="#6E40C9" title="① Décisions requises" testid="cabinet-decisions"
        action={<LinkBtn onClick={() => nav("/decisions")}>Registre des décisions</LinkBtn>}>
        {!c ? <Skeleton className="h-16" /> : c.decisions_required.length === 0 ? <Empty label="Aucune décision en attente." /> : (
          <div className="space-y-2">
            {c.decisions_required.map((d) => (
              <div key={d.id} data-testid={`cabinet-decision-${d.id}`} className="flex items-center justify-between gap-3 rounded-[6px] border border-[#E2E8F0] px-3 py-2.5 hover:bg-[#F7F7F5] cursor-pointer" onClick={() => nav("/decisions")}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#1A202C] truncate">{d.title}</div>
                  <div className="text-[11px] text-[#718096]">{d.decision_type} · demandé par {d.requested_by || "—"} {d.due_date && `· échéance ${d.due_date.slice(0, 10)}`}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusPill label={d.status} color="#6E40C9" />
                  <OriginBadge origin={d.data_origin} status={d.validation_status} />
                  <ArrowRight size={15} className="text-[#CBD5E0]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Executive alerts (deterministic, rule-based) */}
      <Section icon={Siren} color="#C53030" title="Alertes exécutives (règles déterministes)" testid="cabinet-exec-alerts"
        action={alerts && <span className="text-xs text-[#718096]">{alerts.counts.critique} critiques · {alerts.counts.eleve} élevées · {alerts.total} au total</span>}>
        {!alerts ? <Skeleton className="h-16" /> : alerts.alerts.length === 0 ? <Empty label="Aucune alerte déclenchée." /> : (
          <div className="space-y-2">
            {alerts.alerts.slice(0, 12).map((a) => (
              <div key={a.alert_id} data-testid={`exec-alert-${a.rule_id}`} className="flex items-start justify-between gap-3 rounded-[6px] border border-[#E2E8F0] px-3 py-2.5">
                <div className="min-w-0 flex items-start gap-2">
                  <SevPill sev={a.severity} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#1A202C]">{a.title} <span className="text-[10px] text-[#A0AEC0] font-normal">· {a.category}</span></div>
                    <div className="text-[11px] text-[#718096]">{a.description}</div>
                  </div>
                </div>
                <OriginBadge origin={a.data_origin} status={a.validation_status} />
              </div>
            ))}
            <p className="text-[11px] text-[#A0AEC0] mt-1">{alerts.rules_note}</p>
          </div>
        )}
      </Section>

      {/* ② Alerts & blockers */}
      <Section icon={AlertTriangle} color="#C53030" title="② Alertes & blocages" testid="cabinet-alerts">
        {!c ? <Skeleton className="h-16" /> : c.alerts.length === 0 ? <Empty label="Aucune alerte active." /> : (
          <div className="space-y-2">
            {c.alerts.slice(0, 8).map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-[6px] border border-[#E2E8F0] px-3 py-2">
                <div className="min-w-0"><span className="font-mono text-[11px] text-[#718096]">{a.code_action}</span> <span className="text-sm text-[#1A202C]">{a.intitule}</span>
                  {a.alerte && <div className="text-[11px] text-[#C53030] flex items-center gap-1 mt-0.5"><AlertTriangle size={10} />{a.alerte}</div>}
                </div>
                <StatusPill label={a.statut} color={STATUT_COLOR[a.statut]} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ③ Deadlines */}
      <Section icon={CalendarClock} color="#FF8200" title="③ Échéances (≤ 30 j) & retards" testid="cabinet-deadlines">
        {!c ? <Skeleton className="h-16" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DeadlineList title="Échéances proches" rows={c.deadlines_upcoming} empty="Aucune échéance dans les 30 jours." />
            <DeadlineList title="En retard" rows={c.deadlines_overdue} empty="Aucune activité en retard d'échéance." danger />
          </div>
        )}
      </Section>

      {/* ④ Risk exposure */}
      <Section icon={ShieldAlert} color="#C53030" title="④ Exposition aux risques" testid="cabinet-risks"
        action={<LinkBtn onClick={() => nav("/risks")}>Registre des risques</LinkBtn>}>
        {!c ? <Skeleton className="h-16" /> : c.risks_critical_high.length === 0 ? <Empty label="Aucun risque critique ou élevé enregistré." /> : (
          <div className="space-y-2">
            {c.risks_critical_high.map((r) => (
              <div key={r.id} data-testid={`cabinet-risk-${r.id}`} className="flex items-center justify-between gap-3 rounded-[6px] border border-[#E2E8F0] px-3 py-2.5">
                <div className="min-w-0"><div className="text-sm font-medium text-[#1A202C] truncate">{r.title}</div>
                  <div className="text-[11px] text-[#718096]">{r.category} · P{r.probability}×I{r.impact} = {r.risk_score} · {r.owner || "—"}</div></div>
                <div className="flex items-center gap-2 shrink-0"><SevPill sev={r.severity} /><OriginBadge origin={r.data_origin} status={r.validation_status} /></div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ⑤ Budget situation */}
      <Section icon={Wallet} color="#009E49" title="⑤ Situation budgétaire" testid="cabinet-budget"
        action={<LinkBtn onClick={() => nav("/budget-consolide")}>Budget consolidé</LinkBtn>}>
        {!budget ? <Skeleton className="h-16" /> : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {budget.items.map((f) => (
                <div key={f.framework} className="rounded-[6px] border border-[#E2E8F0] p-3">
                  <div className="text-[10px] font-bold uppercase text-[#718096]">{f.label}</div>
                  <div className="text-lg font-bold tabular-nums text-[#1A202C] mt-1">{fmtMillions(f.total)}</div>
                  <div className="text-[11px] text-[#718096]">{f.period} · moy/an {fmtMillions(f.annual_average)}</div>
                  <div className="mt-1.5"><OriginBadge status={f.validation_status} /></div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#A0AEC0] mt-2">Engagé / exécuté par activité : <MissingValue label="donnée absente" /> · {budget.annotation}</p>
          </>
        )}
      </Section>

      {/* ⑥ Progress analytics */}
      <Section icon={BarChart3} color="#1F6FEB" title="⑥ Avancement, KPI & fiabilité des données" testid="cabinet-progress">
        {!c ? <Skeleton className="h-16" /> : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5" data-testid="cabinet-kpis">
              <Kpi label="Décisions en attente" value={c.kpis.decisions_en_attente} color="#6E40C9" />
              <Kpi label="Risques critiques" value={c.kpis.risques_critiques} color="#C53030" pulse={c.kpis.risques_critiques > 0} />
              <Kpi label="Activités bloquées" value={c.kpis.bloques} color="#C53030" pulse={c.kpis.bloques > 0} />
              <Kpi label="En retard" value={c.kpis.en_retard} color="#FF8200" />
              <Kpi label="Alertes" value={c.kpis.alertes} color="#C5A028" />
              <Kpi label="Avancement moyen" value={`${c.kpis.avancement_moyen}%`} color="#009E49" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="text-xs font-semibold text-[#4A5568] mb-2">Répartition par statut ({c.progress_summary.total} activités)</div>
              <div className="space-y-1.5">
                {Object.entries(c.progress_summary.by_statut).map(([s, n]) => (
                  <div key={s} className="flex items-center gap-2">
                    <span className="text-xs w-24 text-[#718096]">{s}</span>
                    <div className="flex-1 h-3 rounded-[3px] bg-[#F1F1EF] overflow-hidden"><div className="h-full" style={{ width: `${(n / c.progress_summary.total) * 100}%`, background: STATUT_COLOR[s] || "#718096" }} /></div>
                    <span className="text-xs tabular-nums w-6 text-right">{n}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#4A5568] mb-2">Fiabilité des données financières</div>
              <ul className="space-y-1.5 text-xs">
                <RelRow label="Budget prévu renseigné (démo)" value={`${c.financial_reliability.budget_prevu_present}/62`} ok />
                <RelRow label="Budget engagé" value="manquant" miss n={c.financial_reliability.budget_engage_missing} />
                <RelRow label="Source de financement" value="manquant" miss n={c.financial_reliability.source_financement_missing} />
                <RelRow label="Directions" value="à valider" warn n={c.financial_reliability.directions_to_validate} />
              </ul>
            </div>
          </div>
          </>
        )}
      </Section>

      {/* ⑦ Director note */}
      <Section icon={StickyNote} color="#C5A028" title="⑦ Note du Directeur" testid="cabinet-note">
        <textarea data-testid="director-note" value={note} onChange={(e) => saveNote(e.target.value)} rows={4}
          placeholder="Synthèse, décisions à arbitrer, instructions…"
          className="w-full rounded-[6px] border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:border-[#C5A028]" />
        <p className="text-[11px] text-[#A0AEC0] mt-1">Note de démonstration (enregistrée localement). Export PDF = Phase 2.</p>
      </Section>
    </div>
  );
}

function Section({ icon: Icon, color, title, children, action, testid }) {
  return (
    <div data-testid={testid} className="bg-white rounded-[4px] border border-[#E2E8F0] p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold tracking-tight text-[#1A202C] flex items-center gap-2"><Icon size={17} style={{ color }} /> {title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
function Kpi({ label, value, color, pulse }) {
  return (
    <div className="rounded-[6px] border border-[#E2E8F0] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#718096]">{label}</div>
      <div className={`text-xl font-bold tabular-nums mt-0.5 ${pulse ? "pulse-red" : ""}`} style={{ color }}>{value}</div>
    </div>
  );
}
function DeadlineList({ title, rows, empty, danger }) {
  return (
    <div>
      <div className="text-xs font-semibold text-[#4A5568] mb-2">{title}</div>
      {rows.length === 0 ? <Empty label={empty} /> : (
        <div className="space-y-1.5">
          {rows.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 rounded-[6px] border border-[#E2E8F0] px-3 py-2 text-sm">
              <span className="truncate"><span className="font-mono text-[11px] text-[#718096]">{a.code_action}</span> {a.intitule}</span>
              <span className={`text-xs font-semibold shrink-0 ${danger ? "text-[#C53030]" : "text-[#FF8200]"}`}>{a.echeance}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function RelRow({ label, value, ok, miss, warn, n }) {
  const color = ok ? "#009E49" : miss ? "#C53030" : warn ? "#C5A028" : "#718096";
  return (
    <li className="flex items-center justify-between">
      <span className="text-[#4A5568]">{label}</span>
      <span className="font-semibold inline-flex items-center gap-1" style={{ color }}>
        {ok && <CheckCircle2 size={12} />}{value}{n != null && miss ? ` (${n})` : warn && n != null ? ` (${n})` : ""}
      </span>
    </li>
  );
}
function StatusPill({ label, color }) { return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[4px]" style={{ color, background: `${color}14` }}>{label}</span>; }
function SevPill({ sev }) { const c = SEV_COLOR[sev] || "#718096"; return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[4px] capitalize" style={{ color: c, background: `${c}14` }}>{sev}</span>; }
function Empty({ label }) { return <div data-testid="empty-state" className="text-sm text-[#A0AEC0] italic py-3 text-center rounded-[6px] border border-dashed border-[#E2E8F0]">{label}</div>; }
function LinkBtn({ onClick, children }) { return <button onClick={onClick} className="text-xs font-medium text-[#FF8200] hover:underline inline-flex items-center gap-1">{children} <ArrowRight size={12} /></button>; }
