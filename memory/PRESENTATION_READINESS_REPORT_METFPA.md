# RAPPORT DE PRÉPARATION À LA PRÉSENTATION — Cockpit METFPA (Secteur 4.02 · EFTP)

> Sprint d'urgence « presentation-readiness ». Objectif : rendre le produit livré **cohérent, spécifique par rôle, crédible visuellement et démontrable**. Aucun rebuild backend, aucune dérive de la politique de fiabilité des données, aucun déploiement production.
> Date : 21/06/2026 · Langue UI : Français.

---

## Gate 0 — Version réellement déployée (vérifiée)

| Élément | Constat |
|---|---|
| **Branche** | `phase1-s1-metfpa` |
| **Commit avant sprint** | `de37eca` (S4 + Phase 2A déjà présents) |
| **Commit après sprint** | `60a8a19` (auto-commit plateforme, code de ce sprint inclus) |
| **Backend / DB** | FastAPI + MongoDB `metfpa_dev` (vérifié via `/api/metfpa/health` → frameworks 3, pnd 20, pol 130, dig 12, indicators 19, alignments 3, activities 62) |
| **Fonctionnalités S3B/S4 présentes ?** | Oui — `auth.py`, `alerts.py`, `pdf.py`, `imports.py`, `registers.py` tous présents et montés dans `server.py` |
| **Routes vérifiées présentes** | `/pilotage-directeur` ✅, `/decisions` ✅, `/risks` ✅, `/budget-consolide` ✅, `/admin-users` ✅ (la route est `/admin-users`, pas `/admin/users`), `/plan-action` ✅, `/kpi-cascade` ✅ |
| **Le preview était-il en retard sur S4 ?** | **Non.** Le preview servait déjà la base S4+2A validée. Aucune mise à niveau de branche nécessaire. |
| **Déploiement production** | **AUCUN.** Le preview (= environnement Emergent en cours d'exécution) reflète le code via hot-reload. |

---

## 1. Règles de redirection par rôle (landing pages)

Après login, chaque rôle est redirigé vers une homepage opérationnelle différente (`AuthContext.roleHome`, consommé par `HomeRedirect` sur `/` et par `Login.jsx`).

| Rôle | Landing | Mission de la page |
|---|---|---|
| `cabinet_reader` | `/pilotage-directeur` | Comprendre la situation en < 2 min ; décisions → alertes → échéances → risques → budget → avancement → note |
| `direction_editor` | `/plan-action` | « Mon portefeuille de direction » : activités de SA direction uniquement |
| `me_validator` | `/kpi-cascade` | Espace de validation M&E : données à fiabiliser en premier |
| `admin` | `/admin-users` | Administration des utilisateurs/rôles |

---

## 2. Différences de Sidebar par rôle (`Sidebar.jsx` → `data-testid="sidebar-nav-<role>"`)

| Groupe / item | cabinet_reader | direction_editor | me_validator | admin |
|---|:--:|:--:|:--:|:--:|
| **Pilotage** : Pilotage Directeur, Décisions, Alertes & Risques, Budget consolidé | ✅ | — | — | — |
| **Progression stratégique** : Progression intégrée, Synthèse plan d'action, Synthèse KPI | ✅ | — | — | — |
| **Ma Direction** : Mon portefeuille, Mises à jour requises, Activités en retard, Alertes, Mes indicateurs | — | ✅ | — | — |
| **Suivi & Validation** : Espace de validation, Revue plan d'action, Qualité des données, Historique d'audit | — | — | ✅ | — |
| **Administration** : Utilisateurs & rôles, Journal d'audit, Imports (dry-run) | — | — | — | ✅ |
| **Application** : Pilotage Directeur, Plan d'action, KPI en cascade | — | — | — | ✅ |
| **Référentiels** : PND 4.02, Politique EFTP, Stratégie digitale, Alignement | ✅ (4) | ✅ (3, sans Alignement) | ✅ (4) | ✅ (4) |
| Administration des utilisateurs exposée ? | ❌ | ❌ | ❌ | ✅ |

Les référentiels (PND/Politique/Digital/Alignement) ont été **rétrogradés en groupe secondaire « Référentiels »** : le pilotage opérationnel domine désormais la navigation.

---

## 3. Routes modifiées / ajoutées

- `/` → **`HomeRedirect`** (redirige selon le rôle ; remplace l'ancien rendu direct de l'Accueil).
- `/accueil` → **nouvelle** route pour l'Accueil intégré (auparavant sur `/`).
- `/audit-log` → **nouvelle** page Journal d'audit (RoleRoute `me_validator`/`admin`).
- Routes inchangées et fonctionnelles : `/pilotage-directeur`, `/decisions`, `/risks`, `/budget-consolide`, `/plan-action`, `/kpi-cascade`, `/admin-users` (admin), `/imports` (validateur/admin), référentiels, `/legacy-pnd`.
- `/plan-action?vue=updates|delayed|alerts` → vues filtrées du portefeuille (Direction Editor).

## Composants / pages modifiés

| Fichier | Changement |
|---|---|
| `context/AuthContext.js` | Ajout `ROLE_HOME` + `roleHome()` ; `login()` renvoie l'utilisateur |
| `App.js` | `HomeRedirect`, route `/accueil`, route `/audit-log` |
| `pages/Login.jsx` | Redirection post-login vers `roleHome(role)` |
| `components/Sidebar.jsx` | **Réécrit** : navigation par rôle (4 configs), groupe « Référentiels » secondaire |
| `components/Header.jsx` | **Réécrit** : suppression de la recherche globale et de la cloche de notifications ; ajout du rôle + direction ; titres `/accueil`, `/audit-log` |
| `pages/PlanAction.jsx` | Titre « Mon portefeuille de direction », filtre direction auto, stats portefeuille, `vue` (useSearchParams), masquage du filtre Direction pour l'éditeur |
| `pages/KpiCascade.jsx` | Espace de validation M&E (sections « à fiabiliser » en premier) pour `me_validator` |
| `pages/AuditLog.jsx` | **Nouvelle** page (lecture de `/api/metfpa/audit-log`) |
| `pages/CabinetView.jsx` | Libellé obsolète « Export PDF = Phase 2 » corrigé |
| `lib/format.js` | `fmtMilliards` + `fmtMillions` → format institutionnel FR « milliards FCFA » |
| `backend/metfpa/pdf.py` | `_fmt_m` → « X XXX,Y milliards FCFA » (suppression « Bn »/« Md ») |
| `backend/tests/_gen_import_fixtures.py` | **Nouveau** générateur reproductible des fixtures xlsx |

---

## 4. Corrections de formatage monétaire

- Avant : `1.20 Bn`, `2.94 Bn`, `33.6 Md` (ambigu).
- Après : **`1 202,1 milliards FCFA`**, **`293,8 milliards FCFA`**, **`5,6 milliards FCFA`** (séparateur d'espace, virgule décimale, plein mot « milliards »). Vérifié en direct sur `/budget-consolide` et le bloc Cabinet ⑤, **et dans le PDF** (`_fmt_m`).
- Les petits montants (< 1 milliard) → `X,Y M FCFA`. Les valeurs absentes restent **« manquant »** (jamais 0).

## 5. Éléments UI génériques retirés / masqués

- **Recherche globale** (input `global-search-input`) : retirée du Header.
- **Cloche de notifications** (`notifications-trigger`, badge, dropdown) : retirée (supprime aussi l'appel legacy `/api/notifications` et le bruit console associé).
- Conservés et fonctionnels : menu utilisateur, déconnexion, bouton Mode présentation, rôle + direction affichés.

---

## 6. Parcours de présentation Cabinet (fiable)

1. Login `cabinet@metfpa.ci` / `Metfpa@2026Demo` → redirection automatique vers **`/pilotage-directeur`**.
2. La page commence par **① Décisions requises** (avant tout bloc KPI/graphe).
3. Ouvrir une décision en attente → `/decisions`.
4. Voir une **alerte critique** (bloc « Alertes exécutives » + ② Alertes & blocages).
5. Voir une **échéance proche / activité bloquée** (③).
6. Voir l'**exposition aux risques** (④) → `/risks`.
7. Voir le **budget normalisé** (⑤, « milliards FCFA »).
8. **Exporter la note de Cabinet (PDF)** → bouton `export-pdf-btn` (HTTP 200, PDF avec filigrane provisoire).
9. Ouvrir la **synthèse de progression** → `/accueil`.
10. Ouvrir **PND 4.02** en référence → `/pnd-402`.

La présentation **ne commence pas** par la hiérarchie PND.

---

## 7. Intégrité des données (inchangée)

- Suivi opérationnel = `demo_tracking` ; directions = `to_validate` ; cadres provisoires affichés comme tels ; **valeurs manquantes restent manquantes (jamais 0)** ; aucune donnée officielle inventée. Bandeau de démonstration unique et compact par page (plus de répétition sur chaque carte) — statut de démonstration **toujours visible**.

---

## 8. Captures d'écran (4 rôles + parcours Cabinet)

Les états ont été pilotés et capturés par l'agent de test automatisé (rapport `/app/test_reports/iteration_7.json`, captures `/tmp/role_{cabinet,direction,validator,admin}.png`). Limite environnementale : l'outil de capture interactif ne rend que la page **non authentifiée** ; les états authentifiés sont donc attestés par l'agent de test (pilotage navigateur réel, login inclus) plutôt que par captures statiques jointes. Chaque état est reproductible via le flux de login documenté (§ test_credentials).

| Rôle | État vérifié |
|---|---|
| Cabinet Reader | `/pilotage-directeur`, sidebar `sidebar-nav-cabinet_reader`, décisions avant KPI, export PDF OK, pas d'admin |
| Direction Editor | `/plan-action` « Mon portefeuille », **5 lignes DAF** (pas 62), `vue=delayed` + bannière, édition/sauvegarde OK |
| M&E Validator | `/kpi-cascade` espace de validation (listes « à fiabiliser » en tête), `/audit-log` accessible |
| Administrator | `/admin-users` (pas la homepage Cabinet), sidebar Administration distincte |

---

## 9. Résultats build & tests

- **Build frontend** : `Compiled successfully` (webpack).
- **Backend — suite canonique** : `metfpa_phase2a_test.py` + `metfpa_validation_test.py` → **54/54 PASS** (env chargé). Fixtures xlsx régénérées via `_gen_import_fixtures.py`.
- **Agent de test frontend** (`iteration_7.json`) : **100 %** — 4/4 landings, 4/4 sidebars, 3/3 RBAC négatifs, 7/7 pages de régression, PDF, format monétaire, édition portefeuille, audit, header nettoyé. `retest_needed: false`.
- **PDF export** : `GET /api/metfpa/cabinet/export/pdf` → 200 `application/pdf` (6722 octets).

### Suites pytest héritées (S3B/S4) — note
`metfpa_s3b_test.py` / `metfpa_s4_test.py` comportent des appels GET **sans token** écrits **avant** le verrouillage d'authentification de la Phase 2A-0 ; ils renvoient désormais 401 (10 échecs). Ils sont **supersédés** par `metfpa_phase2a_test.py` (qui encode le comportement post-2A-0) et **non liés** aux changements de ce sprint. À nettoyer ultérieurement.

---

## 10. Preview & production

- **URL preview** : https://etat-progression.preview.emergentagent.com
- **Commit déployé (preview)** : `60a8a19` · branche `phase1-s1-metfpa`.
- **Production** : **non touchée** — aucun déploiement, aucune variable d'environnement de production modifiée, aucune base de production utilisée (uniquement `metfpa_dev`).

---

## 11. Problèmes non résolus (mineurs, non bloquants)

1. **Lecture des registres Décisions/Risques non authentifiée** (`registers.py` GET publics) — écart de sécurité hérité, hors périmètre de ce sprint UI ; à corriger en Phase 2B.
2. **Backend legacy PND** (720 actions, seed `random.Random(2030)`) toujours monté dans `server.py` — dette héritée ; routes legacy authentifiées (401 sans token).
3. **Note du Directeur** persistée en `localStorage` (démo, non auditée).
4. **Suites pytest S3B/S4 héritées** obsolètes (401) — à supprimer/réécrire.
5. Items « Mises à jour requises / en retard / alertes » du Direction Editor partagent la route `/plan-action` (filtrée par `?vue=`) — comportement voulu, pas de page séparée.

---

## 12. Procédure de repli si le preview tombe pendant la présentation

1. **Vérifier l'état** : `curl -s {PREVIEW}/api/metfpa/health` doit renvoyer `{"db":"metfpa_dev",...}`. Si non →
2. **Redémarrer les services** : `sudo supervisorctl restart backend frontend` puis attendre ~10 s.
3. **Vérifier le login** : `curl -X POST {PREVIEW}/api/metfpa/auth/login -H 'Content-Type: application/json' -d '{"email":"cabinet@metfpa.ci","password":"Metfpa@2026Demo"}'` doit renvoyer un `access_token`.
4. **Si le frontend ne compile pas** : consulter `tail -n 50 /var/log/supervisor/frontend.*.log` ; en dernier recours, **revenir au commit stable `60a8a19`** via l'option **Rollback** de la plateforme (gratuite, sans perte).
5. **Comptes de secours** (tous mot de passe `Metfpa@2026Demo`) : `admin@metfpa.ci`, `validateur@metfpa.ci`, `direction.daf@metfpa.ci`, `cabinet@metfpa.ci`.
6. **Plan B démonstration** : si l'export PDF échoue, montrer l'échantillon pré-généré `/app/memory/samples/METFPA_Cabinet_Brief_SAMPLE.pdf`.
7. **Régénérer les fixtures de test** si besoin : `python /app/backend/tests/_gen_import_fixtures.py`.

---

## Critères d'acceptation finaux — statut

| # | Critère | Statut |
|---|---|:--:|
| 1 | Chaque rôle reçoit une homepage différente | ✅ |
| 2 | Chaque rôle reçoit une Sidebar différente | ✅ |
| 3 | Cabinet Reader atterrit sur Pilotage Directeur | ✅ |
| 4 | Direction Editor ne voit que son portefeuille (5 lignes DAF) | ✅ |
| 5 | M&E Validator voit les besoins de validation en premier | ✅ |
| 6 | Administrator atterrit sur l'administration des utilisateurs | ✅ |
| 7 | Les pages de référence sont secondaires | ✅ |
| 8 | Montants au format institutionnel français | ✅ |
| 9 | Données démo/provisoires toujours signalées | ✅ |
| 10 | Export PDF de la note de Cabinet fonctionne | ✅ |
| 11 | Le preview utilise la base de code S4 validée | ✅ (`60a8a19`) |
| 12 | Aucun déploiement / mutation production | ✅ |

**Sprint RÉUSSI — 12/12 critères satisfaits.**
