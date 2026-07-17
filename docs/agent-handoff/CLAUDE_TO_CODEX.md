# Handoff Claude vers Codex — Revue UX/UI (structure à 3 rôles)

---

## ▶ ACTION DEMANDÉE À CODEX : MERGER LA BRANCHE

**La revue est close et toutes ses frictions réelles sont traitées. La branche est prête à être mergée.**

- **Branche à merger :** `codex/simplify-rbac-three-roles` (merger son **sommet**, quel qu'il soit — le présent document en fait partie)
- **Cible :** `main`
- **Nature du merge :** **fast-forward propre** — `main` est ancêtre de la branche, **aucun conflit attendu**
- **État de l'arbre :** rien de non commité, build de production vert, aucune erreur console

### Contenu de la branche (du plus ancien au plus récent, hors présent document)

| Commit | Objet |
|---|---|
| `316d0bc` | docs : revue UX/UI de la structure à 3 rôles |
| `5d85f84` | feat(rbac) : consolidation des accès en 3 rôles |
| `a1fab62` | feat(admin) : création d'utilisateur (F1) — endpoint, dialog **et correctif du 500** |
| `52ce2b9` | fix(ux) : frictions P1 de la revue (F3 à F7) |
| `293d66d` | fix(ux) : bandeau de fiabilité condensé, clôture de la revue (P2) |

### Commande de merge

```bash
git checkout main
git merge --ff-only codex/simplify-rbac-three-roles
git push origin main
```

### Vérifications déjà effectuées (inutile de les refaire)

- **F1 (création de compte)** : 19/19 contrôles sur instance réelle — création 201, gardes 409/422/400/403/401, le compte créé se connecte, ne voit que son agence, est refusé sur la Vue Directeur et l'admin, action auditée ; création vérifiée aussi via l'interface.
- **Suites existantes** : 6 tests unitaires + 47 d'intégration, toutes vertes.
- **Build production** : `Compiled successfully`.
- **Parcours des 3 rôles** : vérifiés dans le navigateur, zéro erreur console.

### ⚠ Point d'attention après le merge (déploiement)

Le correctif CORS (regex des Netlify deploy previews, commit `0e09dc2`) est **présent dans cette branche**. Aujourd'hui, le backend Emergent tourne avec la liste d'origines fixée par variable d'environnement : **`deploy-preview-3` fonctionne, mais tout nouveau numéro de preview cassera le login**. Pour rendre le correctif définitif, **redéployer le backend Emergent depuis `main` une fois le merge fait**. Ce redéploiement servira aussi les corrections UX de cette branche.

### Ce que ce merge ne contient pas

Aucune modification des rôles, permissions ou règles métier au-delà de la consolidation à 3 rôles déjà décidée. Aucun nouvel endpoint hors `POST /admin/users` et `GET /admin/directions` (F1). Aucune refonte graphique.

---

## Statut du document

- Émetteur : Claude (UX/UI uniquement) · Destinataire : Codex
- Objet : revue complète des parcours après simplification à **3 profils**
- Périmètre respecté : **aucune modification des rôles, permissions, règles métier ni du périmètre fonctionnel**. React et les composants existants conservés. Aucune refonte graphique.
- **Méthode : revue sur application réelle** (backend + frontend lancés, données de démo seedées, connexion successive avec les 3 comptes). Chaque constat ci-dessous a été observé, pas supposé. Les constats invalidés en cours de test sont signalés comme tels.

### Rôles réellement en place (vérifiés dans le code)
| Rôle technique | Libellé UI | Page d'entrée |
|---|---|---|
| `admin` | Administrateur système | `/admin-users` |
| `dircab` | DIRCAB / Cabinet décisionnel | `/pilotage-directeur` |
| `agency_director` | Direction d'agence | `/ma-direction` |

Migration cohérente : `App.js` (RoleRoute), `Sidebar.jsx` (ROUTE_ROLES) et `AdminUsers.jsx` sont alignés sur les 3 rôles. **Aucune incohérence de garde détectée.**

---

## 1. Audit UX/UI par rôle et par page

### Ce qui est déjà bon (à ne pas défaire)
La spec P0 précédente a été appliquée. Vérifié en conditions réelles :
- **Cockpit Directeur** : le bloc **« Verdict de la semaine »** existe et fonctionne (« 5 blocage(s) critique(s) nécessitent une action du Cabinet cette semaine » + exécution globale 46,9 % + 15 missions en retard). Les 9 sections sont dans le bon ordre : Blocages → Décisions semaine → Décisions mois → Directions à relancer → Ce qui avance → Prochaine réunion → Points à inscrire → Missions critiques → Exécution par axe PND.
- **Passage alerte → action opérationnel** : chaque blocage est un bouton qui ouvre le `MissionDrawer` avec le contexte complet.
- **`/ma-direction`** : onglets « Mes missions à mettre à jour (2) » / « Toutes mes missions (5) » — la saisie guidée est bien la vue par défaut, le tableau est rétrogradé. Actions explicitement libellées : **Mettre à jour · Déclarer un blocage · Demander un arbitrage**. Formulaire groupé en sections (Complétude · Avancement · Blocage/arbitrage), commentaire obligatoire, bouton **« Soumettre ma mise à jour »**.
- **Sémantique couleur** : `en_retard` est passé au rouge. Sidebar filtrée par rôle (aucun lien mort).

> Deux hypothèses ont été **infirmées** pendant la revue : le « verdict de la semaine » n'est pas absent, et les cartes de blocage sont bien cliquables. Elles ne figurent donc pas comme frictions.

### Parcours Administrateur — `/admin-users`
| Point examiné | Constat réel |
|---|---|
| Connexion → arrivée | ✅ `/admin-users` |
| **Création d'utilisateur** | ❌ **impossible** : aucun bouton, aucun endpoint (`POST /admin/users` n'existe pas) |
| Attribution des 3 rôles | ✅ liste correcte (Administrateur / DIRCAB / Direction d'agence) |
| **Rattachement d'une direction** | ⚠️ **champ texte libre** — 15 directions réelles existent (AGEFOP, CIDFOR, CPNTIC, DAF, DAIP, DEXC, DPSI, DRH, Dir. Apprentissage, Dir. Communication, Dir. Infrastructures, Dir. Pédagogie, FDFP, IPNETP, Cabinet), **une seule (DAF) est rattachée** |
| Activation / désactivation | ✅ bascule fonctionnelle, garde « dernier admin » |
| Matrice des permissions | ✅ 3 colonnes, 10 capacités, lisible |
| Outils qualité / import / audit | ✅ accessibles |
| **Séparation admin / métier** | ❌ le menu admin contient **21 entrées**, dont ~16 de pilotage métier ; l'administration arrive en position 17 à 21 |

### Parcours DIRCAB
| Page | Constat |
|---|---|
| `/pilotage-directeur` | ✅ contenu et ordre conformes · ⚠️ **page de 14,7 écrans de haut** |
| `/alertes-arbitrages` | ✅ regroupée par urgence (À traiter cette semaine / À anticiper / À surveiller / Données incomplètes) |
| `/decisions` | ✅ arbitrage réservé au DIRCAB (sélecteur visible pour lui seul) |
| `/vue-directions` | ✅ cartes + barres, « À relancer » trié en tête |
| `/suivi-hebdo`, `/ordre-du-jour` | ✅ logique 3 temps (Avant / Pendant / Après) |
| `/reporting` | ✅ PDF réel |
| `/plan-action`, `/alignement` | ✅ accessibles ; alignement en tableau (voir P2) |

### Parcours Direction d'agence — `/ma-direction`
| Point examiné | Constat |
|---|---|
| Missions à mettre à jour / retards / corrections | ✅ visibles en tête |
| Avancement / blocage / arbitrage / commentaire / livrable | ✅ tous présents dans le formulaire |
| Soumettre une mise à jour | ✅ « Soumettre ma mise à jour » |
| Historique | ✅ « Historique récent » |
| **Comprendre que l'accès est limité à son agence** | ❌ **aucune mention explicite** dans la page |
| Simplicité pour non-experts | ⚠️ formulaire de **3,3 écrans / 14 champs** |
| Effet « Excel brut » | ✅ écarté (vue par défaut en cartes) |

---

## 2. Cartographie des 3 parcours

```
ADMINISTRATEUR (équipe informatique)
  login → /admin-users
    ├─ Onglet Utilisateurs : rôle · direction · actif        [créer = IMPOSSIBLE ❌]
    ├─ Onglet Rôles et directions : matrice (lecture)
    └─ Outils : /imports · /audit-log
  ⚠️ rupture : ne peut pas embarquer les 14 autres agences → le modèle à 2 niveaux ne démarre pas

DIRCAB (décideur)
  login → /pilotage-directeur
    Verdict semaine → Blocages ─clic→ MissionDrawer ─→ Préparer une décision
                                                    └─→ Inscrire à la réunion
                                                    └─→ Copier la relance
    → /alertes-arbitrages → /decisions → /ordre-du-jour → /reporting (PDF)
  ✅ boucle constat → action complète

DIRECTION D'AGENCE (contributeur non expert)
  login → /ma-direction
    « À mettre à jour cette semaine » → [Mettre à jour] → formulaire guidé
                                      → [Déclarer un blocage]
                                      → [Demander un arbitrage]
      → Soumettre ma mise à jour → état « Soumis » → remonte au DIRCAB
  ⚠️ ne sait pas explicitement que son périmètre est limité à son agence
```

---

## 3. Points de friction classés

### P0 — bloquant
`[F1]` **Admin · `/admin-users` · Impossible de créer un compte utilisateur.** Aucun bouton ni endpoint. Conséquence concrète : **1 seule des 15 directions du ministère possède un accès** ; les 14 autres ne peuvent pas alimenter le dashboard, donc la boucle « directions alimentent → DIRCAB consolide » ne peut pas démarrer en réel. · **Dépendance backend : oui** (`POST /admin/users`) · Composant : `AdminUsers.jsx`.

### P1 — important
`[F2]` **Admin · Rattachement de direction en saisie libre.** Une faute de frappe (« DAF » vs « D.A.F ») rattache l'utilisateur à un périmètre vide, **sans aucun message** : l'agence se connecte et ne voit rien, sans comprendre pourquoi. Risque de mauvaise manipulation élevé. → Remplacer l'`<input>` par un **`<select>` alimenté par les directions réelles** (déjà disponibles via `/missions` ou `/directions-performance`) + option « — non rattaché — ». · Backend : non · `AdminUsers.jsx`.

`[F3]` **Admin · L'administration se mélange au pilotage métier.** 21 entrées de menu, l'administration reléguée en bas. Contraire à l'exigence « l'administration ne doit pas se mélanger au pilotage métier ». → Pour le rôle `admin`, **placer le groupe « Administration » en premier** et **replier les groupes métier** sous un séparateur « Consultation du pilotage (lecture) ». · Backend : non · `Sidebar.jsx` (`navConfig`).

`[F4]` **DIRCAB · `/pilotage-directeur` fait 14,7 écrans de haut.** Charge cognitive et lisibilité sur portable dégradées ; le Directeur doit scroller longuement pour un usage censé durer < 3 min. → **Limiter la page aux 4 premiers blocs** (Verdict · Blocages · Décisions semaine/mois · Directions à relancer) et déplacer Ce qui avance / Missions critiques / Exécution par axe PND derrière des **sections repliées** (`<details>`) ou un onglet « Contexte ». · Backend : non · `CabinetView.jsx`.

`[F5]` **Tous · Retard, blocage et arbitrage sont visuellement identiques (rouge).** `en_retard` **et** `en_attente_arbitrage` utilisent le même `#C93C37`, et un blocage s'affiche aussi en rouge. Le brief demande explicitement de les distinguer. → **Retard = rouge `#C93C37`** (échéance dépassée) · **Blocage = rouge + icône `Ban`/`OctagonAlert`** (obstacle) · **Arbitrage attendu = violet `#7C3AED`** — couleur **déjà utilisée** par l'app pour « À arbitrer » dans le registre des décisions : la réutiliser rend le système cohérent d'un seul coup. · Backend : non · `lib/operational.js` (`STATUS_COLORS.en_attente_arbitrage`), `StatusBadge.jsx`.

`[F6]` **Direction · Le périmètre limité n'est jamais énoncé.** → Ajouter sous le titre : **« Vous voyez et mettez à jour uniquement les missions de votre agence ({direction}). »** · Backend : non · `PlanAction.jsx`.

`[F7]` **Direction · Formulaire de 3,3 écrans / 14 champs** pour des utilisateurs non familiers des outils de gestion de projet. → **Divulgation progressive** : n'afficher d'emblée que *Statut · Avancement · Prochaine étape · Commentaire*. Replier « Blocage / arbitrage » (ouverture automatique si la case « Cette mission est bloquée » est cochée) et « Livrable ». · Backend : non · `PlanAction.jsx` (MissionDialog).

### P2 — amélioration
`[F8]` ~~Libellé de rôle collé à la direction~~ — **CONSTAT RETIRÉ (faux positif)**. Le `Header` utilise `flex flex-col` : le rôle et la direction sont sur **deux lignes empilées** et correctement stylés. Le « Direction d'agenceDAF » observé était un artefact de lecture DOM (`textContent` concatène les deux `<span>`). **Aucune correction à faire.**
`[F9]` Le `DemoBanner` occupait 3 lignes au-dessus du verdict. → **Corrigé** : ligne compacte (29 px), mention essentielle visible, disclosure complète dépliable — la mention de fiabilité n'est pas supprimée, seulement condensée.
`[F10]` ~~`/alignement` est un tableau à 10 colonnes~~ — **CONSTAT RETIRÉ (obsolète)**. La page groupe déjà par **axe PND** (`AxisGroup`) avec exécution agrégée, cartes de missions, ouverture du drawer et badge « Donnée incomplète ». Mon constat s'appuyait sur une version antérieure du fichier, non rouverte pendant la revue. **Rien à faire.**
`[F11]` ~~Libellés de statut techniques (`pending`, `draft`)~~ — **CONSTAT RETIRÉ (obsolète)**. `DecisionRegister` utilise `STATUS_LABEL` (Brouillon · En attente · Approuvée · Rejetée · Mise en œuvre · Clôturée) et aucun statut brut n'est rendu ailleurs. **Rien à faire.**

> **Note de méthode.** Trois constats de cette revue (F8, F10, F11) se sont révélés faux ou obsolètes à la vérification et ont été retirés plutôt que « corrigés ». Deux venaient d'une lecture DOM trompeuse, un d'un fichier lu avant sa réécriture. Toute recommandation de ce document doit être reconfrontée au code réel avant implémentation.

---

## 4. Recommandations de simplification (synthèse)
1. Cockpit : **4 blocs au-dessus de la ligne de flottaison**, le reste replié.
2. Menu admin : **administration d'abord**, métier ensuite et replié.
3. Formulaire direction : **4 champs visibles**, le reste progressif.
4. Une couleur = un sens (**violet = arbitrage**), jamais deux concepts sur le même rouge.
5. Direction : un rattachement **choisi dans une liste**, jamais saisi.

## 5. Wording proposé
- Direction : « Vous voyez et mettez à jour uniquement les missions de votre agence (**{direction}**). »
- Admin, champ direction : « Périmètre de l'agence » + aide « Détermine les missions que ce compte pourra voir et mettre à jour. »
- Admin, si création indisponible : « La création de comptes n'est pas encore disponible. Contactez l'équipe technique. » *(à retirer dès F1 livré)*
- Statuts : `En retard` · `Bloqué` · `En attente d'arbitrage` · `Achevé` · `En cours` · `Non démarré` · `Suspendu`
- Boutons Direction : `Mettre à jour` · `Déclarer un blocage` · `Demander un arbitrage` · `Soumettre ma mise à jour` *(déjà en place — conserver)*
- Boutons DIRCAB : `Préparer une décision` · `Inscrire à la réunion` · `Copier la relance` · `Arbitrer` *(déjà en place — conserver)*

## 6. Wireframes des pages prioritaires

### Cockpit Directeur (cible)
```
┌ Ce qui avance · Ce qui bloque · Ce qui doit être décidé ─── [Préparer la réunion] [Exporter]
├ ① VERDICT DE LA SEMAINE ▓ (1 phrase + 3 chiffres)      ← existe, à conserver
├ ② BLOCAGES NÉCESSITANT UN ARBITRAGE ▓ (cartes → drawer) ← existe
├ ③ DÉCISIONS   [cette semaine ▓] | [à anticiper ce mois]
├ ④ DIRECTIONS À RELANCER  (+ [Copier la relance])
│   ─────────── ligne de flottaison (≈ 4 écrans max) ───────────
├ ▸ Ce qui avance                    (replié)
├ ▸ Prochaine réunion & points à inscrire (replié)
└ ▸ Contexte : missions critiques · exécution par axe PND (replié)
```

### Ma Direction (cible)
```
┌ Ma Direction — DAF
│ « Vous voyez et mettez à jour uniquement les missions de votre agence (DAF). »   ← F6
├ ① Corrections demandées ▓ (si > 0)
├ ② [Mes missions à mettre à jour (2)] [Toutes mes missions (5)]   ← existe
│    carte : code · intitulé · statut · échéance · jauge complétude
│    [Mettre à jour] [Déclarer un blocage] [Demander un arbitrage]  ← existe
└ ③ Historique récent

Formulaire guidé (cible) :
  Avancement : Statut · Taux (%) · Prochaine étape        ← visible
  ▸ Blocage / arbitrage        (replié, s'ouvre si « bloquée » cochée)
  ▸ Livrable                   (replié)
  Commentaire de suivi *                                  ← visible
  [Annuler]                        [Soumettre ma mise à jour]
```

### Admin (cible)
```
Menu :  ADMINISTRATION  → Utilisateurs · Rôles et directions · Qualité des données · Journal d'audit
        ▸ Consultation du pilotage (lecture)  → (métier, replié)

/admin-users :
  [+ Nouvel utilisateur]  ← F1 (dès l'endpoint disponible)
  Email | Nom | Rôle (select 3) | Périmètre de l'agence (SELECT ← F2) | Actif
```

## 7. Couleurs, badges, tableaux, formulaires, états
- **Couleurs** : bleu foncé = structure · bleu `#1F6FEB` = en cours/info · orange `#D97706` = attention/échéance proche · **rouge `#C93C37` = retard & blocage** · **violet `#7C3AED` = arbitrage attendu** *(F5)* · vert `#16794A` = achevé/validé · gris `#667085` = secondaire.
- **Badges** : toujours **texte + couleur** (jamais la couleur seule) — `StatusBadge` le fait déjà, le généraliser.
- **Tableaux** : conserver la règle « cartes par défaut, tableau en onglet secondaire » (déjà appliquée sur `/ma-direction` et `/vue-directions`) ; l'étendre à `/alignement` (F10).
- **Formulaires** : divulgation progressive (F7) ; commentaire obligatoire conservé ; libellés d'action explicites.
- **États** : `EmptyState` existe et est utilisé — le conserver ; états erreur/chargement OK. À ajouter : **confirmation visible après soumission** côté Direction (la mission doit quitter « à mettre à jour » et afficher « Soumis »).

## 8. Changements précis à transmettre à Codex

**État au 16/07/2026 — F1 à F7 sont livrés et vérifiés sur instance réelle.** Il ne reste que des P2.

| Réf | Fichier | Changement | Backend | Prio | État |
|---|---|---|---|---|---|
| F1 | `AdminUsers.jsx` + `metfpa/auth.py` | Dialog « + Nouvel utilisateur » + `POST /admin/users` (+ correctif 500 : `insert_one(dict(user))`) | Oui | P0 | ✅ **fait** |
| F2 | `AdminUsers.jsx` | Périmètre via `<select>` alimenté par `GET /admin/directions` | Non | P1 | ✅ **fait** |
| F3 | `Sidebar.jsx` | Admin : Administration en premier, métier sous « Consultation du pilotage » | Non | P1 | ✅ **fait** |
| F4 | `CabinetView.jsx` | Blocs de contexte repliés → cockpit **14,7 → 7,3 écrans** | Non | P1 | ✅ **fait** |
| F5 | `lib/operational.js`, `StatusBadge.jsx` | Arbitrage en violet `#7C3AED` + icône `Gavel` ; retard rouge + `AlertCircle` ; blocage rouge + `Ban` | Non | P1 | ✅ **fait** |
| F6 | `PlanAction.jsx` | Phrase de périmètre pour l'agence | Non | P1 | ✅ **fait** |
| F7 | `PlanAction.jsx` | Sections repliables (ouverture auto si déjà renseignées) ; commentaire requis maintenu visible | Non | P1 | ✅ **fait** |
| F8 | — | Faux positif, retiré | — | — | ❌ sans objet |
| F9 | `DemoBanner.jsx` | Bandeau condensé en une ligne (29 px), disclosure dépliable | Non | P2 | ✅ **fait** |
| F10 | — | Déjà en place (groupement par axe PND) — constat obsolète retiré | — | — | ❌ sans objet |
| F11 | — | Déjà en place (`STATUS_LABEL` FR) — constat obsolète retiré | — | — | ❌ sans objet |

**Toutes les frictions réelles de cette revue sont traitées.** Il ne reste aucune action ouverte.

## 9. Besoin backend (unique)
**`POST /api/metfpa/admin/users`** — email unique (409 sinon), rôle ∈ {admin, dircab, agency_director}, `direction` obligatoire si `agency_director`, mot de passe initial, audité. **C'est le seul verrou qui empêche le dashboard de fonctionner en conditions réelles** : sans lui, seule l'agence DAF existe.

## 10. Ordre d'implémentation recommandé
1. **F5 + F8** (couleurs/badges) — 30 min, effet immédiat sur la lisibilité.
2. **F6 + F7** (parcours Direction) — le public le plus fragile.
3. **F4** (cockpit ≤ 4 blocs) — confort du Directeur.
4. **F3 + F2** (menu admin + select direction) — sécurise l'administration.
5. **F1** (création d'utilisateur, avec le backend) — débloque le déploiement réel.
6. **F9 → F11** (finitions).

---

### Note de coordination — revue close

Ce document a évolué : livré d'abord comme revue (11 frictions), il consigne désormais leur **traitement complet**. Les 8 frictions réelles sont corrigées et vérifiées sur instance réelle ; les 3 restantes (F8, F10, F11) étaient **fausses ou obsolètes** et ont été retirées plutôt que « corrigées ».

**Il ne reste aucune action UX ouverte.** La seule action attendue de Codex est le **merge de `codex/simplify-rbac-three-roles` vers `main`** (voir la section ▶ en tête de document), suivi d'un **redéploiement du backend Emergent** pour rendre le correctif CORS définitif.

Pistes ultérieures possibles, **non engagées et hors périmètre de cette revue** : relance partagée persistée côté serveur, compte rendu de réunion structuré par point, réintroduction éventuelle d'un accès en lecture seule (le rôle `cabinet_reader` a été retiré ; aucun des 3 profils actuels n'est purement consultatif).
