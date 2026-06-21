# Sprint S1 — Rapport d'achèvement (METFPA Data Foundation)
Date : 2026-06-19 · Branche : `phase1-s1-metfpa` · Commit : `0f7eab8`
Statut production : **NO-GO maintenu** · Aucun déploiement effectué

---

## 1. Résumé du git diff
Modifications **additives et isolées** (la branche `main` reste intacte) :
```
 backend/.env                  |   8 ++   (ajout METFPA_DB_NAME, SEED_METFPA_PATH)
 backend/metfpa/__init__.py    |   4 +
 backend/metfpa/db.py          |  29 ++    (client Mongo dédié + audit + framework meta)
 backend/metfpa/router.py      | 154 ++    (endpoints METFPA)
 backend/metfpa/seed_loader.py | 171 ++    (import idempotent, sans aléatoire)
 backend/server.py             |  14 ++    (include_router + startup import — additif)
 tests/metfpa_s1_test.py       |  (nouveau, 8 assertions)
```
**Aucune ligne du cockpit générique existant n'a été supprimée ni réécrite.** `server.py` n'a reçu que l'inclusion du routeur et un hook de démarrage.

## 2. Fichiers modifiés / créés
- Créés : `backend/metfpa/{__init__,db,router,seed_loader}.py`, `tests/metfpa_s1_test.py`, ce rapport.
- Modifiés : `backend/server.py` (additif), `backend/.env` (clés additives, variables protégées préservées).

## 3. Base de données & collections créées
- **DB dédiée** : `metfpa_dev` (séparée de la production `test_database`).
- **11 collections** : `frameworks, pnd_nodes, pol_nodes, dig_nodes, dig_profile, indicators, alignments, activities, directions, import_log, audit_log`.
- **Index** : `pnd_nodes.code`, `pol_nodes.code` + `pol_nodes.pnd_effet`, `dig_nodes.code`, `indicators.niveau`, `activities.id`(unique) + `axe_pol` + `direction`, `frameworks.key`(unique).
- **Isolation vérifiée** : `test_database.actions` = 720 (inchangé), `users` = 4 (inchangé).

## 4. Endpoints créés (préfixe `/api/metfpa`)
`GET /health, /frameworks, /pnd, /politique, /digital, /indicators, /alignments, /activities, /budget/consolidated, /cabinet, /audit-log` · `PUT /activities/{id}` (audité) · `POST /admin/validate` (promotion contrôlée).

## 5. Résultat de l'import (idempotent)
| Collection | Comptes | Origine |
|---|---|---|
| frameworks | 3 (PND/POL/DIG, normalisés période) | html_reference / pending |
| pnd_nodes | 20 (1 pilier, 1 secteur, 3 effets, 15 produits) | html_reference / pending |
| pol_nodes | 130 (3 axes, 27 produits, 100 actions) | html_reference / pending |
| dig_nodes | 12 (3 axes, 9 objectifs) | html_reference / pending |
| indicators | 19 (7 cascade + 12 KPI digital) | html_reference / pending |
| alignments | 3 | html_reference / pending |
| activities | 62 | **demo_tracking / demo** |
| directions | 15 | **to_validate** |
Budget normalisé : PND 1 202 137,6 (240 427,5/an) · POL 2 937 726 (293 772,6/an) · DIG 33 562 (5 593,7/an).
Champs financiers par activité `budget_engage`/`source_financement` = **None (missing)**, listés dans `missing_fields`.

## 6. Résultats de test
`python3 tests/metfpa_s1_test.py` → **8/8 PASS** :
idempotence · origine+statut partout · activités démo classées · champs budget manquants explicites · cadres normalisés · aucune promotion automatique · audit de l'import · aucune direction officielle inventée.
Tests complémentaires HTTP : promotion sans `validated_by` → **HTTP 400** ; mutation activité → entrée `update_activity` dans `audit_log` ; login legacy → **OK**.

## 7. Critères d'acceptation S1 — couverture
| # | Critère | Statut |
|---|---|---|
| 1 | Import idempotent | ✅ (run2 inserted=0, comptes identiques) |
| 2 | Pas de seed aléatoire dans le chemin cible | ✅ (loader 100% déterministe depuis JSON) |
| 3 | Collections + codes stables + index | ✅ |
| 4 | data_origin + validation_status partout | ✅ |
| 5 | Activités démo visiblement classées | ✅ (demo_tracking) |
| 6 | Budget engagé/exécuté/source = missing explicite | ✅ |
| 7 | Cadres : period_start/end/years, scope, total, moyenne, source, statut | ✅ |
| 8 | Workflow de promotion existe, sans promotion auto | ✅ (POST explicite + garde 400) |
| 9 | Audit : imports, mutations, tentatives de validation | ✅ |
| 10 | Tests backend passent | ✅ 8/8 |
| 11 | Note de rollback fournie | ✅ (§8) |
| 12 | Rapport S1 livré avant S2 | ✅ (ce document) |

## 8. Plan de rollback
- Le code S1 est isolé sur la branche `phase1-s1-metfpa` ; `main` est intacte → `git checkout main` restaure l'état antérieur.
- Données : tout est dans la DB `metfpa_dev`. Suppression sûre : `mongo metfpa_dev --eval "db.dropDatabase()"` — **aucun impact** sur `test_database` (production).
- Pour retirer les endpoints sans changer de branche : retirer les 14 lignes additives de `server.py` (bloc « METFPA module »).
- Sauvegarde recommandée avant toute évolution : `mongodump --db metfpa_dev`.

## 9. Risques / points non résolus
- **Directions** (15) et **budget engagé/source par activité** restent `to_validate` / `missing` (sources officielles non fournies) — conforme aux consignes.
- **Écart budgétaire POL>PND** : exposé via comparaison normalisée + annotation, marqué `requires_client_validation` (non résolu, volontairement).
- Endpoints METFPA actuellement **sans RBAC appliqué** (structure RBAC = Phase 4) ; mutations tracées via en-tête `X-User`.
- Seed = **provisoire** (`pending_metfpa_validation`) tant que non relu par le METFPA.

## 10. Confirmation & recommandation
- ✅ **Aucun déploiement production effectué. Aucune donnée de production modifiée. Application existante recouvrable.**
- **Recommandation : GO pour Sprint S2** (refactor visuel : palette axes, OriginBadge, bandeau démo, Accueil intégré), sous réserve de votre revue de ce rapport. Le NO-GO production reste en vigueur jusqu'aux validations V1-V7 + V10-V11.
