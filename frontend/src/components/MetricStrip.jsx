import React from "react";

export function MetricStrip({ verdict, primary = [], secondary = [] }) {
  return (
    <section className="rounded-[8px] border border-[var(--border)] bg-white overflow-hidden" aria-label="Verdict de la semaine">
      <div className="px-5 py-3 bg-[var(--ink-900)] text-white">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">Verdict de la semaine</div>
        <p className="text-sm font-semibold mt-1">{verdict}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.4fr)]">
        {primary.map((metric) => (
          <div key={metric.label} className="px-5 py-4 border-b lg:border-b-0 lg:border-r border-[var(--border)]" style={{ borderTop: `3px solid ${metric.color}` }}>
            <div className="text-2xl font-bold tabular-nums" style={{ color: metric.color }}>{metric.value}</div>
            <div className="text-xs text-[var(--ink-500)] mt-1">{metric.label}</div>
          </div>
        ))}
        <div className="px-5 py-4 grid grid-cols-2 gap-x-5 gap-y-3 bg-[var(--surface-soft)]">
          {secondary.map((metric) => <div key={metric.label}><div className="font-bold tabular-nums text-sm">{metric.value}</div><div className="text-[11px] text-[var(--ink-500)]">{metric.label}</div></div>)}
        </div>
      </div>
    </section>
  );
}
