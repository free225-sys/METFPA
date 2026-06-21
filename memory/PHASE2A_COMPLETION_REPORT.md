# Phase 2A — Rapport d'achèvement (METFPA · clôture sécurité + import Excel dry-run)
Date : 2026-06-21 · Branche : `phase1-s1-metfpa`
Statut production : **NO-GO maintenu** · Aucun déploiement · `metfpa_dev` uniquement · `test_database` legacy intact

## Commits
- **2A-0 (clôture sécurité/S4)** : `500d18e`, `0639264`
- **2A-1 (import Excel dry-run)** : `08ab974`
(2A-0 commité et vérifié vert avant le démarrage de 2A-1, conformément à la consigne.)

---

# PARTIE 2A-0 — Remédiation obligatoire

## 1. Protection de tous les endpoints de lecture
Tous les `/api/metfpa/*` exigent désormais une authentification, **sauf** `/health` et `/auth/login`.
- `Depends(get_identity)` ajouté sur : `/frameworks`, `/pnd`, `/politique`, `/digital`, `/indicators`, `/alignments`, `/activities`, `/cabinet`, `/budget/consolidated`, `/cabinet/alerts`, `/activities/{id}/history`.
- `GET /audit-log` → `require_role("me_validator","admin")` (reader/editor = 403).
- `pdf.py` adapté : `cabinet()`/`budget_consolidated()` reçoivent l'identité (appel interne).
- Réponses : non authentifié = **401** ; authentifié non autorisé = **403**. Aucune garde frontale utilisée comme contrôle de sécurité.

## 2. Effacement explicite de direction
`PUT /admin/users/{id}` utilise la **présence explicite de champ** (`model_dump(exclude_unset=True)`) :
- champ omis → direction préservée ; `direction = null` → effacée ; chaque changement audité (avant/après).
- Règle : un `direction_editor` doit toujours avoir une direction valide → effacer sans changer le rôle = **422**. `cabinet_reader`/`me_validator`/`admin` peuvent ne pas avoir de direction. Seul `admin` assigne/efface.

## 3. Ordre exécutif du Cabinet
Web (`/pilotage-directeur`) **et** PDF commencent par **① Décisions**. Le bloc KPI (`cabinet-kpis`) a été déplacé en **section ⑥**. Seuls titre + période + avis de fiabilité précèdent les Décisions. Vérifié par bounding-box : `cabinet-decisions` (y≈393) < `cabinet-kpis` (y≈2852).

## 4. Test du workflow de validation
`backend/tests/metfpa_validation_test.py` : snapshot DIG → promotion `me_validator` 200, `admin` 200, `cabinet_reader`/`direction_editor` 403, anonyme 401, audité (`promote_framework`) → **restauration complète** (aucun cadre officiel laissé promu). **PASSED**.

## Critères 2A-0 — tous PASS (pytest 53/53 + validation workflow)

---

# PARTIE 2A-1 — Import Excel dry-run (aucune application)

## Endpoints créés (`/api/metfpa/imports`)
| Méthode | Endpoint | Accès |
|---|---|---|
| POST | `/imports/excel/dry-run` | me_validator, admin (autres 403 / anon 401) |
| GET | `/imports` | me_validator, admin |
| GET | `/imports/{id}` | me_validator, admin (audité `import_report_access`) |
| DELETE | `/imports/{id}` | me_validator, admin (audité `import_cleanup`) |

**Aucun endpoint `/apply`.** Verdict jamais `READY_TO_APPLY`.

## Matrice d'auth (import)
anon **401** · cabinet_reader **403** · direction_editor **403** · me_validator **200** · admin **200**.

## Spécification du classeur utilisée
Feuilles requises : `PND`, `Politique_EFTP`, `Strategie_Digitale`, `Activites`, `Indicateurs`, `Alignements`, `Budget`, `Directions`. Colonnes requises et règles par feuille définies dans `SHEET_SPEC` (`imports.py`). Feuilles inconnues/mal orthographiées **signalées explicitement** (jamais acceptées silencieusement).

