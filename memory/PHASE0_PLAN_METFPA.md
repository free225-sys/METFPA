# Phase 0 — Plan d'implémentation : spécialisation Cockpit PND → Cockpit METFPA intégré
Date : 2026-06-19 · Base : React 19 + FastAPI + MongoDB existant (préserver & refactoriser)
Sources analysées : `Cockpit_METFPA_integre.html` (modèle de référence, rétro-conçu), Politique ETFPA 2026-2035 (.docx), Stratégie de digitalisation ETFP (.pdf)

> ⚠️ Aucune ligne d'UI/dev ne doit être écrite à ce stade. Ce document = cadrage, modèle de données, spec d'import, mapping écrans, risques, lotissement.

---

## 1. Fichiers sources requis (entrées officielles)

| Source | Rôle | Statut | Usage Phase 2 |
|---|---|---|---|
| `Cockpit_METFPA_integre.html` | **Référence de structure & valeurs** (objet `D` = PND/POL/DIG/KPIC/EX hardcodé) | Fourni | Extraire l'objet `D` comme jeu de données initial officiel |
| `POLITIQUE ETFPA_2026_2035.docx` | Source officielle Politique (axes→effets→produits→actions clés) | Fourni | Vérification/validation des libellés & budgets |
| `Stratégie digitalisation ETFP.pdf` | Source officielle Stratégie digitale (axes→OS→orientations, 12 KPI base/cible, budget annuel, financement État/Bailleur) | Fourni | Vérification/validation |
| À demander | Nomenclature budgétaire officielle (lignes planifié/engagé/exécuté + source financement par activité) | **Manquant** | Module budget multi-états |
| À demander | Liste officielle des **Directions** du METFPA + responsables | **Manquant** | Référentiel directions/owners |

**Action :** extraire l'objet JS `D` du HTML en JSON propre (script Node/Python) → c'est le **socle de données officielles initial**. Les couches `STORE.*` (localStorage) du HTML = données opérationnelles de démo à ne PAS importer.

---

## 2. Modèle de données cible (dictionnaire de données)

Structure validée d'après la rétro-conception du HTML. Trois référentiels + une couche opérationnelle + transverses.

### 2.1 Référentiel PND (collection `pnd_nodes`)
Hiérarchie : Pilier P4 → Secteur 4.02 → Effet (4.02.x) → Produit (4.02.x.x)
Champs : `code`, `niveau` (pilier|secteur|effet|produit), `parent_code`, `nom`, `resultat` (secteur), `budget_total`, `ancre_digital` (bool), `data_origin='officiel'`, `source_document`.

