# Sprint S3B — Rapport d'achèvement (METFPA · couche décisionnelle)
Date : 2026-06-21 · Branche : `phase1-s1-metfpa` · Base commit : `b1b99d4`
Statut production : **NO-GO maintenu** · Aucun déploiement · `metfpa_dev` uniquement · `test_database` legacy intact

---

## 1. Périmètre livré (S3B)
Couche d'aide à la décision : **Pilotage Directeur (Cabinet View)**, **Registre des décisions (CRUD)**, **Registre des risques (CRUD + scoring auto)**, **Budget consolidé normalisé (4 modes)**, **Historique d'activité en lecture seule**. Tout est isolé dans `metfpa_dev`. Aucune donnée officielle inventée.

## 2. Fichiers créés / modifiés
**Backend créés**
- `backend/metfpa/registers.py` — Décisions & Risques (CRUD, validation Pydantic, `severity_from_score`, audit sur chaque mutation, `data_origin=demo_tracking` / `validation_status=to_validate`).

**Backend modifiés**
- `backend/metfpa/router.py` — `/cabinet` enrichi (agrégats décisionnels), `/budget/consolidated` (4 modes + `overlap_value`/`overlap_years`), `/activities/{id}/history`.
- `backend/server.py` — inclusion `registers_router` + index `decisions`/`risks`/`audit_log` au démarrage.

**Frontend créés**
- `pages/CabinetView.jsx` — `/pilotage-directeur`
- `pages/DecisionRegister.jsx` — `/decisions`
- `pages/RiskRegister.jsx` — `/risks`
- `pages/BudgetConsolide.jsx` — `/budget-consolide`

**Frontend modifiés**
- `pages/PlanAction.jsx` — `HistoryDialog` (drawer historique lecture seule).
- `components/Sidebar.jsx` — section « Décisionnel · Cabinet » avec 4 liens actifs.
- `App.js` — 4 routes S3B.

## 3. Collections & index ajoutés (`metfpa_dev`)
- `decisions` (index `id` unique, `status`), `risks` (index `id` unique, `severity`).
- `audit_log` : index composé `(entite, entite_id)` pour requêtes d'historique.

## 4. Endpoints créés / modifiés (`/api/metfpa`)
| Méthode | Endpoint | Rôle |
|---|---|---|
| GET | `/cabinet` | Agrégats décisionnels (voir §5) |
| GET/POST | `/decisions`, `/decisions/{id}`, `/decisions/meta` | CRUD décisions + nomenclature |
| PUT/DELETE | `/decisions/{id}` | MAJ / suppression (auditées) |
| GET/POST | `/risks`, `/risks/{id}`, `/risks/meta` | CRUD risques + scoring |
| PUT/DELETE | `/risks/{id}` | MAJ / suppression (auditées) |
| GET | `/budget/consolidated` | 4 modes normalisés |
| GET | `/activities/{id}/history` | Journal d'audit de l'activité (lecture seule) |

## 5. Règles d'agrégation Cabinet View
Ordre exécutif imposé (rendu serveur + UI) : **① Décisions requises → ② Alertes & blocages → ③ Échéances (≤30j) & retards → ④ Risques critiques/élevés → ⑤ Budget → ⑥ Avancement & fiabilité → ⑦ Note du Directeur**. Les graphes n'apparaissent jamais avant décisions/alertes/échéances.
- Décisions requises = `status ∈ {draft, pending}` **ou** en retard (`due_date < now` et non clôturée).
- Alertes = activités `statut ∈ {En retard, Bloqué}` ou `alerte` non vide.
- Échéances : conversion `YYYY-TQ → fin de trimestre` ; proches = ≤ 30 j ; retards = échéance passée et statut ≠ Achevé.
- Risques : tri par sévérité (critique→faible) puis score décroissant ; critiques/élevés en tête.
- `financial_reliability` : `budget_engage_missing=62`, `source_financement_missing=62`, `directions_to_validate=62` (aucun financier officiel inventé).

