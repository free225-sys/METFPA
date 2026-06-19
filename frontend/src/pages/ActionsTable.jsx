import React, { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { fmtMillions, fmtFCFA, fmtDate, STATUS_LABELS, STATUS_ORDER } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Pencil, Check, X, ChevronUp, ChevronDown, ChevronsUpDown, FileDown,
  ChevronLeft, ChevronRight,
} from "lucide-react";

const ALL = "__all__";

export default function ActionsTable() {
  const { search } = useOutletContext();
  const [filters, setFilters] = useState({ pillars: [], sectors: [], owners: [] });
  const [pillar, setPillar] = useState(ALL);
  const [sector, setSector] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [sort, setSort] = useState("code");
  const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editCode, setEditCode] = useState(null);
  const [draft, setDraft] = useState({});

  useEffect(() => { api.get("/filters").then((r) => setFilters(r.data)); }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, page_size: 12, sort, order };
    if (pillar !== ALL) params.pillar = pillar;
    if (sector !== ALL) params.sector = sector;
    if (status !== ALL) params.status = status;
    if (search) params.search = search;
    api.get("/actions", { params }).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [page, sort, order, pillar, sector, status, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [pillar, sector, status, search]);

  const toggleSort = (col) => {
    if (sort === col) setOrder(order === "asc" ? "desc" : "asc");
    else { setSort(col); setOrder("asc"); }
  };

  const startEdit = (a) => {
    setEditCode(a.code);
    setDraft({ title: a.title, owner: a.owner, progress: a.progress, status: a.status, end_date: a.end_date.slice(0, 10) });
  };

  const saveEdit = async (code) => {
    try {
      await api.put(`/actions/${code}`, {
        title: draft.title, owner: draft.owner, progress: Number(draft.progress),
        status: draft.status, end_date: new Date(draft.end_date).toISOString(),
      });
      toast.success("Action mise à jour", { description: `Code ${code} enregistré.` });
      setEditCode(null);
      load();
    } catch (e) {
      toast.error("Échec de la mise à jour");
    }
  };

  const exportFile = (type) => {
    toast.success(`Export ${type} en préparation`, {
      description: "Le fichier sera disponible dans quelques instants.",
    });
  };

  const sectorOptions = filters.sectors.filter((s) => pillar === ALL || s.pillar_code === pillar);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  const SortIcon = ({ col }) => {
    if (sort !== col) return <ChevronsUpDown size={13} className="text-[#CBD5E0]" />;
    return order === "asc" ? <ChevronUp size={13} className="text-[#FF8200]" /> : <ChevronDown size={13} className="text-[#FF8200]" />;
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Filters + export */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-[8px] p-3 border border-[#1A202C]/5 shadow-[0_2px_10px_rgba(26,32,44,0.04)]">
        <FilterSelect testid="filter-pillar" value={pillar} onChange={(v) => { setPillar(v); setSector(ALL); }}
          options={[{ v: ALL, l: "Tous les piliers" }, ...filters.pillars.map((p) => ({ v: p.code, l: `P${p.code} · ${p.name}` }))]} />
        <FilterSelect testid="filter-sector" value={sector} onChange={setSector}
          options={[{ v: ALL, l: "Tous les secteurs" }, ...sectorOptions.map((s) => ({ v: s.code, l: s.name }))]} />
        <FilterSelect testid="filter-status" value={status} onChange={setStatus}
          options={[{ v: ALL, l: "Tous les statuts" }, ...STATUS_ORDER.map((s) => ({ v: s, l: STATUS_LABELS[s] }))]} />
        <div className="flex-1" />
        <button data-testid="export-excel-button" onClick={() => exportFile("Excel")}
          className="h-9 px-3.5 rounded-[8px] bg-[#009E49] text-white text-sm font-medium hover:bg-[#009E49]/90 transition-colors flex items-center gap-2">
          <FileDown size={15} /> Excel
        </button>
        <button data-testid="export-pdf-button" onClick={() => exportFile("PDF")}
          className="h-9 px-3.5 rounded-[8px] bg-[#1A202C] text-white text-sm font-medium hover:bg-[#1A202C]/90 transition-colors flex items-center gap-2">
          <FileDown size={15} /> PDF
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[8px] border border-[#1A202C]/5 shadow-[0_2px_10px_rgba(26,32,44,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-[#F7F7F5] text-[10px] font-semibold uppercase tracking-[0.05em] text-[#718096]">
                {[["code", "Code"], ["title", "Intitulé"], ["owner", "Maître d'ouvrage"], ["total_budget", "Budget"], ["progress", "Avancement"], ["status", "Statut"], ["end_date", "Échéance"]].map(([col, lbl]) => (
                  <th key={col} className="text-left py-3 px-4 first:pl-6 cursor-pointer select-none" onClick={() => toggleSort(col)}>
                    <span className="inline-flex items-center gap-1">{lbl}<SortIcon col={col} /></span>
                  </th>
                ))}
                <th className="py-3 px-4 text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-[#E2E8F0]/50"><td colSpan={8} className="px-6 py-3"><div className="h-5 animate-pulse bg-[#E2E8F0] rounded" /></td></tr>
                ))
              ) : data.items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-[#718096] text-sm">Aucune action ne correspond aux filtres.</td></tr>
              ) : data.items.map((a) => {
                const editing = editCode === a.code;
                return (
                  <tr key={a.code} data-testid={`action-row-${a.code}`}
                    className="border-b border-[#E2E8F0]/50 hover:bg-[#FFF7ED] transition-colors group">
                    <td className="py-3 px-4 pl-6 text-xs font-mono font-semibold text-[#FF8200] whitespace-nowrap">{a.code}</td>
                    <td className="py-3 px-4 text-sm text-[#1A202C] max-w-[260px]">
                      {editing ? (
                        <input data-testid="edit-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                          className="w-full border border-[#FF8200]/50 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[#FF8200]/15" />
                      ) : <span className="block truncate">{a.title}</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#718096] max-w-[180px]">
                      {editing ? (
                        <input data-testid="edit-owner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
                          className="w-full border border-[#FF8200]/50 rounded px-2 py-1 text-xs outline-none" />
                      ) : <span className="block truncate">{a.owner}</span>}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-[#1A202C] tabular-nums whitespace-nowrap">{fmtMillions(a.total_budget)}</td>
                    <td className="py-3 px-4 w-40">
                      {editing ? (
                        <input data-testid="edit-progress" type="number" min="0" max="100" value={draft.progress}
                          onChange={(e) => setDraft({ ...draft, progress: e.target.value })}
                          className="w-16 border border-[#FF8200]/50 rounded px-2 py-1 text-sm outline-none" />
                      ) : <ProgressBar value={a.progress} showLabel />}
                    </td>
                    <td className="py-3 px-4">
                      {editing ? (
                        <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                          <SelectTrigger data-testid="edit-status" className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{STATUS_ORDER.map((s) => <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <StatusBadge status={a.status} />}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#4A5568] whitespace-nowrap">
                      {editing ? (
                        <input data-testid="edit-deadline" type="date" value={draft.end_date} onChange={(e) => setDraft({ ...draft, end_date: e.target.value })}
                          className="border border-[#FF8200]/50 rounded px-2 py-1 text-xs outline-none" />
                      ) : fmtDate(a.end_date)}
                    </td>
                    <td className="py-3 px-4 pr-6 text-right whitespace-nowrap">
                      {editing ? (
                        <div className="inline-flex gap-1">
                          <button data-testid="save-edit-button" onClick={() => saveEdit(a.code)} className="p-1.5 rounded bg-[#009E49] text-white hover:bg-[#009E49]/90"><Check size={14} /></button>
                          <button onClick={() => setEditCode(null)} className="p-1.5 rounded bg-gray-200 text-[#4A5568] hover:bg-gray-300"><X size={14} /></button>
                        </div>
                      ) : (
                        <button data-testid={`edit-button-${a.code}`} onClick={() => startEdit(a)}
                          className="p-1.5 rounded text-[#A0AEC0] hover:text-[#FF8200] hover:bg-[#FFF7ED] opacity-0 group-hover:opacity-100 transition-all">
                          <Pencil size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#E2E8F0]">
            <span className="text-xs text-[#718096]">
              {data.total.toLocaleString("fr-FR")} actions · page {data.page} / {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button data-testid="prev-page" disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="h-8 w-8 rounded-[8px] border border-[#E2E8F0] flex items-center justify-center disabled:opacity-40 hover:bg-[#F7F7F5] transition-colors"><ChevronLeft size={16} /></button>
              <button data-testid="next-page" disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                className="h-8 w-8 rounded-[8px] border border-[#E2E8F0] flex items-center justify-center disabled:opacity-40 hover:bg-[#F7F7F5] transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options, testid }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-testid={testid} className="h-9 w-auto min-w-[150px] max-w-[260px] rounded-[8px] border-[#E2E8F0] text-sm bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-[320px]">
        {options.map((o) => <SelectItem key={o.v} value={o.v} className="text-sm">{o.l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
