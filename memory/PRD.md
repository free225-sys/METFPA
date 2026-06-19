# PRD — Cockpit PND 2026-2030

## Problem Statement
Strategic, government-grade dashboard for Côte d'Ivoire's National Development Plan (PND) 2026-2030. "Élysée meets Abidjan" — authoritative, unmistakably Ivorian, state-level seriousness. French UI.

## Architecture
- **Backend**: FastAPI + MongoDB (motor). JWT email/password auth (Bearer token in localStorage; cookies dormant — edge proxy returns `ACAO:*` so credentialed requests are blocked). Auto-seeds 720 actions on startup.
- **Frontend**: React 19 + React Router + Recharts + Framer Motion + Tailwind + shadcn/ui. Inter font. Brand palette: orange #FF8200, green #009E49, gold #C5A028, slate #1A202C, soft gray #F7F7F5.
- **Data model**: 5-level tree PILLAR(6) → SECTOR(5/pillar=30) → EFFECT(3) → PRODUCT(2) → ACTION(4) = 720 actions. Each action: code (e.g. 4.02.1.1.1), title, owner ministry, budget/year 2026-2030 (M FCFA), actual_2026, progress %, status, dates, KPIs, blocked_reason.

## User Personas
- Ministre / Cabinet du Premier Ministre — high-level oversight, KPIs, alerts.
- Directeurs sectoriels — drill into pillars/sectors, edit action progress/status.

## Core Requirements (static)
1. Executive Dashboard — KPI cards, pillar donut, budget trajectory, top-10 actions, global filters.
2. Tree View — collapsible 5-level tree, slide-in detail panel, search autocomplete.
3. Actions Table — paginated/sortable/multi-filter, inline CRUD edit, simulated export.
4. Budget Analytics — stacked bar (pillar×year), waterfall variance, execution rate by sector.
5. Alerts Center — blocked / overdue / zero-budget tabs, "Envoyer un rappel" (simulated).

## Implemented (2026-06-19)
- ✅ JWT auth (admin ministre@pnd.ci), login screen with coat-of-arms line art.
- ✅ All 5 screens fully functional and verified (17/17 backend tests, 100% frontend e2e).
- ✅ Inline editing persists via PUT /api/actions/{code}; toasts; skeleton loaders; status pulse badges.
- ✅ Line-art Ivorian iconography (coat of arms, elephant), French throughout, FCFA formatting.

## Auth Credentials
- Admin: ministre@pnd.ci / PND2030! (see /app/memory/test_credentials.md)

## Backlog (prioritized)
- **P1**: Real Excel/PDF export (currently simulated toast). Dark mode (deferred phase 2).
- **P1**: Add/delete actions (currently edit-only CRUD).
- **P2**: Brute-force lockout on login (5 attempts). Multi-year budget editing UI in table.
- **P2**: KPI target tracking & historical execution snapshots. Per-ministry consolidated views.
- **P2**: Bilingual FR/EN toggle.

## Next Tasks
1. Implement real Excel/PDF export when requested.
2. Add create/delete action flows.
3. Dark mode (phase 2).