## Règles de validation dry-run
- **Fichier** : extension `.xlsx` seule (`.xls`/`.xlsm`/macros refusés), signature ZIP `PK\x03\x04`, taille max (`METFPA_IMPORT_MAX_BYTES`, défaut 10 Mo), protégé par mdp/corrompu refusé, hash SHA-256, taille, acteur, horodatage. **Formules non évaluées** (signalées en avertissement).
- **Schéma** : colonnes requises/inconnues, statut (nomenclature contrôlée), avancement 0–100, échéance `YYYY-TQ`, budgets numériques.
- **Intégrité référentielle** : codes uniques, doublons dans le fichier, référence parent dans la feuille.
- **Contrôles budget** : non numérique → erreur, négatif → erreur, période début ≤ fin, **valeurs manquantes préservées comme manquantes (jamais 0)**, split État 15/Bailleur 85 limité au Digital, aucune réconciliation forcée entre horizons.
- **Fiabilité par ligne** : `proposed_data_origin`, `proposed_validation_status`, feuille/ligne source, erreurs, avertissements, **opération** ∈ {insert, update, unchanged, conflict, reject}.

## Aucune application des données
Aucune écriture sur `frameworks/pnd_nodes/pol_nodes/dig_nodes/activities/indicators/alignments/budget_lines/directions/decisions/risks`. Écritures limitées à `import_jobs` + `audit_log`. Contenu fichier discardé après traitement (rien sur disque). **Vérifié** : `GET /activities` reste à **62** après plusieurs dry-runs.

## Rapport & verdicts
Rapport structuré persisté (id, filename, sha256, uploader, horodatage, résumé feuilles, totaux, inserts/updates/unchanged/conflicts/rejects, résultats budget & intégrité, verdict). Verdicts : `READY_FOR_REVIEW` / `READY_WITH_WARNINGS` / `BLOCKED_BY_ERRORS`.

### Échantillons de rapports (joints)
- `/app/memory/samples/dryrun_valid.json` → **READY_FOR_REVIEW**
- `/app/memory/samples/dryrun_warn.json` → **READY_WITH_WARNINGS** (échéance non conforme + feuille inconnue)
- `/app/memory/samples/dryrun_blocked.json` → **BLOCKED_BY_ERRORS** (feuille Directions manquante + statut invalide + budget négatif)
- PDF Cabinet : `/app/memory/samples/METFPA_Cabinet_Brief_SAMPLE.pdf`

## Interface de revue (`/imports`)
Page authentifiée me_validator/admin (Sidebar « Données → Imports (dry-run) »). Affiche métadonnées, statut feuilles, compteurs erreurs/avertissements, inserts/updates proposés, validation ligne par ligne, **filtres** feuille/sévérité/opération. **Aucun bouton « Appliquer »**. Bandeau permanent « Dry-run uniquement — aucune donnée METFPA n'est modifiée ». Historique avec ouverture + suppression (cleanup).

## Audit
Audité : `import_upload`, `import_dryrun_complete`, `import_dryrun_failed`, `import_report_access`, `import_cleanup`, plus accès refusés (via 401/403). Aucun binaire/jeton/secret/stacktrace stocké.

## Rollback & cleanup
Aucune donnée métier appliquée → rollback = suppression du job (`DELETE /imports/{id}`) + résultats, suppression des fichiers temporaires (déjà discardés), **trace d'audit préservée**. Testé.

## Tests (22+ scénarios) — 100 %
`backend/tests/metfpa_phase2a_test.py` : **53/53** (auth gating, audit-log RBAC, history scope, direction clear/preserve/422, validation RBAC, imports RBAC/verdicts/no-mutation/list-get-delete). Frontend testing_agent (`iteration_6.json`) : **100 %** (4 rôles, ordre Cabinet, page imports, filtres, suppression, access-denied). S1/S3A/S3B/S4 régressions vertes.

## Preuve d'absence de mutation métier
`GET /activities` = 62 inchangé après dry-runs ; aucune collection métier modifiée ; seules `import_jobs` + `audit_log` écrites.

## Problèmes non résolus (mineurs, non bloquants)
- Bruit console « Failed to load resource: 401 » lors des transitions de connexion (sondes API avant persistance du jeton). Cosmétique. Correctif possible : garder les fetchs sur un flag `AuthContext.ready`.

## Confirmation
✅ Aucun déploiement production · aucune mutation de données production · aucune promotion de donnée officielle · **aucun endpoint d'application Excel** · aucun upload de preuve · aucun export générique · aucun travail Phase 2B · aucune direction/budget officiel inventé.

## Recommandation Go/No-Go
**GO recommandé pour Phase 2B** (workflow d'application contrôlée des imports validés : prévisualisation diff → application transactionnelle avec rollback → re-promotion M&E), sous réserve de votre revue. **NO-GO production maintenu** jusqu'aux validations METFPA.
