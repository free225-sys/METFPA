import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { fmtMillions, fmtFCFA, fmtDate, fmtDateLong, fmtDateTime, pillarColor, STATUS_LABELS, STATUS_ORDER } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronRight, Search, X, Save, History, MessageSquare, FileText, Send } from "lucide-react";

function flattenActions(nodes, acc = []) {
  for (const n of nodes) {
    if (n.level === "action") acc.push(n);
    else if (n.children) flattenActions(n.children, acc);
  }
  return acc;
}

function buildVisibleRows(nodes, expanded, depth = 0, acc = []) {
  for (const node of nodes) {
    acc.push({ node, depth });
    if (node.level !== "action" && expanded.has(node.code) && node.children?.length) {
      buildVisibleRows(node.children, expanded, depth + 1, acc);
    }
  }
  return acc;
}

export default function TreeView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tree, setTree] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [query, setQuery] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [owners, setOwners] = useState([]);

  const loadTree = useCallback(() => api.get("/tree").then((r) => {
    setTree(r.data);
    setExpanded((prev) => prev.size ? prev : new Set(r.data.map((p) => p.code)));
  }), []);

  useEffect(() => { loadTree(); api.get("/filters").then((r) => setOwners(r.data.owners)); }, [loadTree]);

  const openAction = useCallback(async (code) => {
    setSelected(code);
    setDetail(null);
    const { data } = await api.get(`/actions/${code}`);
    setDetail(data);
  }, []);

  // Deep-link via ?focus=code
  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus && tree) {
      const parts = focus.split(".");
      const codes = [parts[0], `${parts[0]}.${parts[1]}`, `${parts[0]}.${parts[1]}.${parts[2]}`, `${parts[0]}.${parts[1]}.${parts[2]}.${parts[3]}`];
      setExpanded((prev) => new Set([...prev, ...codes]));
      openAction(focus);
      searchParams.delete("focus");
      setSearchParams(searchParams, { replace: true });
    }
  }, [tree, searchParams, openAction, setSearchParams]);

  const allActions = useMemo(() => (tree ? flattenActions(tree) : []), [tree]);
  const visibleRows = useMemo(() => (tree ? buildVisibleRows(tree, expanded) : []), [tree, expanded]);
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allActions.filter((a) => a.name.toLowerCase().includes(q) || a.code.includes(q)).slice(0, 8);
  }, [query, allActions]);

  const toggle = (code) => setExpanded((prev) => {
    const next = new Set(prev);
    next.has(code) ? next.delete(code) : next.add(code);
    return next;
  });

  const jumpTo = (action) => {
    const parts = action.code.split(".");
    const codes = [parts[0], `${parts[0]}.${parts[1]}`, `${parts[0]}.${parts[1]}.${parts[2]}`, `${parts[0]}.${parts[1]}.${parts[2]}.${parts[3]}`];
    setExpanded((prev) => new Set([...prev, ...codes]));
    setQuery(""); setShowSuggest(false);
    openAction(action.code);
  };

  return (
    <div className="animate-slide-up">
      <div className="relative mb-5 max-w-xl">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0AEC0]" />
        <input data-testid="tree-search-input" value={query}
          onChange={(e) => { setQuery(e.target.value); setShowSuggest(true); }} onFocus={() => setShowSuggest(true)}
          placeholder="Rechercher une action par intitulé ou code…"
          className="w-full h-11 pl-10 pr-3 rounded-[6px] bg-white border border-[#E2E8F0] focus:border-[#FF8200] focus:ring-2 focus:ring-[#FF8200]/15 outline-none text-sm transition-all" />
        {showSuggest && suggestions.length > 0 && (
          <div className="absolute z-20 mt-2 w-full bg-white rounded-[6px] border border-[#E2E8F0] shadow-lg overflow-hidden">
            {suggestions.map((s) => (
              <button key={s.code} onClick={() => jumpTo(s)} data-testid={`suggest-${s.code}`}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#FFF7ED] text-left transition-colors">
                <span className="text-[10px] font-mono font-semibold w-20 shrink-0" style={{ color: pillarColor(s.code) }}>{s.code}</span>
                <span className="text-sm text-[#1A202C] truncate flex-1">{s.name}</span>
                <StatusBadge status={s.status} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-[4px] border border-[#E2E8F0] p-3">
        <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-[#718096]">
          <span className="w-4" /><span className="w-1.5" /><span className="w-20">Code</span>
          <span className="flex-1">Intitulé</span>
          <span className="w-24 hidden md:block text-center">Avancement</span>
          <span className="w-20 text-right">Budget</span>
        </div>
        {!tree ? (
          <div className="space-y-2 p-2">{[...Array(8)].map((_, i) => <div key={i} className="h-9 animate-pulse bg-[#E2E8F0] rounded-[4px]" />)}</div>
        ) : visibleRows.map(({ node, depth }) => {
          const c = pillarColor(node.code);
          const isAction = node.level === "action";
          const isOpen = expanded.has(node.code);
          const hasChildren = node.children && node.children.length > 0;
          const isSel = selected === node.code;
          return (
            <div key={node.code} data-testid={`tree-node-${node.level}-${node.code}`}
              onClick={() => (isAction ? openAction(node.code) : toggle(node.code))}
              className="flex items-center gap-2 py-2 pr-3 rounded-[4px] cursor-pointer transition-colors"
              style={{ paddingLeft: depth * 20 + 8, background: isSel ? "#FFF7ED" : "transparent",
                       borderLeft: isSel ? `3px solid ${c}` : "3px solid transparent" }}
              onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "#F7F7F5"; }}
              onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}>
              <span className="w-4 shrink-0 flex justify-center">
                {hasChildren && !isAction && <ChevronRight size={15} className="text-[#A0AEC0] transition-transform" style={{ transform: isOpen ? "rotate(90deg)" : "none" }} />}
              </span>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} />
              <span className={`text-[10px] font-mono shrink-0 w-20 ${isAction ? "font-bold" : "font-semibold"}`} style={{ color: c }}>{node.code}</span>
              <span className={`text-sm truncate flex-1 ${isAction ? "text-[#4A5568]" : "text-[#1A202C] font-medium"}`} title={node.name}>{node.name}</span>
              {isAction && <StatusBadge status={node.status} />}
              <div className="w-24 shrink-0 hidden md:block"><ProgressBar value={node.progress} height={6} /></div>
              <span className="text-xs font-semibold tabular-nums text-[#718096] w-20 text-right shrink-0">{fmtMillions(node.budget)}</span>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && detail !== undefined && (
          <DetailPanel key="panel" code={selected} detail={detail} owners={owners}
            onClose={() => setSelected(null)} onSaved={() => { openAction(selected); loadTree(); }} reload={() => openAction(selected)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailPanel({ code, detail, owners, onClose, onSaved, reload }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (detail) setForm({
      title: detail.title, description: detail.description || "", owner: detail.owner,
      progress: detail.progress, status: detail.status,
      start_date: (detail.start_date || "").slice(0, 10), end_date: (detail.end_date || "").slice(0, 10),
      date_fin_reelle: (detail.date_fin_reelle || "").slice(0, 10),
      budget: { ...detail.budget }, blocked_reason: detail.blocked_reason || "",
    });
  }, [detail]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        title: form.title, description: form.description, owner: form.owner,
        progress: Number(form.progress), status: form.status,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : undefined,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : undefined,
        date_fin_reelle: form.date_fin_reelle ? new Date(form.date_fin_reelle).toISOString() : undefined,
        budget: Object.fromEntries(Object.entries(form.budget).map(([y, v]) => [y, Number(v) || 0])),
        blocked_reason: form.status === "bloque" ? form.blocked_reason : undefined,
      };
      await api.put(`/actions/${code}`, payload);
      toast.success("Action enregistrée", { description: `Modifications du ${code} sauvegardées.` });
      onSaved();
    } catch (e) { toast.error("Échec de l'enregistrement"); }
    setSaving(false);
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    await api.post(`/actions/${code}/comments`, { text: comment });
    setComment("");
    toast.success("Commentaire ajouté");
    reload();
  };

  const c = pillarColor(code);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-[#1A202C]/30 z-40" />
      <motion.div data-testid="action-detail-panel" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
        className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-white z-50 shadow-2xl flex flex-col">
        {!detail || !form ? (
          <div className="p-8 space-y-4">{[...Array(6)].map((_, i) => <div key={i} className="h-12 animate-pulse bg-[#E2E8F0] rounded-[4px]" />)}</div>
        ) : (
          <>
            <div className="border-b border-[#E2E8F0] px-6 py-5 flex items-start justify-between" style={{ borderTop: `3px solid ${c}` }}>
              <div>
                <div className="text-[10px] font-mono font-bold" style={{ color: c }}>{code}</div>
                <h2 className="text-base font-bold tracking-tight text-[#1A202C] mt-1 pr-4 leading-snug">{form.title}</h2>
              </div>
              <button onClick={onClose} data-testid="close-panel-button" className="text-[#A0AEC0] hover:text-[#1A202C] transition-colors shrink-0"><X size={20} /></button>
            </div>

            <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
              <TabsList className="mx-6 mt-4 bg-[#F7F7F5] rounded-[6px] p-1 grid grid-cols-3 shrink-0">
                <TabsTrigger value="details" data-testid="tab-details" className="text-xs data-[state=active]:bg-white rounded-[4px] gap-1.5"><FileText size={13} /> Détails</TabsTrigger>
                <TabsTrigger value="history" data-testid="tab-history" className="text-xs data-[state=active]:bg-white rounded-[4px] gap-1.5"><History size={13} /> Historique</TabsTrigger>
                <TabsTrigger value="comments" data-testid="tab-comments" className="text-xs data-[state=active]:bg-white rounded-[4px] gap-1.5"><MessageSquare size={13} /> Commentaires</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="flex-1 overflow-y-auto px-6 py-5 space-y-4 mt-0">
                <Field label="Code"><input value={code} disabled className="form-input bg-[#F7F7F5] text-[#718096]" /></Field>
                <Field label="Intitulé complet"><input data-testid="form-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="form-input" /></Field>
                <Field label="Description"><textarea data-testid="form-description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="form-input resize-none" /></Field>
                <Field label="Ministère responsable">
                  <Select value={form.owner} onValueChange={(v) => setForm({ ...form, owner: v })}>
                    <SelectTrigger data-testid="form-owner" className="form-input h-auto"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[280px]">{owners.map((o) => <SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label={`Avancement — ${form.progress}%`}>
                  <Slider data-testid="form-progress" value={[form.progress]} max={100} step={1} onValueChange={(v) => setForm({ ...form, progress: v[0] })} className="py-2" />
                </Field>
                <Field label="Statut">
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger data-testid="form-status" className="form-input h-auto"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_ORDER.map((s) => <SelectItem key={s} value={s} className="text-sm">{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                {form.status === "bloque" && (
                  <Field label="Motif de blocage"><textarea data-testid="form-blocked" rows={2} value={form.blocked_reason} onChange={(e) => setForm({ ...form, blocked_reason: e.target.value })} className="form-input resize-none" /></Field>
                )}
                <Field label="Budget 2026-2030 (M FCFA)">
                  <div className="grid grid-cols-5 gap-2">
                    {[2026, 2027, 2028, 2029, 2030].map((y) => (
                      <div key={y}>
                        <div className="text-[10px] text-[#718096] font-semibold text-center mb-1">{y}</div>
                        <input data-testid={`form-budget-${y}`} type="number" value={form.budget[String(y)]} onChange={(e) => setForm({ ...form, budget: { ...form.budget, [String(y)]: e.target.value } })} className="form-input text-center px-1 tabular-nums" />
                      </div>
                    ))}
                  </div>
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Date début"><input data-testid="form-start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="form-input" /></Field>
                  <Field label="Fin prévue"><input data-testid="form-end" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="form-input" /></Field>
                  <Field label="Fin réelle"><input data-testid="form-real-end" type="date" value={form.date_fin_reelle} onChange={(e) => setForm({ ...form, date_fin_reelle: e.target.value })} className="form-input" /></Field>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-2">Indicateurs (KPIs)</div>
                  <div className="space-y-1.5">
                    {detail.kpis.map((k, i) => <div key={i} className="flex items-center gap-2 text-sm text-[#4A5568] bg-[#F7F7F5] rounded-[4px] px-3 py-2"><span className="w-1.5 h-1.5 rounded-full bg-[#C5A028]" />{k}</div>)}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history" className="flex-1 overflow-y-auto px-6 py-5 mt-0">
                <div className="space-y-3">
                  {[...detail.history].reverse().map((h, i) => (
                    <div key={i} className="flex gap-3" data-testid={`history-entry-${i}`}>
                      <div className="flex flex-col items-center">
                        <span className="w-2 h-2 rounded-full mt-1.5" style={{ background: c }} />
                        {i < detail.history.length - 1 && <span className="w-px flex-1 bg-[#E2E8F0] mt-1" />}
                      </div>
                      <div className="pb-1">
                        <div className="text-xs text-[#718096]">{fmtDateTime(h.date)} — <span className="font-semibold text-[#1A202C]">{h.user}</span></div>
                        <div className="text-sm text-[#1A202C] mt-0.5">
                          <span className="font-medium">{h.field}</span>
                          {h.old ? <> : <span className="text-[#718096] line-through">{h.old}</span> → <span className="text-[#006B3F] font-medium">{h.new}</span></> : <> : {h.new}</>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="comments" className="flex-1 overflow-y-auto px-6 py-5 mt-0 flex flex-col">
                <div className="flex-1 space-y-3">
                  {detail.comments.length === 0 ? <p className="text-sm text-[#718096] text-center py-6">Aucun commentaire pour le moment.</p> :
                    detail.comments.map((cm, i) => (
                      <div key={i} className="bg-[#F7F7F5] rounded-[6px] p-3" data-testid={`comment-${i}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-[#1A202C]">{cm.author}</span>
                          <span className="text-[11px] text-[#A0AEC0]">{fmtDateTime(cm.date)}</span>
                        </div>
                        <p className="text-sm text-[#4A5568]">{cm.text}</p>
                      </div>
                    ))}
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#E2E8F0]">
                  <input data-testid="comment-input" value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()}
                    placeholder="Ajouter un commentaire…" className="flex-1 h-10 px-3 rounded-[6px] border border-[#E2E8F0] outline-none focus:border-[#FF8200] text-sm" />
                  <button data-testid="add-comment-button" onClick={addComment} className="h-10 w-10 rounded-[6px] bg-[#FF8200] text-white flex items-center justify-center hover:bg-[#FF8200]/90 transition-colors"><Send size={16} /></button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="border-t border-[#E2E8F0] px-6 py-4 flex items-center justify-between shrink-0">
              <span className="text-xs text-[#718096]">Budget total : <span className="font-semibold text-[#1A202C]">{fmtFCFA(Object.values(form.budget).reduce((s, v) => s + (Number(v) || 0), 0))}</span></span>
              <button data-testid="save-action-button" onClick={save} disabled={saving}
                className="inline-flex items-center gap-2 rounded-[6px] bg-[#1A202C] text-white px-4 py-2 text-sm font-medium hover:bg-[#1A202C]/90 transition-colors disabled:opacity-60">
                <Save size={15} /> {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-1.5">{label}</div>
      {children}
    </div>
  );
}