## 6. Modèles de données
**Décision** : `id, title, description, decision_type, priority, status, requested_by, assigned_to, related_activity_id, related_framework, due_date, decision_date, resolution, data_origin, validation_status, created_at/by, updated_at/by`. Statuts : draft/pending/approved/rejected/implemented/closed.
**Risque** : `id, title, description, category, probability, impact, risk_score, severity, status, owner, related_activity_id, related_framework, mitigation_plan, mitigation_deadline, residual_probability/impact (+ residual_score/severity), data_origin, validation_status, audit fields`. Statuts : open/monitored/mitigating/closed.

## 7. Règles de scoring des risques
- Échelle **1–5** sur probabilité & impact (validées Pydantic, hors borne → **422**).
- `risk_score = probability × impact` (1–25).
- Sévérité déterministe : **critique ≥ 15 · élevé ≥ 10 · modéré ≥ 5 · faible < 5**. Recalcul serveur sur POST **et** PUT (aucune dérive UI). UI affiche le score calculé en direct (`risk-computed-score`).

## 8. Règles de normalisation budgétaire (4 modes)
- **Total** · **Moyenne annuelle** (total ÷ années) · **Recouvrement 2026-2030** (`moyenne × années communes`, approximation documentée) · **Par cadre source**.
- Chaque bloc affiche framework/période/années/total/moyenne/recouvrement/périmètre/source/statut.
- **Avertissement horizons toujours visible** (y compris en mode Total). `requires_client_validation=true` visible. Engagé/exécuté = `missing` (jamais 0). Financement État 15 % / Bailleurs 85 % limité à la Stratégie digitale.

## 9. Historique d'activité
Drawer lecture seule par activité (`/plan-action`), source `audit_log` filtré par `entite_id`. Affiche horodatage, acteur, action, champ, ancienne → nouvelle valeur. État vide honnête. Aucune édition/suppression de l'historique. Pas de jetons/secrets exposés.

## 10. Tests
- **Backend pytest** `backend/tests/metfpa_s3b_test.py` : **13/13 PASS** (cabinet, budget 4 modes + overlap, décisions CRUD + 422 + audit, risques scoring + 422 + audit, historique + 404).
- **Frontend testing_agent** (`iteration_4.json`) : **100 %** — nav 4 liens, ordre exécutif Cabinet vérifié par position DOM, persistance note Directeur, CRUD décisions/risques avec badges démo, score live 20=critique, 4 modes budget + avertissement permanent, drawer historique.
- **Régressions** : S1 (8/8) et S3A (iteration_3, 14/14) toujours verts ; `/legacy-pnd` intact ; build frontend OK.

## 11. Captures
Vérifiées en session : Pilotage Directeur (ordre ①→⑦), Registre décisions (décision démo), Registre risques (score 20 critique), Budget consolidé (4 modes + cartes normalisées). Drawer historique vérifié par le testing_agent.

## 12. Points de données non résolus (inchangés)
- Directions officielles, budget engagé/source par activité, périodicité/responsable indicateurs → `missing`/`to_validate` (sources non fournies).
- Décisions/risques sont des enregistrements de **démonstration** (aucun officiel inventé).

## 13. Rollback
- Branche dédiée `phase1-s1-metfpa`. Retour app générique : `git checkout main`. Données isolées `metfpa_dev` (legacy non touché). Collections S3B (`decisions`/`risks`) supprimables sans impact référentiel.

## 14. Confirmation
✅ Aucun déploiement production · aucune donnée production modifiée · app legacy recouvrable.
✅ RBAC complet, import Excel, exports, notifications, S4/S5 = **non démarrés** (hors périmètre).

## 15. Recommandation Go/No-Go
**GO recommandé pour Sprint S4 (qualité & gouvernance)** : application RBAC (rôles déjà structurés), durcissement auth, et préparation import Excel — sous réserve de votre revue. **NO-GO production maintenu** jusqu'aux validations METFPA (V1-V11).
