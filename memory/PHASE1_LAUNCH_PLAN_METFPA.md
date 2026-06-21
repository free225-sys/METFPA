# PHASE 1 — Plan de lancement : Cockpit METFPA « presentation-ready »
Date : 2026-06-19 · Statut amont : **NO-GO production** (plan seulement) · Base : Phase 0 validée
Contraintes fermes : pas de code de production ici · pas de seed aléatoire dans le design cible · aucune Direction officielle inventée · aucun budget engagé/exécuté par activité inventé · aucune donnée démo affichée comme officielle.

---

## 0. Objectif & principe directeur
Livrer un cockpit METFPA **démontrable** (vue intégrée 4.02 + 3 référentiels + Cabinet View + budget normalisé + registres risques/décisions), alimenté par le **seed provisoire** (`html_reference / pending_metfpa_validation`), avec **badges d'origine/validation visibles partout**. Refactor du cockpit PND générique — pas de réécriture.

**Règle budgétaire transverse (obligatoire sur chaque affichage de montant de cadre)** : afficher `framework · period · total · annual_average · budget_scope · source · validation_status`. Jamais de comparaison de totaux bruts sans normalisation par période.

---

## 1. Écrans à implémenter / refactoriser

| Écran cible | Origine | Type |
|---|---|---|
| Accueil — Vue intégrée | Dashboard | Refactor lourd |
| Vue PND 4.02 (effet→produit) | TreeView (moteur) | Refactor |
| Politique EFTP (axe→produit→action) | TreeView (moteur) | Refactor |
| Stratégie digitale (axe→OS→orientation + KPI/budget) | nouveau | Ajout |
| Plan d'action ministère (activités, édition) | ActionsTable | Refactor |
| Alignement PND⇄Politique⇄Action | nouveau | Ajout |
| KPI en cascade | nouveau | Ajout |
| Budget consolidé (normalisé) | Analytics | Refactor |
| **Pilotage Directeur (Cabinet View)** | Alerts + nouveau | Ajout (prioritaire) |
| Vue par Direction | Ministries | Renommer/refactor (`to_validate`) |
| Login | Login | Préserver + amorce RBAC |

**À retirer** : palette 6 piliers, donut générique, seed aléatoire.

---

## 2. Changements backend (FastAPI)
- Supprimer `seed_data()` aléatoire ; ajouter un **loader d'import** lisant `seed_metfpa.json` → collections.
- Nouveaux endpoints (lecture) : `/api/pnd`, `/api/politique`, `/api/digital`, `/api/indicators`, `/api/alignments`, `/api/budget/consolidated` (renvoie les champs normalisés), `/api/cabinet` (synthèse décisionnelle).
- Endpoints opérationnels (lecture/écriture, badge démo) : `/api/activities` (GET/PUT), `/api/risks`, `/api/decisions`, `/api/meetings`, `/api/director-notes`.
- Workflow seed : `/api/admin/validate` (promotion `html_reference→official_reference`, ajoute `validated_by/at/note`, journalise dans `audit_log`).
- Chaque réponse porte `data_origin` et `validation_status`. `TODAY` → date courante (option démo).
- `audit_log` écrit sur toute mutation.

