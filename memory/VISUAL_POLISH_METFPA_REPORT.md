# RAPPORT — Sprint de polissage visuel institutionnel · Cockpit METFPA

> Sprint **frontend uniquement**. Objectif : retirer l'aspect générique « AI/SaaS » et produire une interface institutionnelle, lisible et crédible pour un ministère de Côte d'Ivoire.
> **Aucune** modification backend, API, MongoDB, RBAC, rôles, calculs métier, routes, audit, statuts de validation ou classification des données démo.
> Date : 22/06/2026 · Langue UI : Français.

## Branche & commit
- Branche : `phase1-s1-metfpa`
- Commit (après sprint) : `2f8c4f1`
- Vérification : **testing_agent `iteration_8.json` → 100 % (12/12)**, `retest_needed: false`. Build frontend : `Compiled successfully`.

---

## 1. Identité officielle Côte d'Ivoire
- Asset officiel **`CIV.png`** intégré tel quel (sans redessin, recolorisation, recadrage ni filtre) → `frontend/public/CIV.png`.
- Composant **`InstitutionalBrand`** : armoiries dans un conteneur blanc neutre (48 px déplié / 40 px replié) + « Cockpit METFPA » + « Pilotage du secteur EFTP ».
- Placement : haut-gauche de la Sidebar (visible aussi en mode replié) et sur l'écran de connexion. Identité non répétée ailleurs.

## 2. Système de couleurs institutionnel
- Tokens CSS ajoutés dans `index.css` : `--ci-green-700/600/100`, `--ci-orange-600/100`, `--ci-gold-600/100`, `--ink-900/700/500`, `--surface`, `--surface-soft`, `--surface-warm`, `--border`, `--danger`, `--warning`, `--success`, `--info`.
- **Suppression du violet** comme couleur principale : `#6E40C9` → or institutionnel `#C89A2B` (Décisions/arbitrages dans `CabinetView`, `DecisionRegister`, `AuditLog`) ; axe digital `D3` → ardoise `#52667A` (`metfpaTheme.js`).
- Vert = primaire/validé ; orange = navigation active & actions ; or = accent discret ; rouge = critique uniquement ; ardoise = informatif.
- Vérifié : 0 occurrence de violet sur `/pilotage-directeur` et `/decisions`.

