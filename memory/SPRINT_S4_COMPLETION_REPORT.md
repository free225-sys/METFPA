# Sprint S4 — Rapport d'achèvement (METFPA · gouvernance, RBAC, alertes, PDF)
Date : 2026-06-21 · Branche : `phase1-s1-metfpa` · Base commit : `64ea68a`
Statut production : **NO-GO maintenu** · Aucun déploiement · `metfpa_dev` uniquement · `test_database` legacy intact

---

## 1. Périmètre livré (S4)
Durcissement de la gouvernance : **RBAC complet (4 rôles, application serveur)**, **authentification durcie (JWT + bcrypt)**, **alertes exécutives déterministes**, **export PDF réel de la Note de Cabinet**, **administration utilisateurs/rôles** (admin). Tout isolé dans `metfpa_dev`. Aucune donnée officielle inventée.

## 2. Fichiers créés / modifiés
**Backend créés** : `metfpa/auth.py` (login, `get_identity`, `require_role`, `assert_direction_scope`, `seed_users`, admin user mgmt), `metfpa/alerts.py` (règles déterministes + `/cabinet/alerts`), `metfpa/pdf.py` (`/cabinet/export/pdf`, reportlab).
**Backend modifiés** : `metfpa/router.py` (RBAC sur `PUT /activities`, `/admin/validate`), `metfpa/registers.py` (RBAC + scope direction sur décisions/risques), `server.py` (inclusion routers auth/admin/alerts/pdf + `seed_users` au démarrage), `backend/.env` (`METFPA_SEED_PASSWORD`), `requirements.txt` (`reportlab`).
**Frontend créés** : `pages/AdminUsers.jsx` (`/admin-users`).
**Frontend modifiés** : `context/AuthContext.js` (auth METFPA + helpers rôles), `lib/metfpaApi.js` (`metfpa_token` + redirection 401), `pages/CabinetView.jsx` (panneau alertes + bouton PDF), `PlanAction.jsx`/`DecisionRegister.jsx`/`RiskRegister.jsx` (gating par rôle), `Login.jsx` (branding METFPA), `components/Sidebar.jsx` (lien Admin + identité), `components/Header.jsx` (titres), `App.js` (`RoleRoute` + `AccessDenied`).

## 3. Matrice de permissions (appliquée côté serveur)
| Action | cabinet_reader | direction_editor | me_validator | admin |
|---|---|---|---|---|
| Lecture tableaux/référentiels | ✓ | ✓ | ✓ | ✓ |
| Export PDF Note Cabinet | ✓ | ✓ | ✓ | ✓ |
| Éditer activité (sa direction) | ✗ | ✓ (DAF) | ✓ | ✓ |
| Éditer activité (autre direction) | ✗ | ✗ (403) | ✓ | ✓ |
| CRUD décisions/risques | ✗ | ✓ (sa direction) | ✓ | ✓ |
| Validation référentiels (`/admin/validate`) | ✗ | ✗ | ✓ | ✓ |
| Administration utilisateurs/rôles | ✗ | ✗ | ✗ | ✓ |

- 401 = non authentifié ; 403 = authentifié mais non autorisé.
- Rôle & direction lus depuis l'identité serveur (relecture DB), **jamais** du payload client. Scope horizontal entre directions bloqué.

## 4. Authentification durcie
- bcrypt (`gensalt`) ; aucun mot de passe en clair ; secrets via env (`JWT_SECRET`, `METFPA_SEED_PASSWORD`).
- JWT HS256 avec claims `sub/email/role/direction/type=metfpa_access/exp` (8 h). Signature + expiration + type validés à chaque requête. Jetons malformés/expirés/altérés → 401. **Aucun bypass dev** (header `x_user` supprimé).
- Audit : `login_success`, `login_failed`, `admin_update_user`, `promote_framework`, `export_cabinet_pdf`, et toutes les mutations (activités/décisions/risques).
- 4 comptes démo idempotents semés dans `metfpa_dev` (mots de passe via env). Voir `/app/memory/test_credentials.md`.
- Hors S4 : SSO, OAuth, MFA, reset par e-mail, onboarding production (non implémentés, conformément au périmètre).

## 5. Routes & endpoints protégés
- `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`.
- `GET /admin/users`, `PUT /admin/users/{id}` (admin).
- `PUT /activities/{id}` (EDIT_ROLES + scope), `POST /admin/validate` (VALIDATE_ROLES).
- `POST/PUT/DELETE /decisions|/risks` (EDIT_ROLES + scope).
- `GET /cabinet/alerts` (auth), `GET /cabinet/export/pdf` (auth, audité).
- Frontend : `/admin-users` protégé par `RoleRoute(["admin"])` → `AccessDenied` sinon.

