import React, { useState } from "react";
import metfpaApi from "@/lib/metfpaApi";
import { formatApiErrorDetail } from "@/lib/api";
import { useAuth, canValidate } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BadgeCheck, XCircle, Undo2, MessageSquarePlus, RotateCcw } from "lucide-react";

// Client mirror of the Phase 2A server state machine (backend/metfpa/validation.py).
// The server remains authoritative; this only avoids predictable 409s in the UI.
const PENDING_EQUIV = ["to_validate", "pending_metfpa_validation", "demo", undefined, null];
const ALLOWED_FROM = {
  validate: [...PENDING_EQUIV, "correction_requested"],
  reject: [...PENDING_EQUIV, "correction_requested"],
  request_correction: [...PENDING_EQUIV, "rejected"],
  reopen: ["validated", "rejected"],
};

const ERROR_PREFIX = {
  400: "Requête invalide",
  403: "Accès refusé",
  404: "Élément introuvable",
  409: "Conflit d'état",
};

const DIALOG_META = {
  reject: { title: "Rejeter l'élément", cta: "Rejeter", color: "#C53030",
            hint: "Motif du rejet (obligatoire) — visible dans l'historique de validation." },
  request_correction: { title: "Demander une correction", cta: "Demander la correction", color: "#D97706",
                        hint: "Correction attendue (obligatoire) — visible par l'éditeur concerné." },
  comment: { title: "Ajouter un commentaire", cta: "Commenter", color: "#1F6FEB",
             hint: "Commentaire de validation (sans changement de statut)." },
};

/**
 * Validation action group for one item. Renders nothing unless the user has
 * validation rights (me_validator, admin); "Rouvrir" is admin-only.
 *
 * entityType: "indicators" | "activities" | "decisions" | "risks"
 * item:       document with { id, validation_status }
 * onUpdated:  (updatedDoc) => void — replace the item in the parent's state
 * onStale:    () => void — called after a 409 so the parent can reload
 */
export function ValidationActions({ entityType, item, onUpdated, onStale, testidPrefix }) {
  const { user } = useAuth();
  const [dialog, setDialog] = useState(null); // "reject" | "request_correction" | "comment" | null
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  if (!canValidate(user?.role)) return null;

  const status = item?.validation_status;
  const can = (action) => ALLOWED_FROM[action].includes(status);
  const tid = (a) => `${testidPrefix || `val-${entityType}-${item?.id}`}-${a}`;

  const run = async (action, text = "") => {
    setBusy(true);
    try {
      const r = await metfpaApi.post(`/validation/${entityType}/${item.id}`, { action, comment: text });
      const labels = { validate: "Élément validé", reject: "Élément rejeté",
                       request_correction: "Correction demandée", comment: "Commentaire ajouté",
                       reopen: "Élément rouvert (à valider)" };
      toast.success(labels[action]);
      setDialog(null);
      setComment("");
      onUpdated?.(r.data);
    } catch (e) {
      const code = e?.response?.status;
      toast.error(ERROR_PREFIX[code] || "Échec de l'action",
                  { description: formatApiErrorDetail(e?.response?.data?.detail) });
      if (code === 409) onStale?.();
    } finally {
      setBusy(false);
    }
  };

  const meta = dialog ? DIALOG_META[dialog] : null;

  return (
    <span className="inline-flex items-center gap-0.5 whitespace-nowrap" data-testid={tid("group")}>
      <ActionBtn testid={tid("validate")} title="Valider" color="#009E49" disabled={busy || !can("validate")}
        onClick={() => run("validate")}><BadgeCheck size={14} /></ActionBtn>
      <ActionBtn testid={tid("reject")} title="Rejeter (commentaire requis)" color="#C53030" disabled={busy || !can("reject")}
        onClick={() => setDialog("reject")}><XCircle size={14} /></ActionBtn>
      <ActionBtn testid={tid("request-correction")} title="Demander une correction (commentaire requis)" color="#D97706"
        disabled={busy || !can("request_correction")} onClick={() => setDialog("request_correction")}><Undo2 size={14} /></ActionBtn>
      <ActionBtn testid={tid("comment")} title="Commenter" color="#1F6FEB" disabled={busy}
        onClick={() => setDialog("comment")}><MessageSquarePlus size={14} /></ActionBtn>
      {user?.role === "admin" && can("reopen") && (
        <ActionBtn testid={tid("reopen")} title="Rouvrir (admin) — repasse « à valider »" color="#52667A" disabled={busy}
          onClick={() => run("reopen")}><RotateCcw size={14} /></ActionBtn>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => { if (!o) { setDialog(null); setComment(""); } }}>
        <DialogContent data-testid="validation-dialog" className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: meta?.color }}>{meta?.title}</DialogTitle>
            <DialogDescription className="text-xs text-[#718096]">{meta?.hint} Action journalisée dans l'audit.</DialogDescription>
          </DialogHeader>
          <textarea data-testid="validation-comment-input" value={comment} onChange={(e) => setComment(e.target.value)}
            rows={3} autoFocus placeholder="Votre commentaire…"
            className="w-full rounded-[6px] border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:border-[#FF8200]" />
          <DialogFooter>
            <button onClick={() => { setDialog(null); setComment(""); }}
              className="px-4 py-2 text-sm rounded-[6px] border border-[#E2E8F0] text-[#4A5568] hover:bg-[#F7F7F5]">Annuler</button>
            <button data-testid="validation-dialog-confirm" disabled={busy || !comment.trim()}
              onClick={() => run(dialog, comment.trim())}
              className="px-4 py-2 text-sm rounded-[6px] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: meta?.color }}>
              {busy ? "…" : meta?.cta}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </span>
  );
}

function ActionBtn({ title, color, disabled, onClick, children, testid }) {
  return (
    <button data-testid={testid} title={title} disabled={disabled} onClick={onClick}
      className="inline-flex items-center justify-center w-7 h-7 rounded-[4px] transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
      style={{ color }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = `${color}14`; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
      {children}
    </button>
  );
}

// Latest correction request comment, for editor-facing banners
export function lastCorrectionComment(item) {
  const entries = (item?.validation_comments || []).filter((c) => c.action === "request_correction");
  return entries.length ? entries[entries.length - 1] : null;
}
