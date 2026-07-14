import React from "react";
import { Inbox } from "lucide-react";

export function EmptyState({ icon: Icon = Inbox, title, description, action, compact = false }) {
  return (
    <div className={`rounded-[8px] border border-dashed border-[var(--border)] bg-[var(--surface-soft)] text-center ${compact ? "px-4 py-5" : "px-6 py-8"}`}>
      <div className="mx-auto w-9 h-9 rounded-full bg-white border border-[var(--border)] flex items-center justify-center text-[var(--ink-500)]">
        <Icon size={17} aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--ink-900)] mt-3">{title}</h3>
      {description && <p className="text-xs text-[var(--ink-500)] mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