### 2.2 Référentiel Politique EFTP (collection `pol_nodes`)
Hiérarchie : Axe (AX1-3) → Produit (x.y) → Action clé (x.y.z)
Champs : `code`, `niveau` (axe|produit|action), `parent_code`, `nom`, `effet` (axe), `budget_total`, `pnd_effet` (lien d'alignement vers code PND), `data_origin`, `source_document`.

### 2.3 Référentiel Stratégie digitale (collection `dig_nodes`)
Hiérarchie : Axe (D1..) → Objectif spécifique (OS) → Orientation
Champs axe : `code`, `nom`, `budget_total`, `pct`, `etat`, `bailleur`, `pnd_ancre` (ex 4.02.1.6), `pol_ancre` (ex 1.4).
Objectif : `code` (OSx), `nom`, `orientations[]`.
Profil : `annuel` {2026..2031}, `financement` {etat, bailleur, etat_pct=15, bailleur_pct=85}, `priorites[]` {code, nb_actions, total, etat, bailleur}.

### 2.4 Activités ministérielles (collection `activities`) — couche opérationnelle (cœur M&E)
Hérite du `EX.activites` du HTML + champs M&E manquants à ajouter (audit Phase 1).
| Champ | Type | Origine HTML | Nouveau (M&E) |
|---|---|---|---|
| `id`, `intitule`, `code_action` | str | ✔ | |
| `direction` (Direction responsable) | str | ✔ | |
| `axe_pol`, `produit_pol`, `pnd_effet`, `strategie` | str (liens) | ✔ | |
| `budget_prevu`, `budget_engage`, `budget_execute` | num | partiel (prévu/exécuté) | + **engagé** |
| `source_financement` | enum (État/Bailleur/Mixte) | — | ✔ |
| `avancement` (physique %) | num | ✔ | |
| `statut` | enum (Non démarré/En cours/En retard/Bloqué/Achevé) | ✔ | |
| `echeance` (trimestre/date) | str | ✔ | |
| `baseline`, `cible`, `valeur_actuelle` | — | — | ✔ |
| `responsable` (owner nominatif) | str | — | ✔ |
| `niveau_risque` (Faible/Moyen/Élevé) | enum | — | ✔ |
| `decision_requise` (bool + texte) | — | — | ✔ |
| `frequence_reporting` | enum (Mensuel/Trimestriel) | — | ✔ |
| `source_verification` | str | — | ✔ |
| `evidence[]` (pièces jointes) | refs | — | ✔ |
| `alerte` (motif) | str | ✔ | |
| `derniere_maj`, `history[]`, `comments[]` | — | partiel | ✔ (réutiliser existant) |
| `data_origin` | enum | — | ✔ |

### 2.5 Indicateurs en cascade (collection `indicators`)
Champs : `code`, `niveau` (PND national|Politique|Stratégie digitale|Opérationnel), `libelle`, `unite`, `base`, `cible`, `valeur_actuelle`, `cible_annee`, `axe` (rattachement), `parent_id` (cascade), `linked_activity_ids[]`, `source` (src), `source_verification`, `frequence`, `responsable`, `data_origin`.
> Reprend `KPIC` (niveau/libelle/base/cible/src) + les 12 KPI `DIG.kpi` (n/base/cible/axe).

### 2.6 Alignement / crosswalk (collection `alignments`)
Reprend `EX.align`. Champs : `pol_axe`, `pol_axe_nom`, `pol_effet`, `pol_total`, `pnd_effet`, `pnd_effet_nom`, `pnd_total`, `nb_produits`, `dig_ancrage` (pnd_ancre/pol_ancre).
> + liens activité→(axe_pol, produit_pol, pnd_effet, strategie) déjà portés par `activities`.

### 2.7 Budget consolidé (collection `budget_lines`)
Champs : `referentiel` (PND|POL|DIG), `code_noeud`, `annee`, `planifie`, `engage`, `execute`, `source_financement` (État/Bailleur), `data_origin`.

### 2.8 Pilotage Directeur (transverses)
- `risks` : `code`, `activite_id`, `libelle`, `niveau`, `probabilite`, `impact`, `mesure`, `responsable`, `statut`.
- `decisions` (arbitrages) : `sujet`, `decision`, `impact`, `statut`, `date`, `auteur`. (reprend `EX.arbitrages`)
- `meetings` (réunions) : `date`, `objet`, `statut`. (reprend `EX.reunions`)
- `director_notes` : texte libre horodaté.

### 2.9 Socle institutionnel
- `users` : + `role` (Lecteur Cabinet | Saisie Direction | Validateur M&E | Admin), + `direction`.
- `audit_log` : `user`, `action`, `entite`, `entite_id`, `avant`, `apres`, `horodatage`.
- `evidence` : fichiers (object storage) liés à activité/indicateur.
- `imports` : journal d'import (fichier, date, lignes, erreurs, validé_par).

---

## 3. Spécification d'import (Excel multi-onglets)

Classeur `IMPORT_METFPA.xlsx` — un onglet par entité, validé avant insertion :
1. `PND_4.02` (effets/produits + ancre_digital)
2. `Politique_Axes` / `Politique_Produits_Actions`
3. `Digital_Axes_Objectifs` / `Digital_KPI` / `Digital_Budget_Annuel` / `Digital_Priorites`
4. `Plan_Action` (activités opérationnelles + liens + M&E)
5. `Indicateurs_Cascade`
6. `Alignement` (crosswalk)
7. `Budget_Lines` (planifié/engagé/exécuté/source)
8. `Directions` (référentiel)

Règles : mapping colonnes→champs, validation (codes existants, cohérence budgets référentiels, enums), rapport d'erreurs, `data_origin='officiel'` auto, traçabilité dans `imports`. **Données de référence verrouillées en lecture seule** ; seules les activités/indicateurs/décisions sont éditables ensuite.
> Bootstrap initial = extraction de l'objet `D` du HTML → premier import « officiel » (à faire valider par le METFPA avant pilote).

---

## 4. Changements de schéma DB (par rapport à l'existant)

| Existant | Décision | Détail |
|---|---|---|
| `actions` (720, mock générique 6 piliers) | **Vider + remplacer** | Devient `activities` (plan d'action METFPA réel) ; supprimer le seed aléatoire |
| `users` (4) | **Étendre** | + `role`, + `direction` |
| — | **Créer** | `pnd_nodes`, `pol_nodes`, `dig_nodes`, `indicators`, `alignments`, `budget_lines`, `risks`, `decisions`, `meetings`, `director_notes`, `evidence`, `audit_log`, `imports` |
| `pillar_code`/`pillar_name` (6 piliers) | **Re-sémantiser** | Périmètre = 1 pilier P4 / 1 secteur 4.02 ; la couleur « pilier » devient couleur « axe » (AX1-3 / D1..) |
| Seed `random.Random(2030)` | **Supprimer** | Remplacé par import officiel |
| `TODAY` figé 2026-06-15 | **Corriger** | Date courante (option démo) |

---

## 5. Écrans — préserver / ajouter / supprimer-renommer

### À PRÉSERVER (refactoriser, ne pas jeter)
- **Login** (auth JWT) → préservé, + RBAC.
- **Dashboard** → devient **« Accueil — Vue intégrée »** (synthèse 3 référentiels + KPIs globaux + budget par référentiel).
- **TreeView + panneau éditable + historique/commentaires** → moteur réutilisé pour les vues référentielles (drill-down + détail).
- **ActionsTable (CRUD inline, filtres, pagination)** → devient **« Plan d'action ministère »** (activités éditables : direction, axe_pol, produit_pol, pnd_effet, prévu/engagé/exécuté, statut, échéance, alerte).
- **Alerts (tableau sévérité/retard + filtres)** → alimente la **Vue Pilotage Directeur**.
- **Analytics** → devient **« Budget consolidé »** (par axe, profil annuel digital, financement État/Bailleur empilé, exécution par axe).

### À AJOUTER (nouvelles vues METFPA)
- **Vue PND national (4.02)** : effet→produit→budget, contribution EFTP au Pilier 4, ancrages digitaux ★.
- **Politique EFTP 2026-2035** : axes→produits→actions clés, rattachement PND, budget par axe.
- **Stratégie digitale 2026-2031** : axes→OS→orientations, 12 indicateurs base/cible 2030, budget annuel + financement, priorités.
- **Alignement PND ⇄ Politique ⇄ Action** : flux par axe + lecture croisée (① Contribue à / ② Rattachée à) + triple ancrage digital.
- **KPI en cascade** : national→sectoriel→opérationnel, saisie valeur actuelle vs cible.
- **Pilotage Directeur (Cabinet View)** : alertes/blocages, arbitrages (décisions éditables), réunions, échéances proches, notes du Directeur, décisions requises, arbitrage budgétaire.

### À RENOMMER / RE-SÉMANTISER
- **Ministries → « Vue par Direction »** (directions internes METFPA, pas ministères).
- **PillarBadge / palette 6 piliers → palette par Axe** (AX1-3 Politique, D1.. Digital).

### À SUPPRIMER
- Données mock 6 piliers nationaux + libellés génériques effets/produits.
- Donut « répartition par pilier » générique (remplacé par budget par référentiel/axe).

---

## 6. Risques

| Risque | Sévérité | Mitigation |
|---|---|---|
| Données officielles incomplètes (budgets engagé/source, directions) | Élevée | Demander les fichiers manquants avant Phase 2 ; bandeau « démo » entre-temps |
| Incohérence budgétaire entre PND / Politique / Digital | Élevée | Règle de validation à l'import + écran de réconciliation |
| Changement de périmètre (6 piliers → 1 secteur 4.02) casse l'UI colorée existante | Moyenne | Re-sémantiser la palette en axes ; refactor ciblé |
| Migration localStorage (HTML) → DB | Moyenne | Ne pas importer `STORE.*` ; repartir des données officielles |
| Fidélité des libellés vs docs officiels (.docx/.pdf) | Moyenne | Étape de validation METFPA avant pilote |
| RBAC rétro-ajouté sur routes existantes | Moyenne | Décorateur de rôle + tests d'autorisation |
| Secrets en clair (`.env`) | Élevée | Sortir secrets du repo dès Phase 0/1 |
| Charge de saisie M&E (champs nombreux) | Faible | Formulaires progressifs + imports en masse |

---

## 7. Lotissement précis des tâches (Phase 0 livrables)

**Lot A — Cadrage & nomenclature**
- A1. Valider périmètre : 1 pilier P4 → secteur 4.02 (confirmé).
- A2. Extraire l'objet `D` du HTML → `seed_metfpa.json` (PND/POL/DIG/KPIC/EX) pour relecture.
- A3. Récupérer les sources manquantes (budget multi-états, directions).

**Lot B — Dictionnaire de données**
- B1. Figer le schéma des 14 collections (section 2) + enums (statuts, rôles, sévérité, financement).
- B2. Définir les champs M&E obligatoires et `data_origin`/`source_document` partout.

**Lot C — Spécification d'import**
- C1. Définir le gabarit `IMPORT_METFPA.xlsx` (8 onglets, colonnes, règles de validation).
- C2. Définir les règles de cohérence budgétaire inter-référentiels.

**Lot D — Architecture & sécurité**
- D1. Spécifier les endpoints API par entité + matrice RBAC (4 rôles × CRUD).
- D2. Spécifier `audit_log` et la gestion des preuves (object storage).

**Lot E — Wireframe Cabinet View**
- E1. Maquette « Pilotage Directeur » : bandeau décisions requises, top retards/coûts/risques, arbitrages, échéances, note de synthèse exportable PDF.
- E2. Maquette « Accueil intégré » (synthèse < 2 min) + parcours stratégique→opérationnel.

**Livrables Phase 0 :** schéma DB validé · dictionnaire de données · gabarit d'import · matrice RBAC · `seed_metfpa.json` relu · wireframes Cabinet/Accueil. → Go/No-Go avant Phase 1.

---

## 8. Mapping de référence HTML → cible (traçabilité)

| Bloc HTML (objet `D`) | Collection cible | Vue cible |
|---|---|---|
| `PND.pilier/secteur/effets/produits` (+`ancre_digital`) | `pnd_nodes` | Vue PND 4.02 |
| `POL.axes/produits/actions` (+`pnd_effet`) | `pol_nodes` | Politique EFTP |
| `DIG.axes/objectifs/orientations/kpi/annuel/financement/priorites` | `dig_nodes` + `indicators` + `budget_lines` | Stratégie digitale |
| `KPIC` (niveau/libelle/base/cible/src) | `indicators` | KPI cascade |
| `EX.activites` | `activities` | Plan d'action |
| `EX.align` | `alignments` | Alignement |
| `EX.arbitrages` / `EX.reunions` / notes | `decisions` / `meetings` / `director_notes` | Pilotage Directeur |
| `STORE.*` (localStorage) | — (NE PAS importer) | remplacé par DB + RBAC |