## 3. Sidebar repensée (collapsible)
- **`CollapsibleSidebar`** (`Sidebar.jsx`) + état hissé dans `Layout.jsx`.
- Déplié ~**280 px** / replié ~**76 px** (rail d'icônes, libellés masqués, logo conservé, infobulles via `title` + `aria-label`).
- **Persistance** `localStorage` (`metfpa_sidebar_collapsed`, `1`/`0`) — confirmée après rechargement.
- **Un seul item actif** garanti par détection personnalisée (`pathname` + `search`) → corrige le problème des « 4 boutons orange simultanés » du Direction Editor.
- Item actif : fond chaud léger + **bordure gauche orange** + texte renforcé ; inactifs neutres.
- Footer brand + utilisateur fixes ; zone de navigation défilante.
- Bascule : bouton `sidebar-toggle` (footer) + `header-sidebar-toggle` (header desktop).

## Mobile / tablette (< 1024 px)
- Sidebar en **drawer off-canvas** + overlay (`sidebar-overlay`) ; bouton `mobile-menu-button` dans le header ; **libellés complets** (pas le rail d'icônes) ; fermeture après navigation ; contenu principal pleine largeur. Détection via `matchMedia(max-width:1023px)`.

## 4. Clarté de navigation par rôle
Logique de rôle préservée, hiérarchie améliorée (groupe primaire + « Référentiels » secondaire) :
- **Cabinet** : Pilotage Directeur · Décisions · Alertes et risques · Budget consolidé · Note de Cabinet | Progression stratégique | Référentiels.
- **Direction** : Mon portefeuille · Mises à jour requises · Activités en retard · Alertes · Mes indicateurs | Référentiels.
- **Validateur** : Espace de validation · Revue du plan d'action · Qualité des données · Historique d'audit | Référentiels.
- **Admin** : Utilisateurs · Rôles et directions · Qualité des données · Journal d'audit | Application | Référentiels.

## 5–7. Layout, typographie, statuts
- Layout calme : surface principale unique, `max-w-[1560px]` fluide, padding horizontal cohérent, contenu qui s'élargit quand la sidebar est repliée.
- Hiérarchie typographique renforcée (titres 27 px / sections 16–18 px / corps 14–15 px) via `PageHeader` et `InstitutionalSection`.
- Composant **`DataStatusBanner`** + **`StatusBadge`** : libellés concis (`Donnée provisoire`, `Démonstration`, `À valider`, `Donnée manquante`), saturation réduite ; **rouge réservé au critique** ; ambre/neutre pour manquant/en attente/démo. Statut non-officiel toujours visible.

## 8. Espace de validation M&E (KpiCascade)
- Hero violet sombre **remplacé** par carte institutionnelle : fond blanc, **bordure supérieure verte** (`--ci-green-600`), texte sombre. Vérifié en runtime : `bg rgb(255,255,255)`, `border-top rgb(0,135,81)`, `text rgb(24,33,47)`.
- 4 compteurs simplifiés en cartes neutres (accents sémantiques discrets) ; blocs de priorité de validation **au-dessus** du tableau de référence complet.

## 9–10. Pages de référence & Portefeuille Direction
- PND/Politique/Digital : montants au format institutionnel FR « milliards FCFA » (déjà global via `fmtMilliards`/`fmtMillions`).
- **Migration complète des 4 pages référentiels** (PND 4.02, Politique EFTP, Stratégie digitale, Alignement) vers les composants partagés (`PageHeader`, `InstitutionalSection`, `MetricCard`, `DataStatusBanner`) + tokens institutionnels : aplatissement des « cards-in-cards » (objectifs digitaux en lignes indentées avec fine ligne d'accent), couleurs de cadre tokenisées (PND vert `#008751`, POL orange `#F47C20`, DIG bleu), un seul bandeau de statut par page, statut de validation discret. **Vérifié testing_agent `iteration_9.json` → 100% (6/6), 0 violet.**
- Portefeuille Direction : en-tête de tableau **collant**, colonne **Intitulé élargie** (≥ 320 px, titre complet + `title`, plus d'ellipse prématurée), séparateurs de lignes discrets ; édition/historique préservés ; valeurs manquantes restent manquantes.

## 11. Nettoyage du header
- Recherche globale **retirée** ; cloche de notifications **retirée** ; bouton « mode présentation » (décoratif) **retiré**. Conservés : titre, rôle/direction, menu utilisateur + déconnexion, bascule sidebar / menu mobile.

## 12. Composants partagés (nouveau `components/Institutional.jsx`)
`InstitutionalBrand`, `PageHeader`, `InstitutionalSection`, `StatusBadge`, `MetricCard`, `DataStatusBanner`, `CurrencyValue` — adossés aux tokens partagés (réduction des couleurs/espacements dupliqués).

---

## Fichiers modifiés / créés
- **Nouveaux** : `components/Institutional.jsx`, `public/CIV.png`.
- **Réécrits** : `components/Sidebar.jsx`, `components/Layout.jsx`, `components/Header.jsx`.
- **Édités** : `index.css` (tokens), `lib/metfpaTheme.js` (D3), `pages/KpiCascade.jsx` (hero+VWStat), `pages/CabinetView.jsx` & `pages/DecisionRegister.jsx` & `pages/AuditLog.jsx` (dé-violet), `pages/PlanAction.jsx` (table collante/large), `pages/Login.jsx` (logo officiel).

## Tokens introduits
Voir §2 (palette CI complète dans `:root` de `index.css`).

## Captures d'écran
- Connexion (logo officiel) : vérifiée visuellement (armoiries dans conteneur blanc, bandeau tricolore).
- 9 captures requises pilotées et enregistrées par l'agent de test (`/tmp/visual_polish/`) : sidebar Cabinet dépliée/repliée, sidebar Direction dépliée/repliée, espace de validation M&E, portefeuille Direction, PND 4.02, accueil intégré, drawer mobile. États attestés dans `iteration_8.json` (runtime).

## Résultats responsive & accessibilité
- Collapse + persistance OK ; largeur du contenu s'ajuste ; aucune page masquée sous la sidebar ; infobulles en mode replié OK ; drawer mobile OK (390×844).
- `aria-expanded` sur la bascule (true→false) ; `aria-label` FR ; noms accessibles des items repliés via `title` ; focus clavier atteint la navigation.

## Build
- `Compiled successfully` (webpack) ; testing_agent frontend **100 %** ; `retest_needed: false`.

## Confirmation backend & production
- **Backend non touché** (aucune modification API/DB/RBAC/calcul/route/audit). **Production non déployée** ; uniquement le preview en cours d'exécution reflète les changements.

## Préview
- URL : https://etat-progression.preview.emergentagent.com · commit `2f8c4f1`.
