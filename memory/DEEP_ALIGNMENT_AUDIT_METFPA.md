# AUDIT D'ALIGNEMENT APPROFONDI — Cockpit METFPA (Secteur 4.02 · EFTP)

> **Rôle de l'auteur** : Auditeur produit senior, mandat indépendant.
> **Nature de l'exercice** : Audit **lecture seule, fondé sur preuves**. Aucune ligne de code, base de données, configuration, utilisateur, rôle, seed ou donnée source n'a été modifiée pour produire ce rapport.
> **Périmètre audité** : Phase 0 → Phase 2A (Sprints S1, S2, S3A, S3B, S4, Phases 2A-0 et 2A-1).
> **Branche** : `phase1-s1-metfpa` · **Base applicative** : `metfpa_dev` (isolée) · **Date d'audit** : 21/06/2026.
> **Méthode** : inspection directe des fichiers (`backend/metfpa/*`, `frontend/src/pages/*`), interrogation des endpoints en exécution (`curl`), lecture des collections MongoDB via `/health` et endpoints authentifiés, relecture des rapports Phase 0→2A et des rapports de test (`iteration_1→6.json`), `git log`.

---

## Section 1 — Verdict exécutif

**Verdict global : ALIGNÉ — avec réserves mineures à traiter. (GO conditionnel pour Phase 2B.)**

Le produit livré (Phase 0 → Phase 2A) reste **fidèle à son objectif fondateur** : un cockpit institutionnel METFPA **strictement centré sur le Secteur 4.02 (EFTP)**, destiné au pilotage Cabinet/Directeur, articulant les trois référentiels (PND 4.02, Politique EFTP, Stratégie digitale) avec une **gouvernance de données stricte** (officiel / référence à valider / démo / manquant). Les piliers fondateurs sont tous présents et opérationnels :

- **Mono-secteur 4.02** : confirmé. Aucune dérive vers un produit PND générique multi-piliers dans le module METFPA.
- **Non-invention de données officielles** : confirmé et appliqué de façon systématique (origine + statut de validation affichés partout ; budgets engagés / sources « manquant » ; directions « à valider »).
- **Vue Cabinet < 2 min, décisions d'abord** : confirmé en code (ordre ①Décisions → … → ⑦Note) et en PDF.
- **Sécurité serveur (RBAC + JWT)** : confirmée et effective (401 anonyme, 403 hors rôle, identité re-lue en base, pas de bypass).
- **Import Excel en dry-run sans mutation** : confirmé (aucun endpoint `/apply`, écriture limitée à `import_jobs` + `audit_log`).