## 6. Règles d'alertes exécutives (déterministes, sans IA)
- **Décisions** : en retard (critique), prioritaire à échéance ≤30 j (élevé), approuvée non mise en œuvre (modéré).
- **Activités** : bloquée (critique), en retard d'échéance (élevé), alerte signalée (élevé), avancement faible près de l'échéance (modéré), incohérence exécution/avancement (modéré).
- **Risques** : critique (critique), élevé sans mitigation (élevé), échéance mitigation dépassée (élevé), résiduel encore élevé (modéré).
- **Qualité données** : budget engagé manquant, source financement manquante (modéré), directions à valider, cadre en attente, valeurs d'indicateurs manquantes (faible).
- Chaque alerte porte `alert_id, rule_id, category, severity, title, description, related_resource_type, related_resource_id, evidence, generated_at, data_origin, validation_status`. Tri **critique d'abord**. État vide honnête. Données dérivées de démo → classées démo.

## 7. Export PDF Note de Cabinet (réel)
- `GET /cabinet/export/pdf` (reportlab, A4 paginé, pied de page numéroté), généré à la demande depuis les données serveur (cabinet + budget + alertes). `application/pdf`, nom `METFPA_Cabinet_Brief_YYYY-MM-DD.pdf`. Audité.
- Ordre exécutif : Titre → Date/période → Avis fiabilité → ① Décisions → ② Alertes → ③ Échéances → ④ Risques → ⑤ Budget (+ avertissement horizons) → ⑥ Avancement → ⑦ Note Directeur → Sources/validation.
- **Filigrane** « Données de démonstration / provisoires — non encore validées par le METFPA ». Engagé/exécuté = « Donnée absente ». État 15 % / Bailleurs 85 % limité au Digital. Aucun ID/jeton/secret exposé.
- Échantillon généré en test (`%PDF-1.4`, ~6,7 ko) ; téléchargeable via le bouton `export-pdf-btn` du Pilotage Directeur.

## 8. Administration utilisateurs
- Page admin `/admin-users` : liste, attribution rôle, direction, activation/désactivation. Toutes les modifications auditées.
- **Garde-fou** : impossible de retirer (rétrograder/désactiver) le **dernier administrateur actif** → 409.

## 9. Tests
- **Backend pytest** `backend/tests/metfpa_s4_test.py` : **28/28 PASS** (auth 8/8, RBAC 8/8, admin users 4/4, alertes 2/2, PDF 3/3, régression 3/3). Rapport : `test_reports/pytest/s4_results.xml`.
- **Frontend testing_agent** (`iteration_5.json`) : **100 %** — 4 rôles testés (admin/validateur/éditeur DAF/lecteur), panneau alertes critiques-d'abord, bouton PDF, page admin, écran Accès refusé, gating boutons, scope direction sur Plan d'action, `/legacy-pnd` monte sans crash.
- **Régressions** : S1/S3A/S3B verts ; build frontend OK. Polish post-test appliqué : affordance « Lecture » sur lignes en lecture seule.

## 10. Vérification audit_log
Entrées confirmées : `login_success/login_failed`, `admin_update_user`, `export_cabinet_pdf`, `update_activity`, `create/update/delete_decision|risk`. Chaque mutation enregistre acteur, action, ressource, horodatage, avant/après.

## 11. Risques non résolus / notes
- `/legacy-pnd` : la page monte mais ses appels de données legacy (token `pnd_token`) ne sont plus authentifiés depuis le passage à l'auth METFPA — l'app legacy reste une **référence recouvrable** (route préservée ; restauration complète via `git checkout main`). Login legacy serveur intact dans `test_database`.
- Bruit console « 401 » transitoire pendant la connexion (sonde `/auth/me` avant présence du jeton) — non bloquant.
- Données décisions/risques/activités = démonstration ; aucune donnée officielle inventée.

## 12. Rollback
- Branche dédiée `phase1-s1-metfpa`. Retour app générique : `git checkout main`. Données isolées `metfpa_dev`. Collection `users` S4 supprimable sans impact référentiel. `METFPA_SEED_PASSWORD` géré par l'environnement (non commité).

## 13. Confirmation
✅ Aucun déploiement production · aucune donnée production modifiée · app legacy recouvrable.
✅ Hors périmètre (import Excel, exports génériques, notifications, SSO/MFA, analytics prédictive, validation officielle, migration utilisateurs prod, Phase 2) = **non démarrés**.

## 14. Recommandation Go/No-Go
**GO recommandé pour Phase 2 — préparation import & M&E** (import Excel officiel `IMPORT_METFPA.xlsx`, workflow baselines/cibles, upload de preuves), sous réserve de votre revue et de la **levée progressive du NO-GO** après validations METFPA (V1-V11). Le déploiement production reste conditionné à ces validations.
