import React from "react";
import { fmtMilliards, fmtMillions } from "@/lib/format";

// Official Côte d'Ivoire coat of arms (original asset, never redrawn/recolored).
export function InstitutionalBrand({ collapsed = false }) {
  return (
    <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`} data-testid="institutional-brand">
      <div className="shrink-0 rounded-[8px] bg-white flex items-center justify-center p-1 shadow-[0_1px_2px_rgba(24,33,47,0.12)]"
        style={{ width: collapsed ? 40 : 48, height: collapsed ? 40 : 48 }}>
        <img src="/CIV.png" alt="Armoiries de la République de Côte d'Ivoire"
          className="object-contain w-full h-full" />
      </div>
      {!collapsed && (
        <div className="leading-tight min-w-0">
          <div className="text-[15px] font-bold tracking-tight text-white truncate">Cockpit METFPA</div>
          <div className="text-[11px] text-white/55 font-medium truncate">Pilotage du secteur EFTP</div>
        </div>
      )}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, accent = "var(--ci-orange-600)", actions, testid }) {
  return (
    <div className="flex items-start justify-between gap-4" data-testid={testid}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-1.5" style={{ color: accent }}>{eyebrow}</div>
        )}
        <h1 className="text-[27px] leading-tight font-bold tracking-tight text-[var(--ink-900)]">{title}</h1>
        {description && <p className="text-[15px] text-[var(--ink-700)] mt-2 max-w-3xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function InstitutionalSection({ title, count, accent = "var(--ink-700)", action, children, testid, icon: Icon }) {
  return (
    <section className="bg-[var(--surface)] rounded-[10px] border border-[var(--border)] overflow-hidden" data-testid={testid}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]"
        style={{ borderLeft: `3px solid ${accent}` }}>
        <h2 className="text-[16px] font-semibold tracking-tight text-[var(--ink-900)] flex items-center gap-2">
          {Icon && <Icon size={16} style={{ color: accent }} />}
          {title}{count != null && <span className="text-[var(--ink-500)] font-normal text-sm">({count})</span>}
        </h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

const STATUS_TONE = {
  provisoire: { bg: "var(--ci-gold-100)", fg: "#8A6D1B", bd: "rgba(200,154,43,0.4)", label: "Donnée provisoire" },
  demonstration: { bg: "var(--ci-orange-100)", fg: "#9A4D00", bd: "rgba(244,124,32,0.35)", label: "Démonstration" },
  a_valider: { bg: "var(--ci-gold-100)", fg: "#8A6D1B", bd: "rgba(200,154,43,0.4)", label: "À valider" },
  manquante: { bg: "var(--surface-soft)", fg: "var(--ink-500)", bd: "var(--border)", label: "Donnée manquante" },
  critique: { bg: "#FBEAEA", fg: "var(--danger)", bd: "rgba(201,60,55,0.35)", label: "Critique" },
  valide: { bg: "var(--ci-green-100)", fg: "var(--success)", bd: "rgba(22,121,74,0.3)", label: "Validé" },
};

export function StatusBadge({ tone = "manquante", label, testid }) {
  const t = STATUS_TONE[tone] || STATUS_TONE.manquante;
  return (
    <span data-testid={testid} className="inline-flex w-fit items-center gap-1 rounded-[5px] border px-2 py-[2px] text-[11px] font-semibold whitespace-nowrap"
      style={{ background: t.bg, color: t.fg, borderColor: t.bd }}>
      {label || t.label}
    </span>
  );
}

export function MetricCard({ label, value, accent = "var(--ink-900)", hint, testid }) {
  return (
    <div data-testid={testid} className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-[12px] font-medium text-[var(--ink-500)]">{label}</div>
      <div className="text-[26px] font-bold tabular-nums mt-1 leading-none" style={{ color: accent }}>{value}</div>
      {hint && <div className="text-[11px] text-[var(--ink-500)] mt-1.5">{hint}</div>}
    </div>
  );
}

export function DataStatusBanner({ testid = "demo-banner" }) {
  return (
    <div data-testid={testid}
      className="flex items-center gap-2.5 rounded-[8px] border border-[rgba(200,154,43,0.4)] bg-[var(--ci-gold-100)] px-4 py-2.5 text-[#8A6D1B]">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--ci-gold-600)] shrink-0" />
      <p className="text-[13px] font-medium leading-snug">
        Données de référence <strong>provisoires</strong> (en attente de validation METFPA) · suivi opérationnel <strong>de démonstration</strong>. Aucun budget engagé/exécuté officiel n'est présenté comme validé.
      </p>
    </div>
  );
}

// Institutional French currency rendering (values stored in millions FCFA).
export function CurrencyValue({ value, className = "", millions = true }) {
  if (value == null) return <span className={className}>—</span>;
  return <span className={`tabular-nums ${className}`}>{millions ? fmtMillions(value) : fmtMilliards(value)}</span>;
}
