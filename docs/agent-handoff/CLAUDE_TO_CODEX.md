# Handoff Claude vers Codex — Revue UX/UI (structure à 3 rôles)

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
`[F8]` Libellé de rôle collé à la direction : **« Direction d'agenceDAF »** (séparateur manquant). → `Direction d'agence · DAF`. · `Header.jsx` / `Sidebar.jsx`.
`[F9]` Le `DemoBanner` occupe le haut de chaque page, au-dessus du verdict. → Le réduire à une ligne discrète ou le déplacer sous le premier bloc.
`[F10]` `/alignement` reste un tableau à 10 colonnes. → Regrouper par **Axe PND** (accordéons) avec taux d'exécution agrégé.
`[F11]` Sur le cockpit, les libellés de statut restent en minuscules techniques par endroits (`pending`, `draft`). → Utiliser les libellés FR partout.

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

| Réf | Fichier | Changement | Backend | Prio |
|---|---|---|---|---|
| F1 | `AdminUsers.jsx` + `metfpa/auth.py` | Bouton « + Nouvel utilisateur » + dialog (email, nom, rôle, périmètre, mot de passe initial) | **Oui — `POST /admin/users`** | **P0** |
| F2 | `AdminUsers.jsx` | Remplacer l'input direction par un `<select>` des directions réelles + « non rattaché » | Non | P1 |
| F3 | `Sidebar.jsx` | Rôle `admin` : groupe Administration en premier, métier replié sous « Consultation du pilotage » | Non | P1 |
| F4 | `CabinetView.jsx` | Replier Ce qui avance / Réunion / Missions critiques / Axe PND (≤ 4 blocs au-dessus de la flottaison) | Non | P1 |
| F5 | `lib/operational.js`, `StatusBadge.jsx` | `en_attente_arbitrage` → violet `#7C3AED` ; icône dédiée pour blocage | Non | P1 |
| F6 | `PlanAction.jsx` | Phrase de périmètre sous le titre | Non | P1 |
| F7 | `PlanAction.jsx` | Formulaire à divulgation progressive (4 champs visibles) | Non | P1 |
| F8 | `Header.jsx`/`Sidebar.jsx` | `Direction d'agence · DAF` (séparateur) | Non | P2 |
| F9 | `DemoBanner.jsx` | Bandeau réduit à une ligne | Non | P2 |
| F10 | `Alignement.jsx` | Regroupement par axe PND | Non | P2 |
| F11 | pages registres | Libellés FR au lieu des valeurs techniques | Non | P2 |

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

### Note de coordination
Aucun code React n'accompagne cette revue (hors le présent document) : les rôles, permissions et règles métier sont inchangés. Une grande partie de la spec P0 précédente est **déjà en place et validée en conditions réelles** — la présente revue ne demande donc pas de refaire l'existant, mais de traiter **11 frictions**, dont **une seule est bloquante (F1)** et **une seule requiert du backend (F1)**.
