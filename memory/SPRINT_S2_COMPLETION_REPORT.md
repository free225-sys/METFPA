# Sprint S2 — Rapport d'achèvement (METFPA Frontend Refactor + Accueil intégré)
Date : 2026-06-21 · Branche : `phase1-s1-metfpa` · Commit : `0564463`
Statut production : **NO-GO maintenu** · Aucun déploiement effectué

---

## 1. Résumé du git diff (frontend, vs `main`)
```
 frontend/src/App.js                     |   4 ±   (route / → Accueil ; legacy → /legacy-pnd)
 frontend/src/components/DemoBanner.jsx  |  16 +   (nouveau)
 frontend/src/components/OriginBadge.jsx |  29 +   (nouveau : OriginBadge + MissingValue)
 frontend/src/components/Sidebar.jsx     |  60 ±   (refactor METFPA)
 frontend/src/components/Header.jsx      |   3 ±   (titres METFPA)
 frontend/src/lib/metfpaApi.js           |  13 +   (nouveau : client /api/metfpa)
 frontend/src/lib/metfpaTheme.js         |  31 +   (nouveau : couleurs axes + ORIGIN_META)
 frontend/src/pages/AccueilIntegre.jsx   | 179 +   (nouveau : Accueil intégré MVP)
```
`main` reste intacte (0 référence à AccueilIntegre). `frontend/.env` inchangé (REACT_APP_BACKEND_URL préservé).

## 2. Écrans / composants créés ou refactorisés
- **Créés** : `AccueilIntegre.jsx`, `OriginBadge.jsx` (+ `MissingValue`), `DemoBanner.jsx`, `metfpaApi.js`, `metfpaTheme.js`.
- **Refactorisés** : `Sidebar.jsx` (branding METFPA « Secteur 4.02 · EFTP », nav = Accueil intégré + modules S3+ verrouillés), `Header.jsx` (titres), `App.js` (route `/`).

## 3. Écrans masqués / déclassés
- Le **Dashboard générique 6 piliers** n'est plus l'entrée principale : déplacé sur `/legacy-pnd` (recouvrable), retiré de la navigation.
- Les autres vues legacy restent accessibles par URL mais ne sont plus dans le menu.

## 4. Endpoints consommés (`/api/metfpa`)
`/budget/consolidated`, `/cabinet`, `/pnd`, `/politique`, `/digital`. Aucune donnée frontend aléatoire/mock.

## 5. Description de l'Accueil intégré
- **Bandeau démo permanent** en tête (données provisoires + suivi démo + mention « aucun budget engagé/exécuté ni directions officielles validés »).
- **Hero** : « Du PND 4.02 au suivi opérationnel des directions ».
- **Budget par cadre — comparaison normalisée** : 3 cartes (PND vert / Politique orange / Digital bleu) affichant **framework, période, total, moyenne annuelle, scope, source, statut de validation** + `OriginBadge`. Bascule **Total / Moyenne par an**. **Avertissement horizons** visible. Chip **« donnée absente (missing) »** pour exécuté/engagé. Mention « requiert validation client ».
- **Chaîne de résultats** : PND P4→Secteur 4.02→3 Effets→15 Produits ; Politique 3 Axes→27 Produits→100 Actions clés ; Digital 3 Axes→9 Objectifs→24 Orientations→Ancrage 4.02.1.6/1.4. Couleurs par cadre + `OriginBadge`.
- **Suivi opérationnel** badgé **Démonstration** : 62 activités, 11 alertes, 4 bloquées, 7 en retard + notice `demo_tracking`.

## 6. Confirmations badges & états
- ✅ `OriginBadge` rend les 6 origines : `official_reference, html_reference, demo_tracking, computed, missing, to_validate` (+ `validated`, `pending_metfpa_validation`).
- ✅ Données démo visiblement marquées (badge « Démonstration » + notice).
- ✅ Champs manquants affichés via `<MissingValue>` (« donnée absente ») — jamais comme 0.
- ✅ Cartes budget : framework + période + total + moyenne annuelle + scope + source + statut.
- ✅ Avertissement horizons permanent sur la comparaison PND/Politique/Digital.

## 7. Build / tests
- Frontend : **webpack compiled successfully** (aucune erreur).
- E2E : connexion legacy → redirection Accueil intégré (sélecteur `framework-card-PND` présent), 3 cartes + chaîne + KPIs rendus (captures fournies).
- Backend S1 inchangé (toujours 8/8) ; endpoints `/api/metfpa` opérationnels.

## 8. Critères d'acceptation S2 — couverture
| # | Critère | Statut |
|---|---|---|
| 1 | L'expérience 6 piliers n'est plus la logique principale | ✅ (`/` = Accueil METFPA, legacy déplacé) |
| 2 | Accueil rendu depuis `/api/metfpa` (pas de mock front) | ✅ |
| 3 | Chaque bloc majeur a un badge origine/validation | ✅ |
| 4 | Données démo visiblement marquées | ✅ |
| 5 | Champs budget manquants marqués missing (pas 0) | ✅ |
| 6 | Cartes budget : framework/période/total/moyenne/scope/source/statut | ✅ |
| 7 | Avertissement horizons visible | ✅ |
| 8 | Aucune fonctionnalité S3 démarrée | ✅ (modules S3 verrouillés/non construits) |
| 9 | Build frontend passe | ✅ |
| 10 | Login legacy fonctionne | ✅ |
| 11 | Chemin production recouvrable | ✅ (`main` intacte, `/legacy-pnd`) |
| 12 | Rapport S2 livré avant S3 | ✅ (ce document) |

## 9. Risques / points non résolus
- Axes AX1-3 / D1-3 : palette définie (`metfpaTheme.js`) mais exploitée pleinement seulement en S3 (vues détaillées non construites).
- Directions (15) `to_validate` et budget engagé/source `missing` — inchangés (sources non fournies).
- Endpoints `/api/metfpa` sans RBAC appliqué (Phase 4).
- Accueil = MVP lecture seule ; édition/registres/Cabinet View détaillée = S3/S4.

## 10. Confirmation & recommandation
- ✅ **Aucun déploiement production. Aucune donnée production modifiée. App existante recouvrable** (`git checkout main`).
- **Recommandation : GO pour Sprint S3** (vues détaillées PND/Politique/Digital + Plan d'action + Alignement + KPI cascade + Cabinet View), sous réserve de votre revue. NO-GO production maintenu jusqu'aux validations V1-V7 + V10-V11.
