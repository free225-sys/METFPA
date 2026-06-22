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
- ✅ JWT auth (admin ministre@pnd.ci) + 3 demo director accounts (Directeur2030!).
- ✅ All 6 screens functional (Dashboard, Arborescence, Actions, Vue par ministère, Analyse, Alertes).

### Iteration 2 — Redesign institutionnel (2026-06-19)
- ✅ Palette stricte par pilier (P1 #FF8200 … P6 #A08020) appliquée à tous les graphes/badges.
- ✅ Cartes KPI « État » (bordure 1px, pas d'ombre, radius 4px) ; badges statut rectangulaires à icône ; pagination numérique ; export Excel orange / PDF gris.
- ✅ Graphes corrigés : donut couleurs piliers + %, trajectoire (vert plein exécuté / orange pointillé programmé), barres groupées 6 piliers/an, variance 2 barres + écart %, taux d'exécution coloré par pilier + seuil 80%.
- ✅ Arborescence : couleurs piliers par nœud, sélection active (bordure gauche 3px), deep-link ?focus=.
- ✅ Panneau de détail ÉDITABLE (onglets Détails / Historique / Commentaires) : formulaire complet (slider, dropdowns, 5 budgets, 3 dates, motif blocage), enregistrement → PUT + historique auto attribué à l'utilisateur, commentaires.
- ✅ Centre d'alertes : tableau synthétique (sévérité, type, détail, jours de retard) + filtres (type, sévérité, pilier, ministère, période).
- ✅ Vue par ministère (consolidé), Notifications (cloche header), Mode présentation, badge Emergent masqué.

## Auth Credentials
- Admin: ministre@pnd.ci / PND2030!
- Directeurs (démo): koffi.kouassi@pnd.ci, awa.traore@pnd.ci, yao.brou@pnd.ci / Directeur2030!

## Backlog (prioritized)
- **P1**: Export réel Excel/PDF (actuellement toast simulé). Création/suppression d'actions.
- **P1**: Calendrier shadcn pour dates FR (au lieu de l'input date natif).
- **P2**: Mode présentation enrichi (agrandir graphes, masquer filtres). Dark mode (phase 2). Bilingue FR/EN.

## Next Tasks
1. Implement real Excel/PDF export when requested.
2. Add create/delete action flows.
3. Dark mode (phase 2).



---

# PIVOT — Cockpit METFPA (Secteur 4.02 · EFTP)
> Le projet a pivoté du cockpit PND générique vers un **cockpit institutionnel METFPA** centré exclusivement sur le **Secteur 4.02**. L'app PND générique est conservée comme référence sur `/legacy-pnd`.

## Problem Statement (METFPA)
Cockpit institutionnel du Ministère de l'Enseignement Technique, de la Formation Professionnelle et de l'Apprentissage. Périmètre = **Secteur 4.02 uniquement**. Intègre 3 référentiels : **PND 4.02 (2026-2030)**, **Politique EFTP (2026-2035)**, **Stratégie de digitalisation (2026-2031)**. Gouvernance des données stricte : distinguer **officiel / référence à valider / démo / manquant** via badges d'origine partout. UI **français**.

## Architecture METFPA (isolée)
- **Backend** : module `backend/metfpa/` (router/db/seed_loader) ; DB MongoDB **isolée `metfpa_dev`** (legacy `test_database` non touché). Endpoints sous `/api/metfpa`.
- **Frontend** : pages dédiées + `metfpaApi.js`, `metfpaTheme.js` (langage par axes, `ORIGIN_META`), composants `OriginBadge`/`MissingValue`, `DemoBanner`, `Breadcrumb`, `HierTree` (arbre itératif).
- **Collections** : frameworks, pnd_nodes, pol_nodes, dig_nodes, dig_profile, indicators, alignments, activities, audit_log.
- **Source Phase 1** : `memory/seed_metfpa.json` (`data_origin=html_reference`, `validation_status=pending_metfpa_validation`). Activités (62) = `demo_tracking` ; directions `to_validate` ; engagé/source financement = `missing`.

## Avancement METFPA
- ✅ **Phase 0** (audit + plan + seed) — voir `AUDIT_METFPA_Cockpit.md`, `PHASE1_LAUNCH_PLAN_METFPA.md`.
- ✅ **Sprint S1** (2026-06) — backend `metfpa_dev`, endpoints lecture, seed idempotent, audit_log, promotion seed `/api/metfpa/admin/validate`. Tests `tests/metfpa_s1_test.py` (8/8).
- ✅ **Sprint S2** (2026-06-21) — refactor frontend : Accueil intégré, OriginBadge, DemoBanner, Sidebar/Header METFPA, route `/` = Accueil ; legacy → `/legacy-pnd`.
- ✅ **Sprint S3A** (2026-06-21) — 6 vues détaillées : `/pnd-402`, `/politique-eftp`, `/strategie-digitale`, `/plan-action` (édition auditée), `/alignement`, `/kpi-cascade`. Nav déverrouillée. **testing_agent : 14/14 PASS (iteration_3.json)**. Rapport : `SPRINT_S3A_COMPLETION_REPORT.md`.
- ✅ **Sprint S3B** (2026-06-21) — couche décisionnelle : `/pilotage-directeur` (Cabinet View, ordre ①Décisions→②Alertes→③Échéances→④Risques→⑤Budget→⑥Avancement→⑦Note), `/decisions` (CRUD), `/risks` (CRUD + score P×I & sévérité auto), `/budget-consolide` (4 modes), historique d'activité lecture seule. `metfpa/registers.py` + endpoints cabinet/budget/history. **pytest 13/13 + testing_agent 100% (iteration_4.json)**. Rapport : `SPRINT_S3B_COMPLETION_REPORT.md`.
- ✅ **Sprint S4** (2026-06-21) — gouvernance : **RBAC complet** (4 rôles, application serveur, scope direction, 401/403), **auth durcie** (JWT HS256 + bcrypt, exp/signature/type, suppression bypass dev), **alertes exécutives déterministes** (`/cabinet/alerts`), **export PDF réel** de la Note de Cabinet (`/cabinet/export/pdf`, reportlab, filigrane provisoire), **admin utilisateurs/rôles** (`/admin-users`, garde-fou dernier admin). `metfpa/auth.py`, `alerts.py`, `pdf.py`. **pytest 28/28 + testing_agent 100% (iteration_5.json)**. Rapport : `SPRINT_S4_COMPLETION_REPORT.md`. Comptes : voir `test_credentials.md`.
- ✅ **Audit d'alignement** (2026-06-21) — audit lecture seule Phase 0→2A : `DEEP_ALIGNMENT_AUDIT_METFPA.md` (8,4/10, GO conditionnel Phase 2B).
- ✅ **Sprint Présentation** (2026-06-21) — différenciation par rôle : **landing par rôle** (`roleHome` : cabinet→/pilotage-directeur, direction→/plan-action [portefeuille filtré par direction], validateur→/kpi-cascade [espace de validation], admin→/admin-users), **Sidebars distinctes par rôle**, **référentiels rétrogradés**, nouvelle page **`/audit-log`**, **format monétaire FR « milliards FCFA »** (web + PDF), Header nettoyé (recherche/cloche retirées). Commit `60a8a19`. **testing_agent 100% (iteration_7.json) · pytest 54/54**. Rapport : `PRESENTATION_READINESS_REPORT_METFPA.md`.

## Backlog METFPA (prioritized)
- ✅ **Phase 2A-0** (2026-06-21) — clôture sécurité : tous les GET `/api/metfpa/*` gatés (sauf `/health`,`/auth/login`), audit-log restreint validateur/admin, historique d'activité scopé par direction, effacement explicite de direction (422 pour direction_editor), ordre Cabinet « Décisions d'abord » (web+PDF), test workflow validation (snapshot/restore DIG).
- ✅ **Phase 2A-1** (2026-06-21) — import Excel **dry-run uniquement** (`/imports/excel/dry-run`, validateur/admin) : validation fichier/schéma/intégrité/budget, classification insert/update/unchanged/conflict/reject, verdicts READY_FOR_REVIEW/READY_WITH_WARNINGS/BLOCKED_BY_ERRORS, **aucune mutation métier**, list/get/delete + cleanup, page `/imports` sans bouton Appliquer. **pytest 53/53 + testing_agent 100% (iteration_6.json)**. Rapport : `PHASE2A_COMPLETION_REPORT.md`.
- **P0 · Phase 2B (sur GO)** : application contrôlée des imports validés (diff → application transactionnelle + rollback → re-promotion M&E).
- **P2 · ultérieur** : workflow M&E baselines/cibles, upload de preuves, exports génériques, déploiement (conditionnés aux validations METFPA).
- **P2 · Phase 2+** : import Excel officiel (`IMPORT_METFPA.xlsx`), workflow M&E (baselines/cibles), upload de preuves, exports réels PDF/Excel/PPTX, déploiement production.

## Contraintes fermes (METFPA)
- **NO-GO production** jusqu'aux validations METFPA (V1-V11). Ne pas déployer.
- Ne jamais modifier `test_database` legacy ; toute écriture reste dans `metfpa_dev`.
- Ne pas inventer de données officielles (directions, budgets engagés, sources). Manquant affiché « manquant », jamais 0.
- Tout bloc majeur affiche origine + statut de validation.