**Réserves identifiées (aucune bloquante pour l'audit, à traiter avant industrialisation)** :
1. **Dette d'architecture majeure** : l'ancien cockpit PND générique (720 actions, seed `random.Random(2030)`) **reste monté et auto-seedé au démarrage** dans `backend/server.py`, alors que le plan Phase 0 prévoyait sa suppression. Cohabitation de deux applications dans un même backend.
2. **`test_credentials.md` obsolète** : ne contient que les comptes hérités du cockpit PND (`ministre@pnd.ci` …), **pas les 4 comptes METFPA** réellement utilisés. Risque opérationnel pour la recette et les forks.
3. **Dérives cosmétiques mineures** : libellé « Export PDF = Phase 2 » encore affiché sous la note du Directeur alors que l'export PDF est livré et fonctionnel.
4. **Profondeur M&E partielle** (attendu en Phase 1) : baselines/cibles/valeurs actuelles non saisies, note du Directeur persistée en `localStorage` (non auditée), volumétrie décisions/risques de démonstration faible (1/1).

**Score de confiance global : 8,4 / 10** (détail §2).

---

## Section 2 — Tableau de score d'alignement (Alignment scorecard)

Notation 0–10 (10 = pleinement aligné, preuve directe ; 5 = partiel ; 0 = absent/contraire). Pondération reflète la criticité de l'objectif fondateur.

| # | Objectif exécutif fondateur | Poids | Score | Preuve clé | Commentaire |
|---|---|---|---|---|---|
| O1 | Périmètre strictement Secteur 4.02 (mono-secteur EFTP) | 15 % | **10** | `seed_metfpa.json _meta.scope`, `db.py FRAMEWORK_META` (PND/POL/DIG 4.02), aucune logique 6-piliers dans `metfpa/` | Aucun écart. |
| O2 | Intégration des 3 référentiels (PND/POL/Digital) + alignement | 12 % | **10** | `/pnd`,`/politique`,`/digital`,`/alignments`; `pnd_nodes=20`,`pol_nodes=130`,`dig_nodes=12`,`alignments=3` | Chaîne de résultats complète. |
| O3 | Gouvernance des données (officiel/référence/démo/manquant) | 15 % | **10** | `OriginBadge` partout, `REF`/`DEMO` constants, `MissingValue`, `requires_client_validation` | Pilier le mieux tenu du projet. |
| O4 | Non-invention de données officielles | 12 % | **10** | `budget_engage`/`source_financement` = `None` (manquant), directions `to_validate`, filigrane PDF | Discipline exemplaire. |
| O5 | Vue Cabinet décisionnelle < 2 min, décisions d'abord | 12 % | **10** | `CabinetView.jsx` ①Décisions (l.67) … ⑦Note ; PDF `pdf.py` même ordre | Remédiation 2A-0 effective. |
| O6 | Sécurité : RBAC serveur + auth durcie | 12 % | **9** | `auth.py` (JWT HS256, bcrypt, identité re-lue BD), 401/403 vérifiés en live | -1 : secret JWT/seed via env à confirmer hors repo en prod. |
| O7 | Alertes exécutives déterministes (pas d'IA) | 6 % | **10** | `alerts.py` règles documentées `DEC_*`/`ACT_*`/`RISK_*`/`DQ_*` | Conforme. |
| O8 | Import Excel maîtrisé (dry-run, aucune mutation) | 8 % | **10** | `imports.py` (pas de `/apply`), preuve `activities=62` constant | Conforme au mandat. |
| O9 | Traçabilité / auditabilité (audit_log) | 6 % | **9** | `audit()` sur toutes mutations + login + exports | -1 : note Directeur non auditée. |
| O10 | Complétude M&E (baselines, cibles, valeurs, preuves) | 5 % | **4** | `ACTIVITY_MISSING` non saisi, `valeur_actuelle=None` sur 19 indicateurs | Attendu en Phase 1/2+, à planifier. |
| O11 | Propreté d'architecture / absence de dette | 5 % | **4** | Legacy PND 720 actions toujours monté + seedé (`server.py`) | Dette réelle, voir §10. |

**Score pondéré global = 8,4 / 10.**
Sous-total « Fidélité stratégique » (O1-O5, O7-O8) ≈ **9,9/10**. Sous-total « Industrialisation » (O6, O9-O11) ≈ **6,5/10** → c'est là que se concentre le travail restant.

---

## Section 3 — Matrice de traçabilité (objectif fondateur → preuve livrée)

| Exigence fondatrice (Phase 0 / PRD) | Statut | Artefact de preuve (chemin / endpoint / commit) |
|---|---|---|
| Pivot cockpit PND générique → cockpit METFPA 4.02 | ✅ Livré | `PRD.md` §PIVOT ; module isolé `backend/metfpa/` ; DB `metfpa_dev` |
| Base de données isolée (ne pas toucher legacy) | ✅ Livré | `db.py` `METFPA_DB_NAME` ; `/health` → `"db":"metfpa_dev"` |
| Référentiel PND 4.02 (effets/produits + ancre digitale) | ✅ Livré | `seed_loader.py` (pnd_nodes) ; endpoint `/pnd` ; `pnd_nodes=20` |
| Référentiel Politique EFTP (axes/produits/actions) | ✅ Livré | `/politique` ; `pol_nodes=130` (3 axes/27 produits/100 actions) |
| Référentiel Stratégie digitale (axes/OS/orientations/KPI) | ✅ Livré | `/digital` + `dig_profile` ; `dig_nodes=12` ; KPI dans `indicators` |
| Alignement PND ⇄ Politique ⇄ Digital | ✅ Livré | `/alignments` ; `alignments=3` ; `dig_ancrage` |
| KPI en cascade national→opérationnel | ⚠️ Partiel | `indicators=19` présents mais `valeur_actuelle=None` (saisie M&E à faire) |
| Plan d'action (activités éditables, champs M&E) | ⚠️ Partiel | `/activities` (62) ; PUT limité à avancement/statut/alerte ; champs M&E `missing` |
| Budget consolidé normalisé (multi-horizons + annotation) | ✅ Livré | `/budget/consolidated` (4 modes, `NORM_NOTE`, `requires_client_validation`) |
| Vue Pilotage Directeur (Cabinet) — décisions d'abord | ✅ Livré | `CabinetView.jsx` ; `/cabinet` ; ordre ①→⑦ ; commit 2A-0 `500d18e` |
| Registres Décisions & Risques (CRUD audité, score P×I) | ✅ Livré | `registers.py` ; `/decisions`,`/risks` ; `severity_from_score` |
| Alertes exécutives déterministes | ✅ Livré | `alerts.py` ; `/cabinet/alerts` ; règles `*_*` documentées |
| Export PDF réel Note de Cabinet (filigrane provisoire) | ✅ Livré | `pdf.py` ; `/cabinet/export/pdf` ; échantillon `samples/…SAMPLE.pdf` |
| RBAC 4 rôles + scope direction + garde dernier admin | ✅ Livré | `auth.py` (`ROLES`,`require_role`,`assert_direction_scope`, garde l.172-177) |
| Auth durcie JWT + bcrypt, sans bypass dev | ✅ Livré | `auth.py` `get_identity` (signature/exp/type, re-lecture BD) |
| Tous les GET `/api/metfpa/*` authentifiés (sauf health/login) | ✅ Livré | `Depends(get_identity)` sur tous endpoints lecture ; live 401 |
| `GET /audit-log` restreint validateur/admin | ✅ Livré | `router.py` l.248 `require_role("me_validator","admin")` |
| Import Excel dry-run, aucune mutation, aucun `/apply` | ✅ Livré | `imports.py` ; preuve `activities=62` post dry-run |
| Workflow de promotion seed (jamais automatique) | ✅ Livré | `router.py` `/admin/validate` (validateur/admin, validated_by requis) |
| Seed aléatoire `random.Random(2030)` supprimé du design cible | ❌ Non tenu | `server.py seed_data()` l.199-265 **toujours actif** (legacy `test_database`) |
| Suppression données mock 6 piliers (logique produit) | ⚠️ Partiel | Absent de `metfpa/` ✅ mais legacy PND générique toujours monté ❌ |

---

## Section 4 — Inventaire fonctionnel (Feature inventory)

### 4.1 Backend — endpoints METFPA (`/api/metfpa/*`)

| Domaine | Endpoint | Méthode | Accès | Statut |
|---|---|---|---|---|
| Santé | `/health` | GET | Public | ✅ |
| Auth | `/auth/login`,`/auth/me`,`/auth/logout` | POST/GET/POST | Public / Auth | ✅ |
| Admin users | `/admin/users`, `/admin/users/{id}` | GET/PUT | admin | ✅ |
| Référentiels | `/frameworks`,`/pnd`,`/politique`,`/digital` | GET | Auth | ✅ |
| Indicateurs | `/indicators` | GET | Auth | ✅ |
| Alignements | `/alignments` | GET | Auth | ✅ |
| Activités | `/activities`, `/activities/{id}` (PUT) | GET/PUT | Auth / EDIT_ROLES+scope | ✅ |
| Historique | `/activities/{id}/history` | GET | Auth (+scope direction) | ✅ |
| Budget | `/budget/consolidated` | GET | Auth | ✅ |
| Cabinet | `/cabinet` | GET | Auth | ✅ |
| Cabinet alertes | `/cabinet/alerts` | GET | Auth | ✅ |
| Export PDF | `/cabinet/export/pdf` | GET | Auth | ✅ |
| Décisions | `/decisions` (+meta/{id}) CRUD | GET/POST/PUT/DELETE | lecture libre / EDIT_ROLES écriture | ⚠️ voir §8.3 |
| Risques | `/risks` (+meta/{id}) CRUD | GET/POST/PUT/DELETE | lecture libre / EDIT_ROLES écriture | ⚠️ voir §8.3 |
| Promotion | `/admin/validate` | POST | me_validator, admin | ✅ |
| Audit | `/audit-log` | GET | me_validator, admin | ✅ |
| Imports | `/imports/excel/dry-run`,`/imports`,`/imports/{id}` (GET/DELETE) | POST/GET/DELETE | me_validator, admin | ✅ |

### 4.2 Frontend — pages METFPA (`frontend/src/pages/`)

`AccueilIntegre`, `VuePND`, `PolitiqueEFTP`, `StrategieDigitale`, `PlanAction`, `Alignement`, `KpiCascade`, `CabinetView` (Pilotage Directeur), `DecisionRegister`, `RiskRegister`, `BudgetConsolide`, `ImportsDryRun`, `AdminUsers`, `Login`. Composants gouvernance : `OriginBadge`/`MissingValue`, `DemoBanner`, `Breadcrumb`, `HierTree`, badges statut/pilier.

### 4.3 Modules backend
`auth.py` (RBAC/JWT), `router.py` (lecture + mutations auditées + promotion), `registers.py` (décisions/risques), `alerts.py` (alertes déterministes), `imports.py` (dry-run Excel), `pdf.py` (export reportlab), `db.py` (connexion+audit), `seed_loader.py` (seed idempotent).

---

## Section 5 — Carte de fiabilité des données (Data reliability map)

| Bloc de données | Volume (live) | data_origin | validation_status | Présenté comme | Fiabilité |
|---|---|---|---|---|---|
| PND 4.02 (nœuds) | 20 | html_reference | pending_metfpa_validation | Référence à valider | 🟡 Moyenne |
| Politique EFTP (nœuds) | 130 | html_reference | pending_metfpa_validation | Référence à valider | 🟡 Moyenne |
| Stratégie digitale (nœuds) | 12 (+profil) | html_reference | pending_metfpa_validation | Référence à valider | 🟡 Moyenne |
| Indicateurs (cascade + digital) | 19 | html_reference | pending | Référence, **valeur_actuelle=None** | 🟡 Incomplet |
| Alignements | 3 | html_reference | pending | Référence | 🟡 Moyenne |
| Frameworks (budgets) | 3 | html_reference | pending | Référence + `requires_client_validation` | 🟡 Moyenne |
| Activités (suivi opérationnel) | 62 | **demo_tracking** | demo | **Démonstration — jamais officiel** | 🔴 Démo (assumé) |
| Budget engagé / source par activité | — | **missing** | missing | « Donnée absente » (jamais 0) | ⚪ Manquant (correct) |
| Directions responsables | (déduites) | **to_validate** | pending_metfpa_validation | « À valider » | ⚪ Manquant (correct) |
| Décisions / Risques | 1 / 1 | demo_tracking | to_validate | Démonstration | 🔴 Démo, **faible volume** |
| Audit log | croissant | système | — | Trace | 🟢 Fiable |
| Import jobs | dry-run | métadonnées | — | Aucune donnée métier | 🟢 Fiable |

**Constat clé** : la **chaîne de fiabilité est honnête et traçable** — chaque bloc porte son origine et son statut, rien de provisoire/démo n'est présenté comme officiel. Le filigrane PDF (`pdf.py` l.87) et les bandeaux `DemoBanner` renforcent ce contrat. **Aucune donnée officielle inventée** : confirmé par inspection (`budget_engage`/`source_financement` strictement `None`).

**Limites** : (a) les `valeur_actuelle` des 19 indicateurs sont nulles → le suivi M&E n'est pas encore alimenté ; (b) volumétrie décisions/risques (1/1) trop faible pour une recette Cabinet réaliste.

---

## Section 6 — Aptitude à l'usage Cabinet (Cabinet usability)

**Verdict : conforme à l'intention « situation comprise en < 2 minutes, décisions d'abord ».**

- **Ordre décisionnel respecté** : `CabinetView.jsx` rend ①Décisions requises (l.67) → Alertes exécutives → ②Alertes/blocages → ③Échéances (≤30 j + retards) → ④Risques → ⑤Budget → ⑥Avancement/KPI → ⑦Note. Le bloc KPI a bien été **déplacé en ⑥** (remédiation 2A-0, `data-testid="cabinet-kpis"` l.177).
- **Note de Cabinet exportable** : bouton `export-pdf-btn` → `/cabinet/export/pdf` (PDF reportlab réel, 7 sections + sources/validation + filigrane).
- **Signalétique exécutive** : sévérités colorées, badges d'origine, montants normalisés, mentions « démo non officiel » visibles.
- **Navigation décisionnelle** : liens directs vers registres Décisions/Risques/Budget.

**Frictions / améliorations Cabinet** :
1. **Note du Directeur non persistée côté serveur** (`localStorage` l.20/29) → perdue d'un poste à l'autre, **non auditée**, et libellé trompeur « Export PDF = Phase 2 » (l.217) alors que l'export existe. À corriger.
2. **Double bloc « alertes »** (Alertes exécutives déterministes *et* ②Alertes/blocages) peut créer une légère redondance perçue pour un Directeur ; à clarifier (libellés distincts ou fusion).
3. **Volumétrie démo faible** (1 décision, 1 risque) : la valeur décisionnelle de la vue n'est pas démontrable de façon convaincante en l'état.

---

## Section 7 — Complétude du dispositif M&E (M&E completeness)

| Brique M&E (cible Phase 0) | État | Preuve |
|---|---|---|
| Cadre logique / chaîne de résultats | ✅ | PND→Politique→Digital + alignements |
| Indicateurs cascade (libellé/base/cible) | ⚠️ | présents mais `valeur_actuelle=None` (19) |
| Saisie de la valeur actuelle vs cible | ❌ | non implémentée (lecture seule des indicateurs) |
| Baselines / cibles par activité | ❌ | `ACTIVITY_MISSING` → `None` |
| Budget engagé / exécuté officiel | ❌ (assumé manquant) | `missing`, jamais inventé |
| Fréquence reporting / source de vérification | ❌ | champs `missing` |
| Preuves (evidence / object storage) | ❌ (hors périmètre Phase 2A) | `evidence:[]` vide |
| Registre Décisions / Risques + scoring | ✅ | `registers.py` (P×I, sévérité auto) |
| Alertes M&E déterministes (qualité données) | ✅ | `alerts.py` `DQ_*` |
| Workflow de validation/promotion référentiels | ✅ | `/admin/validate` |
| Audit / traçabilité des changements | ✅ | `audit_log` + `/activities/{id}/history` |

**Synthèse** : l'**ossature M&E (structure, gouvernance, traçabilité, alertes)** est en place et solide ; le **contenu M&E vivant (valeurs courantes, baselines, cibles, preuves)** n'est volontairement pas alimenté (dépend des validations METFPA et de l'import officiel — Phases 2B/2+). C'est conforme à la stratégie « ne rien inventer », mais cela signifie que **le cockpit n'est pas encore un outil de mesure de performance, seulement un outil de cadrage et de pilotage des alertes/décisions**.

---

## Section 8 — Sécurité & RBAC (Security & RBAC)

### 8.1 Authentification
- **JWT HS256** signé via secret d'environnement (`auth.py _secret()` → `os.environ["JWT_SECRET"]`), TTL 8 h, vérification signature + expiration + `type` (`metfpa_access`).
- **Identité ré-autoritative** : `get_identity` **re-lit le rôle/direction en base** à chaque requête (le client ne peut pas usurper un rôle via le token). Compte désactivé → 401. **Pas de bypass dev.**
- **Mots de passe** : bcrypt (`_hash`/`_verify`), jamais renvoyés (`{"password_hash":0}`). Échecs de login audités.
- **Vérifié en live** : `/api/metfpa/cabinet` sans token → **401** ; legacy `/api/dashboard`, `/api/actions` → **401** également (legacy gardé).

### 8.2 Autorisation (matrice effective)
| Capacité | cabinet_reader | direction_editor | me_validator | admin |
|---|---|---|---|---|
| Lecture référentiels/cabinet/alertes | ✅ | ✅ | ✅ | ✅ |
| Éditer activité (scope direction) | ❌ | ✅ (sa direction) | ✅ | ✅ |
| CRUD décisions/risques | ❌ écriture | ✅ écriture | ✅ | ✅ |
| Promotion référentiel `/admin/validate` | ❌ | ❌ | ✅ | ✅ |
| `/audit-log` | ❌ | ❌ | ✅ | ✅ |
| Import dry-run + gestion | ❌ | ❌ | ✅ | ✅ |
| Admin users | ❌ | ❌ | ❌ | ✅ |

- **Scope direction** : `assert_direction_scope` empêche un `direction_editor` de muter/lire l'historique hors de sa direction (403).
- **Garde « dernier admin »** : `patch_user` (l.172-177) interdit la démotion/désactivation du dernier admin actif (409).
- **Effacement explicite de direction** : `exclude_unset=True` + règle 422 si on prive un `direction_editor` de direction sans changer son rôle.

### 8.3 Failles / écarts identifiés (à corriger)
1. **🟠 Lecture des registres Décisions/Risques non authentifiée** : `registers.py` expose `GET /decisions`, `/decisions/meta`, `/decisions/{id}`, `/risks`, `/risks/meta`, `/risks/{id}` **sans `Depends(get_identity)`** (lignes 76-91, 171-187). Contrairement à tous les autres GET `/api/metfpa/*` (gatés en 2A-0), ces routes sont **publiques**. **Incohérence de sécurité réelle** : un anonyme peut lister décisions et risques (données de démonstration, mais le contrat 2A-0 « tous les GET authentifiés sauf health/login » n'est pas tenu ici). → À gater.
2. **🟡 Secret JWT / mot de passe seed via environnement** : correct en principe, mais à confirmer comme **secrets gérés hors dépôt** avant toute production (risque Phase 0 « secrets en clair »).
3. **🟡 Cohabitation du backend legacy** : surface d'attaque et de confusion supplémentaire (voir §10), même si les routes legacy sont authentifiées.

> Note : la Phase 2A-0 affirmait que « tous les `/api/metfpa/*` exigent une authentification, sauf `/health` et `/auth/login` ». **L'audit infirme partiellement cette affirmation** pour les six routes de lecture des registres ci-dessus — écart à documenter et corriger.

---

## Section 9 — Dérive fonctionnelle (Functional drift)

| Dérive observée | Gravité | Preuve | Sens de la dérive |
|---|---|---|---|
| Cockpit PND générique (720 actions) toujours monté & seedé | 🟠 Modérée | `server.py` l.199-265, `on_startup` l.268 | **Élargissement** non maîtrisé du périmètre technique (l'app fondatrice 4.02 devait remplacer, pas coexister) |
| Seed aléatoire `random.Random(2030)` non supprimé | 🟠 Modérée | `server.py seed_data()` actif | Contraire au plan Phase 0 (« Supprimer ») |
| Lecture registres Décisions/Risques publique | 🟠 Modérée | `registers.py` GET non gatés | Régression vs contrat 2A-0 |
| Libellé « Export PDF = Phase 2 » obsolète | 🟢 Mineure | `CabinetView.jsx` l.217 | Texte non mis à jour après livraison PDF |
| `test_credentials.md` ne reflète que le legacy PND | 🟠 Modérée | fichier (16 lignes, comptes `*@pnd.ci`) | Désynchronisation doc ↔ produit |
| Note Directeur en `localStorage` (non serveur, non auditée) | 🟢 Mineure | `CabinetView.jsx` l.20/29 | Fonction décisionnelle non gouvernée |

**Conclusion** : **aucune dérive du cœur stratégique** (le module METFPA reste pur, mono-secteur, gouverné). Les dérives sont **périphériques** : dette héritée non purgée (legacy), une régression de gating sur 6 routes, et de la documentation obsolète. Le produit **n'a pas glissé** vers un outil générique ; le risque est plutôt l'**accumulation de résidus** autour du noyau sain.

---

## Section 10 — Dette technique (Technical debt)

| Item | Sévérité | Localisation | Recommandation |
|---|---|---|---|
| **Backend legacy PND complet co-monté** | 🔴 Élevée | `server.py` l.~26-614 (`api_router`, `seed_admin`, `seed_data`, dashboard/actions/tree/analytics/ministries/alerts) | Décider : (a) retirer le legacy du démarrage et des routes, ou (b) l'isoler explicitement derrière un flag/route `/legacy-pnd` documenté. Cesser le seed `random.Random(2030)` non nécessaire. |
| **Seed aléatoire actif** | 🟠 Modérée | `server.py seed_data()` | Désactiver (le design cible le proscrit). |
| **6 GET registres non authentifiés** | 🟠 Modérée | `registers.py` | Ajouter `Depends(get_identity)` (et scope si pertinent). |
| **`test_credentials.md` obsolète** | 🟠 Modérée | `memory/test_credentials.md` | Aligner sur les 4 comptes METFPA réels (hors périmètre lecture-seule de cet audit). |
| **Note Directeur non persistée/auditée** | 🟢 Faible | `CabinetView.jsx` | Persister via endpoint dédié + audit. |
| **Libellés obsolètes (PDF Phase 2)** | 🟢 Faible | `CabinetView.jsx` l.217 | Mettre à jour le texte. |
| **Volumétrie démo décisions/risques (1/1)** | 🟢 Faible | seed/registres | Enrichir le jeu de démonstration pour la recette Cabinet. |
| **Tests legacy mêlés** | 🟢 Faible | `tests/backend_test.py` (PND) vs `metfpa_*` | Cloisonner suites legacy / METFPA. |
| **Indicateurs sans valeur courante** | 🟡 (M&E) | `seed_loader.py` (`valeur_actuelle=None`) | Ouvrir la saisie M&E (Phase 2+). |

**Dette structurante n°1** : la coexistence de **deux applications** (PND générique hérité + METFPA) dans un seul `server.py` augmente la surface de maintenance, de sécurité et de confusion. C'est le principal candidat au **refactoring** avant industrialisation : extraire/retirer le legacy, ne garder que le module `metfpa/` au démarrage.

---

## Section 11 — Recommandations & décision Go/No-Go

### 11.1 Décisions
| Sujet | Décision | Justification |
|---|---|---|
| **Production** | **NO-GO (maintenu)** | Validations METFPA V1-V11 non acquises ; données = référence/démo/manquant ; M&E non alimenté. |
| **Phase 2B (application contrôlée des imports validés)** | **GO conditionnel** | L'ossature (dry-run, audit, RBAC, promotion) est saine et testée ; conditionner au traitement des correctifs P0 ci-dessous. |
| **Intégrité du noyau stratégique** | **VALIDÉE** | Mono-secteur 4.02, gouvernance et non-invention pleinement respectés. |

### 11.2 Correctifs prioritaires (avant/au début de Phase 2B)
- **P0-1** — Authentifier les 6 GET de `registers.py` (rétablir le contrat 2A-0 « tous les GET gatés »).
- **P0-2** — Trancher le sort du backend legacy PND : retrait du démarrage ou isolation explicite ; désactiver `seed_data()`.
- **P0-3** — Resynchroniser `test_credentials.md` avec les 4 comptes METFPA (recette/forks).
- **P1-1** — Persister + auditer la Note du Directeur ; corriger le libellé « Export PDF = Phase 2 ».
- **P1-2** — Enrichir le jeu de démonstration décisions/risques pour une recette Cabinet crédible.
- **P2-1** — Ouvrir la saisie M&E (valeurs courantes/baselines/cibles) une fois l'import officiel validé.
- **P2-2** — Confirmer la gestion des secrets (JWT/seed) hors dépôt pour tout environnement non-démo.

### 11.3 Ce qu'il ne faut PAS faire
- Ne pas déployer en production avant validations METFPA.
- Ne pas promouvoir de données démo/référence en « officiel » sans `/admin/validate` tracé.
- Ne pas réintroduire de logique 6-piliers générique dans le module METFPA.

### 11.4 Verdict final
> **Le cockpit METFPA est resté fidèle à sa mission fondatrice (8,4/10).** Le cœur stratégique, décisionnel, sécuritaire et de gouvernance des données est livré et conforme. Les réserves sont **périphériques et corrigeables** (dette legacy, gating de 6 routes, documentation). **GO conditionnel pour Phase 2B**, **NO-GO production maintenu**.

---

## Annexe — Preuves (Evidence appendix)

**Branche & commits** (`git log`) : `phase1-s1-metfpa` ; 2A-0 `500d18e`,`0639264` ; 2A-1 `08ab974` ; S2 `0564463` ; S1 `0f7eab8`.

**Comptages live** (`GET /api/metfpa/health`) :
`{"db":"metfpa_dev","frameworks":3,"pnd_nodes":20,"pol_nodes":130,"dig_nodes":12,"indicators":19,"alignments":3,"activities":62}`.
`GET /cabinet.kpis` → `{activites:62, alertes:11, bloques:4, en_retard:6, decisions_en_attente:1, risques_critiques:1, avancement_moyen:33.8}`. Décisions=1, Risques=1.

**Contrôles de sécurité en exécution** :
- `GET /api/metfpa/cabinet` sans token → **401**.
- `GET /api/dashboard` (legacy), `GET /api/actions` (legacy) sans token → **401**.
- `POST /api/metfpa/auth/login` (admin@metfpa.ci) → token (268 car.) émis.

**Collections MongoDB (`metfpa_dev`)** : `frameworks, pnd_nodes, pol_nodes, dig_nodes, dig_profile, indicators, alignments, activities, directions, decisions, risks, audit_log, import_jobs, import_log, users`.

**Références de code clés** :
- Gating lecture : `backend/metfpa/router.py` (tous GET → `Depends(get_identity)`), sauf `/health` (l.23).
- **Écart de gating** : `backend/metfpa/registers.py` l.76-91 et 171-187 (GET décisions/risques **sans** dépendance d'auth).
- RBAC/JWT : `backend/metfpa/auth.py` (`get_identity` l.74-93, `require_role` l.96, `assert_direction_scope` l.104, garde dernier admin l.172-177).
- Alertes déterministes : `backend/metfpa/alerts.py` (`build_alerts`, règles `DEC_*`/`ACT_*`/`RISK_*`/`DQ_*`).
- Import dry-run sans mutation : `backend/metfpa/imports.py` (`/excel/dry-run` l.252 ; écriture limitée `import_jobs`+`audit_log` ; pas de `/apply`).
- PDF filigrane provisoire : `backend/metfpa/pdf.py` l.77, 85-88, ordre ①Décisions→⑦Note.
- Cabinet « décisions d'abord » : `frontend/src/pages/CabinetView.jsx` l.67 (①Décisions), l.177 (`cabinet-kpis` en ⑥), l.217 (libellé obsolète), l.20/29 (note `localStorage`).
- **Dette legacy** : `backend/server.py` l.199-265 (`seed_data` `random.Random(2030)`), l.268-273 (startup seed), l.614 (`include_router(api_router)`), l.617-631 (montage des routeurs METFPA).
- Seed gouverné : `backend/metfpa/seed_loader.py` (`REF`, `ACTIVITY_MISSING`, idempotence).

**Rapports & tests référencés** : `PHASE0_PLAN_METFPA.md`, `GONOGO_REVIEW_METFPA.md`, `SPRINT_S1/S2/S3A/S3B/S4_COMPLETION_REPORT.md`, `PHASE2A_COMPLETION_REPORT.md` ; `backend/tests/metfpa_{validation,s3b,s4,phase2a}_test.py` ; `test_reports/iteration_1→6.json` (S3A 14/14, S3B 13/13, S4 28/28, 2A 53/53 selon rapports).

**Désynchronisation documentaire** : `memory/test_credentials.md` (16 lignes) ne contient que les comptes legacy `*@pnd.ci` ; les comptes METFPA réels (`admin@metfpa.ci`, `validateur@metfpa.ci`, `direction.daf@metfpa.ci`, `cabinet@metfpa.ci`, mdp `Metfpa@2026Demo`) **n'y figurent pas**.

---
*Fin de l'audit. Document strictement consultatif — aucune modification de code, base, configuration, rôle, seed ou donnée source n'a été effectuée.*