## 3. Stratégie de migration MongoDB
- **Drop** `actions` (mock). **Create** : `pnd_nodes, pol_nodes, dig_nodes, dig_profile, indicators, alignments, activities, budget_lines, risks, decisions, meetings, director_notes, evidence, users, audit_log, import_log` (codes stables = clés métier ; index sur codes & liens).
- Migration idempotente : script `import_seed.py` (vide+recharge référentiels marqués `pending`, n'écrase pas les activités déjà éditées sauf `--reset`).
- Sauvegarde avant migration ; exécutable en local d'abord.

## 4. Stratégie d'import du seed
- Source unique Phase 1 = `seed_metfpa.json` (provisoire). Conversion → collections avec `data_origin=html_reference`, `validation_status=pending_metfpa_validation`, `source_document` renseigné.
- Activités (62) importées avec `data_origin=demo_tracking` ; directions `to_validate` ; `budget_engage`/`source_financement` = `missing` (non affichés comme officiels).
- Gabarit `IMPORT_METFPA.xlsx` (9 onglets) **spécifié** mais l'import Excel réel = Phase 2 (Phase 1 = import du JSON).

## 5. Refactor frontend (générique → METFPA)
- `format.js` : remplacer `PILLAR_COLOR` (6 piliers) par palette **axes** (AX1-3, D1-3) + helper `frameworkMeta`.
- Réutiliser : moteur TreeView (drill-down + panneau), tableaux, filtres, alertes, ProgressBar, StatusBadge.
- Sidebar : nouvelle navigation (11 entrées ci-dessus). Header : conserver notifications/recherche.
- Nouveau composant transverse **`<OriginBadge data_origin validation_status />`** + bandeau global « données de démonstration ».
- Composant **`<FrameworkBudget />`** affichant systématiquement framework/period/total/annual_average/scope/source/status.

## 6. Badges d'origine & validation
- `official_reference`→vert « Officiel » ; `html_reference`→gris « Référence (à valider) » ; `demo_tracking`→ambre « Démo » ; `to_validate`→ambre « À valider » ; `missing`→rayé « Donnée absente » ; `validated`→vert ✓.
- Bandeau permanent en tête de l'app tant que `validation_status≠validated`.

## 7. Cabinet View MVP (Pilotage Directeur)
Ordre imposé (V6) : **① Décisions requises → ② Alertes & blocages → ③ Échéances proches → PUIS graphes (④ arbitrage budgétaire)** → ⑤ risques → ⑥ note du Directeur. KPIs en bandeau (exécuté signalé démo). Export note PDF = bouton simulé Phase 1.

## 8. Accueil intégré MVP
Bandeau cadres avec horizon ; chaîne de résultats drill-down (PND→Politique→Digital + ancrages) ; KPIs globaux signalés ; budget par référentiel **annoté horizons** ; accès rapide aux 11 vues.

## 9. Budget consolidé MVP (normalisé)
Tableau + graphes avec sélecteur de mode : **(a) total · (b) moyenne annuelle · (c) recouvrement 2026-2030 · (d) par cadre source**. Annotation obligatoire « horizons différents… ». Financement État/Bailleur affiché pour Digital ; exécution par activité = démo signalée. `requires_client_validation` visible.

## 10. Registres Risques & Décisions MVP
- Risques : `code, activite_id, libelle, niveau, probabilité, impact, mesure, responsable, statut` (CRUD).
- Décisions/arbitrages : `sujet, decision(éditable), impact, statut, date, auteur` ; réunions ; notes. Alimentent la Cabinet View.

## 11. RBAC minimal (structure, non pleinement appliquée Phase 1)
- Rôles définis sur `users` : `Lecteur Cabinet | Saisie Direction | Validateur M&E | Admin`.
- Phase 1 : rôle stocké + affiché ; routes de **promotion seed** réservées Admin/Validateur (appliquées) ; le reste = structure prête, application complète en Phase 4.

## 12. Plan de test
- Backend (pytest/curl) : import seed → comptes (3 effets/15 produits/100 actions/12 KPI) ; endpoints renvoient `data_origin`/`validation_status` ; budget consolidé renvoie champs normalisés ; promotion seed met à jour statut + audit_log ; activité PUT journalisée.
- Frontend (testing_agent) : navigation 11 vues ; badges d'origine présents ; Cabinet View ordre Décisions→Alertes→Échéances→graphes ; budget : changement de mode normalisé ; bandeau démo visible ; aucune donnée `missing` affichée comme valeur.
- Acceptation : voir tableau §16.

## 13. Plan de rollback
- Branche dédiée ; tag avant migration. Sauvegarde Mongo (`mongodump`) avant `import_seed`. Rollback = restaurer dump + revenir au tag. Le cockpit PND générique reste récupérable (référence technique).

## 14. Script de démonstration client
1. Accueil : « du PND 4.02 au suivi opérationnel », bandeau horizons + démo.
2. Drill-down chaîne de résultats jusqu'à une action Politique.
3. Plan d'action : éditer un avancement (badge démo) → historique.
4. Alignement : montrer ① contribue à / ② rattachée à + ancrage digital 4.02.1.6/1.4.
5. Budget consolidé : basculer total → moyenne annuelle (écart 2,4×→1,2×).
6. **Cabinet View** : décisions requises en premier, alertes, échéances, arbitrage.
7. KPI cascade national→sectoriel→digital. Conclure sur la promotion seed après validation METFPA.

## 15. Exclus de la Phase 1 (hors périmètre)
Import Excel réel · export PDF/Excel/PPTX réel · application complète RBAC · gestion de preuves (upload) · liste officielle des Directions · budget engagé/source par activité · dark mode · multi-utilisateurs concurrents · authentification durcie (lockout/reset).

---

## 16. Découpage des tâches & critères d'acceptation

| Lot | Tâche | Critère d'acceptation |
|---|---|---|
| T1 | Loader `import_seed.py` + collections | Import idempotent ; comptes exacts ; statuts/origines posés |
| T2 | Endpoints référentiels + budget normalisé + cabinet | Réponses portent champs normalisés + origine/validation |
| T3 | Workflow promotion seed + audit_log | Promotion Admin → `validated` + entrée audit |
| T4 | Refactor format.js (axes) + OriginBadge + bandeau | Badges corrects partout ; plus de 6 piliers |
| T5 | Accueil intégré MVP | Cadres annotés horizon ; drill-down OK |
| T6 | Vues PND/Politique/Digital + Alignement + KPI cascade | Hiérarchies exactes ; ancrages affichés |
| T7 | Plan d'action (refactor ActionsTable) | Édition activité + badge démo + historique |
| T8 | Budget consolidé normalisé | 4 modes ; annotation horizons ; requires_client_validation |
| T9 | Risques & Décisions (CRUD) | Alimentent Cabinet View |
| T10 | **Cabinet View MVP** | Ordre Décisions→Alertes→Échéances→graphes (V6) |
| T11 | RBAC structure + garde promotion | Rôle stocké ; route promotion protégée |
| T12 | Tests backend + frontend | Plan §12 passé |

---

## 17. Ordre d'implémentation recommandé (sprints)
1. **S1 — Données** : T1, T2, T3 (socle + API + promotion).
2. **S2 — Refactor visuel** : T4, T5 (axes, badges, Accueil).
3. **S3 — Référentiels** : T6, T7 (PND/Pol/Digital/Alignement/KPI + Plan d'action).
4. **S4 — Décision** : T8, T9, **T10** (budget normalisé, registres, Cabinet View).
5. **S5 — Qualité** : T11, T12 (RBAC structure, tests, script démo).

---

## 18. Risques Phase 1 & mitigations
| Risque | Sévérité | Mitigation |
|---|---|---|
| Confusion démo vs officiel en démonstration | Élevée | Badges + bandeau permanents, libellés financiers signalés |
| Mauvaise lecture budgétaire (totaux) | Élevée | Mode normalisé par défaut + annotation horizons |
| Régression du refactor (6 piliers→axes) | Moyenne | Branche + tests + rollback dump |
| Directions/budget engagé attendus par le client | Moyenne | Affichés `to_validate`/`missing`, exclus §15 documentés |
| Périmètre Cabinet View qui gonfle | Moyenne | MVP strict, export PDF simulé |

**Go Phase 1** dès approbation de ce plan. Toute exécution reste conditionnée à la levée du NO-GO production par le METFPA.
