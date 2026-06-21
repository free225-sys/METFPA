import React, { useEffect, useMemo, useRef, useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { DemoBanner } from "@/components/DemoBanner";
import { Breadcrumb } from "@/components/Breadcrumb";
import { toast } from "sonner";
import { FileSpreadsheet, Upload, Trash2, ShieldAlert, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const VERDICT = {
  READY_FOR_REVIEW: { label: "Prêt pour revue", color: "#009E49", icon: CheckCircle2 },
  READY_WITH_WARNINGS: { label: "Prêt avec avertissements", color: "#C5A028", icon: AlertTriangle },
  BLOCKED_BY_ERRORS: { label: "Bloqué par des erreurs", color: "#C53030", icon: XCircle },
};
const OP_COLOR = { insert: "#009E49", update: "#1F6FEB", unchanged: "#718096", conflict: "#C5A028", reject: "#C53030" };

function Skeleton({ className }) { return <div className={`animate-pulse bg-[#E2E8F0] rounded-[4px] ${className}`} />; }

export default function ImportsDryRun() {
  const [jobs, setJobs] = useState(null);
  const [report, setReport] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [filters, setFilters] = useState({ sheet: "", op: "", severity: "" });
  const fileRef = useRef();

  const loadJobs = () => metfpaApi.get("/imports").then((r) => setJobs(r.data));
  useEffect(() => { loadJobs(); }, []);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true); setReport(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await metfpaApi.post("/imports/excel/dry-run", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setReport(r.data);
      toast.success("Dry-run terminé", { description: `Verdict : ${VERDICT[r.data.verdict]?.label}` });
      loadJobs();
    } catch (e) {
      toast.error("Échec du dry-run", { description: e?.response?.data?.detail || "Erreur" });
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const openJob = (id) => metfpaApi.get(`/imports/${id}`).then((r) => setReport(r.data));
  const del = async (id) => { try { await metfpaApi.delete(`/imports/${id}`); toast.success("Import supprimé (cleanup)"); if (report?.import_id === id) setReport(null); loadJobs(); } catch { toast.error("Échec suppression"); } };

  const rows = useMemo(() => (report?.rows || []).filter((r) =>
    (!filters.sheet || r.sheet === filters.sheet) &&
    (!filters.op || r.operation === filters.op) &&
    (!filters.severity || (filters.severity === "errors" ? r.errors.length : r.warnings.length))
  ), [report, filters]);

  const V = report && (VERDICT[report.verdict] || {});

  return (
    <div className="space-y-6 animate-slide-up" data-testid="page-imports">
      <Breadcrumb items={[{ label: "Imports Excel (dry-run)" }]} />
      <DemoBanner />

      <div className="rounded-[6px] border border-[#E2E8F0] bg-white p-6">
        <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#1A202C]"><FileSpreadsheet size={13} className="inline mr-1" /> Ingestion contrôlée</div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A202C] mt-1">Import Excel — dry-run uniquement</h1>
        <div className="flex items-start gap-2 rounded-[6px] border border-[#1F6FEB]/30 bg-[#1F6FEB]/8 px-4 py-2.5 mt-3" data-testid="dryrun-notice">
          <ShieldAlert size={15} className="text-[#1F6FEB] shrink-0 mt-0.5" />
          <p className="text-xs text-[#1A4E8A]"><strong>Dry-run uniquement — aucune donnée METFPA n'est modifiée.</strong> Le classeur est validé, classé et comparé ; aucun enregistrement n'est appliqué.</p>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <input ref={fileRef} data-testid="import-file-input" type="file" accept=".xlsx"
            onChange={(e) => upload(e.target.files?.[0])} className="hidden" />
          <button data-testid="import-upload-btn" disabled={uploading} onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-[6px] bg-[#1A202C] text-white px-4 py-2.5 text-sm font-medium hover:bg-black disabled:opacity-60">
            <Upload size={16} /> {uploading ? "Analyse…" : "Téléverser un .xlsx"}
          </button>
          <span className="text-xs text-[#A0AEC0]">Seuls les fichiers .xlsx sont acceptés. Aucun bouton « Appliquer ».</span>
        </div>
      </div>

      {report && (
        <div className="bg-white rounded-[4px] border border-[#E2E8F0] p-5" data-testid="dryrun-report">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                {V.icon && <V.icon size={20} style={{ color: V.color }} />}
                <span data-testid="dryrun-verdict" className="text-lg font-bold" style={{ color: V.color }}>{V.label}</span>
              </div>
              <p className="text-xs text-[#718096] mt-1">{report.filename} · SHA-256 {String(report.sha256).slice(0, 16)}… · {report.size_bytes} o · par {report.uploader} · {String(report.processed_at).slice(0, 19)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(report.totals).filter(([k]) => ["insert", "update", "unchanged", "conflict", "reject"].includes(k)).map(([k, v]) => (
                <span key={k} className="text-[11px] font-semibold px-2 py-1 rounded-[4px]" style={{ color: OP_COLOR[k], background: `${OP_COLOR[k]}14` }}>{k}: {v}</span>
              ))}
            </div>
          </div>

          {report.file_errors?.length > 0 && (
            <div className="mt-3 rounded-[6px] border border-[#C53030]/30 bg-[#C53030]/8 p-3">
              <ul className="text-xs text-[#C53030] space-y-1">{report.file_errors.map((e, i) => <li key={i}>• {e}</li>)}</ul>
            </div>
          )}
          {(report.missing_sheets?.length > 0 || report.unknown_sheets?.length > 0) && (
            <p className="text-xs text-[#8A6D1B] mt-2">{report.missing_sheets?.length ? `Feuilles manquantes : ${report.missing_sheets.join(", ")}. ` : ""}{report.unknown_sheets?.length ? `Feuilles inconnues : ${report.unknown_sheets.join(", ")}.` : ""}</p>
          )}

          {/* Sheet summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            {Object.entries(report.sheets || {}).map(([s, info]) => (
              <div key={s} className="rounded-[6px] border border-[#E2E8F0] p-2.5">
                <div className="text-xs font-semibold text-[#1A202C] truncate">{s}</div>
                <div className="text-[11px] text-[#718096]">{info.rows} lignes · {info.status}</div>
                {info.missing_columns?.length > 0 && <div className="text-[10px] text-[#C53030]">col. manquantes: {info.missing_columns.join(", ")}</div>}
              </div>
            ))}
          </div>

          {/* Filters + rows */}
          <div className="flex flex-wrap gap-2 mt-5 mb-2">
            <select data-testid="filter-sheet" value={filters.sheet} onChange={(e) => setFilters({ ...filters, sheet: e.target.value })} className="rounded-[6px] border border-[#E2E8F0] px-2 py-1 text-xs bg-white">
              <option value="">Toutes feuilles</option>{Object.keys(report.sheets || {}).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select data-testid="filter-op" value={filters.op} onChange={(e) => setFilters({ ...filters, op: e.target.value })} className="rounded-[6px] border border-[#E2E8F0] px-2 py-1 text-xs bg-white">
              <option value="">Toutes opérations</option>{["insert", "update", "unchanged", "conflict", "reject"].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select data-testid="filter-severity" value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })} className="rounded-[6px] border border-[#E2E8F0] px-2 py-1 text-xs bg-white">
              <option value="">Toutes sévérités</option><option value="errors">Avec erreurs</option><option value="warnings">Avec avertissements</option>
            </select>
            <span className="text-xs text-[#718096] self-center">{rows.length} ligne(s)</span>
          </div>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-[#E2E8F0] rounded-[6px]">
            <table className="w-full text-xs" data-testid="dryrun-rows">
              <thead className="bg-[#F7F7F5] text-[#718096] sticky top-0"><tr><th className="text-left px-3 py-2">Feuille</th><th className="text-left px-3 py-2">Ligne</th><th className="text-left px-3 py-2">Code</th><th className="text-left px-3 py-2">Opération</th><th className="text-left px-3 py-2">Erreurs / Avertissements</th></tr></thead>
              <tbody>
                {rows.slice(0, 300).map((r, i) => (
                  <tr key={i} className="border-t border-[#E2E8F0]">
                    <td className="px-3 py-2">{r.sheet}</td><td className="px-3 py-2">{r.row}</td><td className="px-3 py-2 font-mono">{r.code || "—"}</td>
                    <td className="px-3 py-2"><span className="font-semibold px-1.5 py-0.5 rounded-[3px]" style={{ color: OP_COLOR[r.operation], background: `${OP_COLOR[r.operation]}14` }}>{r.operation}</span></td>
                    <td className="px-3 py-2">{r.errors.map((e, j) => <div key={j} className="text-[#C53030]">• {e}</div>)}{r.warnings.map((w, j) => <div key={j} className="text-[#8A6D1B]">⚠ {w}</div>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[#A0AEC0] mt-2">Aucun bouton « Appliquer » : l'application des données interviendra en Phase 2B après validation.</p>
        </div>
      )}

      {/* Job history */}
      <div className="bg-white rounded-[4px] border border-[#E2E8F0] p-5">
        <h2 className="text-base font-semibold text-[#1A202C] mb-3">Historique des dry-runs</h2>
        {!jobs ? <Skeleton className="h-16" /> : jobs.length === 0 ? <p className="text-sm text-[#A0AEC0] italic">Aucun import enregistré.</p> : (
          <div className="space-y-2" data-testid="import-jobs">
            {jobs.map((j) => {
              const v = VERDICT[j.verdict] || {};
              return (
                <div key={j.import_id} data-testid={`import-job-${j.import_id}`} className="flex items-center justify-between gap-3 rounded-[6px] border border-[#E2E8F0] px-3 py-2">
                  <button onClick={() => openJob(j.import_id)} className="text-left min-w-0 flex-1 hover:underline">
                    <span className="text-sm font-medium text-[#1A202C]">{j.filename}</span>
                    <span className="text-[11px] text-[#718096] ml-2">{String(j.processed_at).slice(0, 19)}</span>
                  </button>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[4px] shrink-0" style={{ color: v.color, background: `${v.color}14` }}>{v.label}</span>
                  <button data-testid={`delete-import-${j.import_id}`} onClick={() => del(j.import_id)} className="w-7 h-7 rounded-[4px] text-[#4A5568] hover:bg-[#C53030]/10 hover:text-[#C53030] inline-flex items-center justify-center shrink-0"><Trash2 size={14} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
