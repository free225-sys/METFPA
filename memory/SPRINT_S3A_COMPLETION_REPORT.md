# Sprint S3A — Rapport d'achèvement (METFPA · vues détaillées)
Date : 2026-06-21 · Branche : `phase1-s1-metfpa` · Base commit : `efad14a`
Statut production : **NO-GO maintenu** · Aucun déploiement · `metfpa_dev` uniquement · `test_database` legacy intact

---

## 1. Périmètre livré (S3A — sans Cabinet View)
6 vues détaillées alimentées exclusivement par `/api/metfpa` (DB isolée `metfpa_dev`), badges d'origine/validation partout, navigation déverrouillée. **Cabinet View / Registres risques / décisions / arbitrage budget = NON démarrés (S3B/S4).**

## 2. Fichiers créés / modifiés
**Créés**
- `frontend/src/components/HierTree.jsx` — arbre hiérarchique itératif (drill-down expand/collapse) ré-utilisé par PND & Politique.
- `frontend/src/pages/VuePND.jsx` — `/pnd-402`
- `frontend/src/pages/PolitiqueEFTP.jsx` — `/politique-eftp`
- `frontend/src/pages/StrategieDigitale.jsx` — `/strategie-digitale`
- `frontend/src/pages/PlanAction.jsx` — `/plan-action` (édition auditée)
- `frontend/src/pages/Alignement.jsx` — `/alignement`
- `frontend/src/pages/KpiCascade.jsx` — `/kpi-cascade`
- `frontend/src/components/Breadcrumb.jsx` (fin S2/S3A)

**Modifiés**
- `frontend/src/App.js` — 6 routes S3A ajoutées ; `/legacy-pnd` préservé.
- `frontend/src/components/Sidebar.jsx` — 7 entrées actives + 3 entrées « Décisionnel · à venir (S3B+) » verrouillées.

## 3. Routes & vues livrées
| Route | Vue | Endpoint(s) |
|---|---|---|
| `/pnd-402` | Vue PND 4.02 (Secteur→Effets→Produits) | `/pnd` |
| `/politique-eftp` | Politique EFTP (Axe→Produit→Action + rattachement PND) | `/politique` |
| `/strategie-digitale` | Stratégie digitale (axes D1-D3, objectifs, orientations, financement, profil annuel, priorités, indicateurs) | `/digital`, `/indicators` |
| `/plan-action` | Plan d'action (62 activités, filtres, édition auditée) | `/activities` GET, PUT `/activities/{id}` |
| `/alignement` | Alignement PND⇄Politique⇄Digital | `/alignments` |
| `/kpi-cascade` | KPI en cascade (19 indicateurs par niveau) | `/indicators` |

## 4. Comptes/hiérarchies vérifiés (depuis l'API)
- PND : 3 Effets · 15 Produits · ancrage digital **4.02.1.6** mis en évidence.
- Politique : 3 Axes · 27 Produits · 100 Actions clés · rattachement AX1→4.02.1 / AX2→4.02.2 / AX3→4.02.3.
- Digital : axes D1-D3, profil 2026-2031, financement **État 15% / Bailleurs 85%**, priorités P1-P4, ancrages PND 4.02.1.6 / Politique 1.4 · indicateurs digitaux (15).
- Activités : **62**, toutes `demo_tracking` ; directions `to_validate` ; `budget_engage`/`source_financement` = **missing** (affiché « engagé manquant »).
- Indicateurs : **19** groupés par niveau réel (National 2 · Politique 2 · Digital 15) ; `valeur_actuelle` nulle → **« manquante »** (jamais 0).

## 5. Règles de rendu des alignements
- 3 cartes (AX1/AX2/AX3) : PND Effet ⇄ Politique Axe (+ totaux, nb produits).
- Légende distinguant : **Rattachement de référence (à valider)** · **Ancrage digital explicite** (bloc bleu 4.02.1.6 / 1.4) · **Inféré = aucun généré automatiquement**.
- Aucune correspondance créée automatiquement ; statut de validation visible sur chaque carte.

## 6. Édition Plan d'action (auditée)
- Champs éditables : `avancement` (0–100, borné), `statut` (nomenclature : Non démarré · À l'heure · En cours · En retard · Bloqué · Achevé), `alerte`.
- PUT `/api/metfpa/activities/{id}` → réponse remplace la ligne ; toast succès (valeur + horodatage) ; persistance confirmée après rechargement.
- Mutation journalisée dans `audit_log` (vérifié via curl : avant/après/horodatage). Budgets/financement/directions **non éditables**.

## 7. Tests
- **Frontend testing_agent** : `iteration_3.json` → **14/14 flux critiques PASS (100%)**. Login, navigation 7 liens + 3 verrouillés, 6 vues, drill-down PND, filtres Plan d'action (En cours→24, reset→62), édition+persistance, KPI 19, alignements, `/legacy-pnd` intact.
- **Backend S1** : inchangé (8/8) ; endpoints `/api/metfpa` opérationnels.
- **Corrections post-test** appliquées : (a) `DialogDescription` ajouté (a11y Radix) ; (b) colonne « Engagé » du Plan d'action affiche explicitement **« engagé manquant »** (62 chips `missing-value` rendus) — renforce le critère « données financières manquantes affichées comme manquantes ».
- Build frontend : **webpack compiled successfully**.

## 8. Captures
Vérifiées en session : Accueil intégré, PND 4.02 (arbre), Politique EFTP (3/27/100 + rattachement), Stratégie digitale, Plan d'action (filtres + dialog édition + chips « engagé manquant »), Alignement, KPI cascade.

## 9. Navigation
- Sidebar : 7 liens S3A actifs ; 3 entrées S3B+ verrouillées (`cursor-not-allowed`).
- Breadcrumb sur chaque vue → retour Accueil intégré. **Aucun cul-de-sac.**
- `/legacy-pnd` recouvrable ; login legacy fonctionnel.

## 10. Points de données non résolus (inchangés, hors périmètre)
- Liste officielle des Directions (15) → `to_validate`.
- Budget engagé / source de financement par activité → `missing`.
- Périodicité / responsable des indicateurs → non fournis par la source (affichés non renseignés).
- Promotion seed `html_reference→official_reference` conditionnée à validation METFPA (route prête, non déclenchée).

## 11. Rollback
- Branche dédiée `phase1-s1-metfpa`. Retour app générique : `git checkout main`. Données isolées dans `metfpa_dev` (legacy `test_database` non touché). Tag/dump avant toute migration future.

## 12. Confirmation
✅ Aucun déploiement production · aucune donnée production modifiée · app legacy recouvrable.
✅ Aucune fonctionnalité S3B/S4 démarrée.

## 13. Recommandation Go/No-Go
**GO recommandé pour Sprint S3B (décisionnel)** : Cabinet View MVP (ordre Décisions→Alertes→Échéances→graphes), registres Risques & Décisions (CRUD), budget consolidé normalisé (4 modes) — sous réserve de votre revue. **NO-GO production maintenu** jusqu'aux validations METFPA (V1-V11).
