# Handoff Claude vers Codex

## Statut du document

- Émetteur : Claude (rôle UX/UI uniquement)
- Destinataire : Codex (implémentation React)
- Branche : `claude/dashboard-director-ux`, issue de `codex/dashboard-director-mvp`
- Objet : spécification UX/UI directement applicable au dashboard opérationnel existant
- Hors périmètre : backend, endpoints, modèle de données, permissions, tests, build. Aucun nom de champ n'est modifié. Aucun endpoint n'est supposé sans être listé en section « Besoins backend ».
- Méthode : recommandations fondées sur la lecture du code réel de la branche (`CabinetView.jsx`, `PlanAction.jsx`, `VueDirections.jsx`, `SuiviHebdo.jsx`, `OrdreDuJour.jsx`, `Reporting.jsx`, `Alignement.jsx`, `lib/operational.js`) et sur les endpoints du MVP décrits en §15 de `CODEX_TO_CLAUDE.md`.

Convention de lecture — chaque recommandation notée `[Rn]` précise : **Page · Rôle · Problème · Comportement attendu · Composant · Dépendance backend · Priorité (P0/P1/P2)**. P0 = bloquant pour l'usage Directeur, P1 = important, P2 = phase ultérieure.

---

## Décisions UX validées

Ces principes cadrent toutes les recommandations. Ils ne demandent aucune décision supplémentaire.

1. **La Vue Directeur répond à 3 questions, pas à 6 KPI.** L'écran s'organise autour de *Qu'est-ce qui avance ? / Qu'est-ce qui bloque ? / Quelles décisions cette semaine ?* Les compteurs sont un bandeau de contexte secondaire, pas le sujet principal.
2. **Priorité au blocage.** Quand l'attention est rare (Directeur pressé), le rouge « ce qui bloque / décisions » domine visuellement le vert « ce qui avance ». On ne présente jamais deux colonnes strictement équivalentes pour « avance » et « bloque ».
3. **Du constat à l'action sans changer de page.** Toute carte de mission, blocage ou décision ouvre un **panneau latéral (drawer) de contexte** réutilisable, depuis lequel on peut relancer, préparer une décision ou inscrire à la réunion. C'est le principal manque du MVP.
4. **L'Espace Direction est un outil de saisie, pas un tableur.** La direction voit d'abord « ce qu'elle doit mettre à jour cette semaine », puis saisit via un formulaire guidé. Le tableau à 13 colonnes actuel est rétrogradé au profit d'une liste orientée tâches.
5. **Un seul système de statuts, cohérent partout.** Les couleurs suivent une sémantique unique (voir *Composants et design system*). On corrige la seule incohérence de fond : `en_retard` doit être **rouge** (retard = critique), pas orange. L'orange est réservé à « attention / échéance proche / à mettre à jour ».
6. **Les données manquantes sont dites « manquantes ».** Jamais 0, jamais vide silencieux. `lib/operational.js` le fait déjà (`shortDate → "Manquante"`) ; on généralise le badge « Donnée incomplète ».
7. **Les fonctions locales (localStorage) sont étiquetées « démo · non partagé ».** Ordre du jour, relances, notes de réunion, statuts de liens et note libre : chaque zone concernée porte un marqueur visible tant que le backend partagé n'existe pas. (Le MVP a déjà persisté la réunion via `/weekly-meetings` — voir §15.2 — donc l'ordre du jour n'est plus « démo » ; les relances multi-directions, si ajoutées, le resteraient.)

---

## Architecture d'information

Organisation cible de la navigation, par rôle. On conserve la sidebar sombre existante et les routes actuelles ; on ne fait que regrouper et ordonner.

### DIRCAB / Coordination (rôles `dircab`, `coordination`)
Ordre exact :
1. **Pilotage** → Vue Directeur (`/pilotage-directeur`)
2. **Décider & suivre** → Alertes & arbitrages *(nouvelle vue, voir Wireframes)*, Décisions (`/decisions`), Suivi hebdomadaire (`/suivi-hebdo`), Ordre du jour (`/ordre-du-jour`), Reporting (`/reporting`)
3. **Consolidation** → Performance par direction (`/vue-directions`), Missions & actions (`/missions` via `/plan-action`), Budget (`/budget-consolide`), Déclinaison (`/declinaison`)
4. **Référentiels** → Alignement PND (`/alignement`), PND 4.02, Politique EFTP, Stratégie digitale, Risques (`/risks`)

### Direction / agence / entité (`direction_editor`)
1. **Mon espace** → Ma Direction (`/plan-action` en mode direction), Mes indicateurs (`/kpi-cascade`)
2. **Contexte** → Alignement PND (lecture), référentiels (lecture)

La direction ne voit **que** son périmètre. Aucune entrée « Vue Directeur / Performance des directions » dans sa sidebar.

### Validation M&E (`me_validator`)
1. **Validation** → File de validation (`/kpi-cascade`), Missions à valider *(vue filtrée)*
2. **Qualité** → Alertes qualité, Import (`/imports`), Audit (`/audit-log`)
3. **Contexte** → référentiels et alignement (lecture)

### Administrateur (`admin`)
Accès complet + **Administration** (`/admin-users`, rôles, directions). L'admin n'est pas la cible UX prioritaire ; sa navigation reste celle du DIRCAB augmentée du bloc Administration.

**Principe transverse :** toute entrée pointant vers une action indisponible pour le rôle est masquée (pas désactivée sans explication). Cf. règle §3 du handoff Codex.

---

## Parcours Directeur de cabinet

Objectif : comprendre la situation du ministère en moins de 3 minutes et déclencher les bonnes actions de la semaine.

**Parcours nominal (« du constat à la décision ») :**

1. Ouverture de `/pilotage-directeur`. Le Directeur lit, dans l'ordre : le **verdict de la semaine** (1 phrase + 3 chiffres saillants) → **ce qui bloque** → **décisions à prendre cette semaine** → **directions à relancer** → **prochaine réunion**.
2. Il clique un blocage → **drawer de contexte** (`MissionDrawer`) : direction, action, avancement, échéance, cause du blocage, décision attendue, risque/alerte liés, historique.
3. Depuis le drawer, une **barre d'actions** selon rôle : `Relancer la direction` · `Préparer une décision` · `Inscrire à la réunion` · `Demander une information`.
4. L'action choisie conserve un **responsable, une échéance et un statut de suivi**, et le sujet reste traçable (Décisions ou Ordre du jour).
5. Retour à la liste sans perte de contexte (le drawer se ferme, la position est conservée).

`[R1]` **Vue Directeur · dircab/coordination · Le MVP présente 6 KPI équivalents + deux colonnes « avance/bloque » symétriques, ce qui n'hiérarchise pas l'urgence · Réorganiser selon la hiérarchie visuelle ci-dessous (bloque > décisions > avance) · `CabinetView.jsx` · aucune · P0**

`[R2]` **Vue Directeur · dircab · Aucune carte n'est cliquable ; le Directeur ne peut pas ouvrir le contexte d'un blocage · Rendre chaque item de `MissionList`/`DecisionList` cliquable → ouverture du `MissionDrawer` · `CabinetView.jsx` + nouveau `MissionDrawer` · lecture `/missions/{id}` (déjà dispo) · P0**

`[R3]` **Vue Directeur · dircab · Le bloc « Points à inscrire à la prochaine réunion » demandé n'existe pas distinctement (fondu dans « proposed_agenda ») · Ajouter un bloc dédié listant `proposed_agenda` avec bouton « Inscrire »/« Tout inscrire » renvoyant à `/ordre-du-jour` pré-sélectionné · `CabinetView.jsx` · réutilise `/weekly-meetings` · P1**

`[R4]` **Vue Directeur · dircab · « Directions à relancer » n'est visible que dans le tableau de performance en bas de page · Le remonter en carte d'action haute, avec bouton « Relancer » par direction · `CabinetView.jsx` · relance partagée = besoin backend (voir section dédiée) ; sinon lien mailto/copie en P1 · P1**

---

## Parcours Direction / agence / entité

Objectif : qu'une direction peu technique comprenne en 30 secondes ce qu'elle doit renseigner, et le fasse sans se perdre dans un tableau large.

**Parcours nominal (« mettre à jour ma semaine ») :**

1. Ouverture de `/plan-action` (mode `direction_editor`). En haut : **« Ma direction en 1 coup d'œil »** — complétude (%), missions en retard, blocages déclarés, corrections demandées, échéances proches.
2. Bloc prioritaire **« À mettre à jour cette semaine »** (liste de cartes cliquables) : missions jamais mises à jour, en retard, bloquées, ou **retournées en correction**.
3. Clic sur une mission → **formulaire guidé** (le `MissionDialog` existant, réorganisé en 3 étapes visuelles : *Avancement · Livrable & échéance · Blocage & décision attendue*).
4. Champ **commentaire de suivi obligatoire** (déjà en place) ; le bouton indique explicitement l'effet : « Soumettre au suivi-évaluation ».
5. Après enregistrement : bannière de confirmation + passage visible à l'état **« Soumis »** (`submission_status`), et la mission quitte la liste « à mettre à jour ».

Parcours secondaires explicites (boutons libellés, pas d'icônes seules) : **Déclarer un blocage** · **Demander un arbitrage** (coche `needs_arbitration` déjà existante) · **Soumettre ma mise à jour**.

`[R5]` **Ma Direction · direction_editor · Le tableau à 13 colonnes en scroll horizontal est « Excel brut », contraire à l'orientation saisie guidée · Rétrograder le tableau en vue secondaire (onglet « Toutes mes missions ») et faire de la liste « À mettre à jour cette semaine » la vue par défaut · `PlanAction.jsx` · aucune · P0**

`[R6]` **Ma Direction · direction_editor · L'état « correction_demandee » n'est pas remonté visuellement alors que c'est l'action la plus urgente pour la direction · Ajouter en tête un encart « Corrections demandées » (rouge) filtrant `submission_status === "correction_demandee"`, avec le motif du validateur · `PlanAction.jsx` · le motif de correction doit être lisible → voir besoin backend · P0**

`[R7]` **Ma Direction · direction_editor · Le formulaire présente 15 champs à plat sans regroupement, décourageant pour un profil non technique · Regrouper le `MissionDialog` en 3 sections avec titres et aide courte ; ordre : Avancement → Livrable/Échéance → Blocage/Décision · `PlanAction.jsx` (MissionDialog) · aucune · P1**

`[R8]` **Ma Direction · direction_editor · La complétude par mission (`completeness_score`) n'est pas montrée à l'endroit de la saisie · Afficher une jauge de complétude par mission dans la carte et en tête de formulaire, avec liste des champs manquants · `PlanAction.jsx` · `completeness_score` déjà fourni · P1**

---

## Parcours Validation M&E

Objectif : une file de travail unique où chaque élément explique **pourquoi** il demande une revue.

1. Ouverture de `/kpi-cascade` (file existante). Chaque élément affiche un **motif de revue** explicite (« valeur manquante », « soumis, en attente », « écart avancement/exécution », « correction en cours »).
2. Actions par élément, libellées : **Valider · Commenter · Demander une correction · Rejeter**. `Demander une correction` exige un commentaire.
3. La correction demandée devient visible côté direction (cf. `[R6]`).
4. Le validateur suit ses retours jusqu'à validation finale (colonne/filtre « En attente de mon avis » vs « Retournées »).

`[R9]` **Validation M&E · me_validator · Uniformiser les actions de validation avec les libellés ci-dessus et le code couleur badges · `KpiCascade.jsx` · dépend de l'existant Phase 2 (déjà en place) · P1**

`[R10]` **Validation M&E · me_validator · Offrir une entrée « Missions à valider » (missions `submission_status === "soumis"`/`to_validate`) en complément des indicateurs · vue filtrée sur `/missions` · aucune (données déjà exposées) · P2**

---

## Wireframes et hiérarchie des écrans

Wireframes textuels. `▓` = zone forte (rouge/action), `░` = zone secondaire, `→drawer` = ouvre le panneau de contexte.

### 5. Vue Directeur (`/pilotage-directeur`) — hiérarchie exacte

```
┌─ En-tête ────────────────────────────────────────────────┐
│ Cockpit opérationnel                                      │
│ H1 : « Ce qui avance · Ce qui bloque · Ce qui doit être   │
│        décidé »                                           │
│ [Préparer la réunion]  [Exporter la note]                │
├─ ① VERDICT DE LA SEMAINE (bandeau) ──────────────────────┤
│ 1 phrase de synthèse générée des chiffres +              │
│ 3 chiffres saillants : Exécution globale · En retard ▓ · │
│ Blocages critiques ▓        (les 3 autres compteurs en   │
│ petit, ligne secondaire ░)                               │
├─ ② CE QUI BLOQUE ▓ (pleine largeur, priorité haute) ─────┤
│ Cartes cliquables →drawer : code · action · direction ·  │
│ cause du blocage · décision attendue · [Préparer décision]│
│ État vide : « Aucun blocage signalé cette semaine. »     │
├─ ③ DÉCISIONS ────────────────────────────────────────────┤
│ 2 colonnes : « À prendre cette semaine » ▓ |             │
│              « À anticiper ce mois » (orange)            │
│ chaque décision →drawer, échéance + statut               │
├─ ④ DIRECTIONS À RELANCER (carte d'action) ───────────────┤
│ liste directions stale + [Relancer] par ligne            │
├─ ⑤ CE QUI AVANCE ░ (secondaire, replié possible) ────────┤
│ Top missions prioritaires + progression                  │
├─ ⑥ PROCHAINE RÉUNION + points à inscrire ────────────────┤
│ date · points proposés · [Inscrire] / [Tout inscrire]    │
├─ ⑦ Contexte (bas de page, ░) ────────────────────────────┤
│ Performance par direction (résumé) · Exécution par axe   │
└──────────────────────────────────────────────────────────┘
```
Règle : ①②③④ constituent les « 3 minutes » ; ⑤⑥⑦ sont le contexte approfondi.

### 6. Espace Ma Direction (`/plan-action`, `direction_editor`) — hiérarchie exacte

```
┌─ En-tête : « Mon espace Direction — {direction} » ───────┐
├─ ① MA DIRECTION EN 1 COUP D'ŒIL ─────────────────────────┤
│ Complétude ▓ · En retard ▓ · Blocages ▓ · Corrections    │
│ demandées ▓ · Échéances proches (orange)                 │
├─ ② CORRECTIONS DEMANDÉES ▓ (si > 0, sinon masqué) ───────┤
│ cartes : mission · motif du validateur · [Corriger]      │
├─ ③ À METTRE À JOUR CETTE SEMAINE (vue par défaut) ───────┤
│ liste de cartes cliquables → formulaire guidé            │
│ (jamais mises à jour, en retard, bloquées)               │
│ chaque carte : statut · échéance · jauge complétude      │
├─ ④ Onglets : [À mettre à jour] [Toutes mes missions] ────┤
│ « Toutes mes missions » = tableau condensé (secondaire)  │
├─ ⑤ Historique récent de mes soumissions ░ ───────────────┤
└──────────────────────────────────────────────────────────┘

Formulaire guidé (drawer/dialog) — 3 sections :
  A. Avancement   : statut, %, prochaine étape
  B. Livrable     : livrable attendu, lien, échéance
  C. Blocage/déc. : blocage, décision attendue, [x] arbitrage
  ↓ Commentaire de suivi * (obligatoire)
  [Annuler]              [Soumettre au suivi-évaluation]
```

### 7. Réunions hebdomadaires (`/suivi-hebdo` + `/ordre-du-jour`) — logique 3 temps

```
AVANT (/suivi-hebdo) :
┌─ Alertes critiques · Points proposés · Directions à relancer ┐
│ + « Décisions à préparer »                                   │
│ [Préparer l'ordre du jour →]                                 │
└──────────────────────────────────────────────────────────────┘

PENDANT (/ordre-du-jour) :
┌─ Points proposés (cases à cocher) → [Créer la réunion] ──────┐
│ Par point retenu : contexte · blocage · décision attendue ·  │
│ [Désigner responsable] [Fixer délai] [Transformer en décision]│
└──────────────────────────────────────────────────────────────┘

APRÈS (/ordre-du-jour, section basse) :
┌─ Compte rendu ──────────────────────────────────────────────┐
│ Décisions prises · Relances émises ·                        │
│ Décisions non exécutées ▓ · Points reportés (→ semaine +1)  │
└──────────────────────────────────────────────────────────────┘
```

### 8. Alertes / Arbitrages (vue à consolider)

Les alertes existent via `/alerts` mais sont noyées dans `/suivi-hebdo`. Cible : une **vue hiérarchisée par gravité et par type**, groupée, chaque alerte ouvrant le drawer.

```
┌─ En-tête : « Alertes & arbitrages » + compteurs par gravité ┐
├─ CRITIQUE ▓ ────────────────────────────────────────────────┤
│ groupé par type : Blocage critique · Décision non exécutée · │
│ Livrable échu · Mission en retard                            │
│ chaque ligne →drawer + action principale                    │
├─ ATTENTION (orange) ────────────────────────────────────────┤
│ Échéance proche · Direction sans mise à jour · Arbitrage att.│
├─ DONNÉES INCOMPLÈTES (gris) ────────────────────────────────┤
│ Mission sans responsable · sans échéance                    │
└──────────────────────────────────────────────────────────────┘
```
Types d'alertes à couvrir (tous déjà calculables côté serveur d'après §15.4) : mission en retard, blocage critique, décision non exécutée, livrable échu, direction sans mise à jour, mission sans responsable, mission sans échéance, arbitrage attendu.

### 9. Vue Directions (`/vue-directions`) — hiérarchie

```
┌─ En-tête + rappel « À relancer après 14 j sans mise à jour »┐
├─ Tri par défaut : directions « À relancer » en tête ▓ ──────┤
├─ Par direction (carte OU ligne enrichie, pas 12 colonnes) ──┤
│ {Direction}          [À relancer ▓] / [À jour ✓]           │
│ Exécution ███████░░ 72 %   · Missions 14 · Retards 3 ▓     │
│ Complétude ████░ 60 %      · Blocages 2 ▓ · Décisions 1    │
│ Dernière MAJ : il y a 18 j ▓        [Relancer] [Détail →]  │
└──────────────────────────────────────────────────────────────┘
```
Réduire les 12 colonnes actuelles à l'essentiel visible ; le reste dans le détail/drawer. Barres de progression plutôt que pourcentages nus.

### 10. Alignement PND (`/alignement`) — recommandations

Le fil d'Ariane `PND → Axe → … → Direction` en tête est bon, à conserver. Problème : la table à 10 colonnes reste « théorique » et ne montre pas *quelles missions contribuent à quel axe*.

`[R11]` **Alignement · tous · La lecture est un tableau plat difficile à relier à la stratégie · Proposer une vue **groupée par Axe PND** (accordéons) : chaque axe affiche son taux d'exécution agrégé (déjà calculé dans `execution_by_pnd_axis` de `/director-dashboard`), le nombre de missions et de retards, puis déplie les missions rattachées · `Alignement.jsx` · réutilise `/pnd-alignment` + rollup axe déjà exposé · P1**

`[R12]` **Alignement · tous · Les filtres (7) sont utiles mais l'utilisateur ne sait pas « où ça coince » dans la chaîne · Colorer le statut du lien/mission par sémantique standard et afficher un badge « Donnée incomplète » quand `pnd_axis`/`budget_program`/`direction` manquent · `Alignement.jsx` · aucune · P2**

---

## Composants et design system

On réutilise l'existant (`lib/operational.js`, `Pill`, `Section`, `Breadcrumb`, `Dialog` shadcn, Lucide). On ajoute peu.

### À créer

- **`MissionDrawer`** (panneau latéral réutilisable) — le composant clé du produit. Props : `missionId`, `role`, `onAction`. Contenu : titre/statut/priorité · axe PND/objectif/programme · direction/responsable · avancement/échéance · dernier livrable · blocage & cause · décision attendue · risques/alertes liés · historique · barre d'actions filtrée par rôle. Alimenté par `/missions/{id}` (existant). Utilisé par Vue Directeur, Alertes, Vue Directions, Suivi hebdo.
- **`StatusBadge`** — enveloppe de `Pill` qui applique la sémantique couleur unique + une pastille de forme/texte (pas couleur seule, cf. accessibilité).
- **`ProgressBar`** — barre 0–100 % avec couleur sémantique (utilisée Vue Directions, cartes mission).
- **`EmptyState`** — composant standard : icône + titre + phrase. Toutes les listes l'utilisent (voir *Wording final*).
- **`MetricStrip`** — bandeau de chiffres saillants du haut de la Vue Directeur (2 chiffres forts + reste secondaire), remplace la grille de 6 KPI égaux.
- **`DemoTag`** — petit marqueur « démo · non partagé » réutilisable pour les zones localStorage restantes.

### À modifier

- **`lib/operational.js`** : aligner `STATUS_COLORS` sur la sémantique (voir *Règles de couleurs*) — seul vrai changement de tokens. `en_retard` → rouge ; conserver le reste.
- **`Section`**, **`Kpi`** (dans `CabinetView.jsx`) : accepter un état `tone` (`critical`/`warning`/`neutral`/`positive`) pour piloter la bordure et l'accent.

### À réutiliser tel quel
`Breadcrumb`, `DemoBanner`, `Dialog/DialogContent`, `Loader2`/états de chargement, `apiError`, `pct`, `shortDate`, `dateTime`, `statusLabel`.

---

## Wording final

Français, sobre, sans jargon ni anglicisme. Titres, filtres, actions, états.

### Titres & sections — Directeur
- « Ce qui avance · Ce qui bloque · Ce qui doit être décidé » (H1 Vue Directeur, déjà en place — à conserver)
- « Décisions à prendre cette semaine »
- « Décisions à anticiper ce mois »
- « Blocages nécessitant un arbitrage »
- « Directions à relancer »
- « Missions critiques »
- « Avancement par direction »
- « Prochaine réunion de suivi »
- « Points à inscrire à l'ordre du jour »
- « Alertes de la semaine »

### Titres & sections — Direction
- « Mes missions à mettre à jour »
- « Mes actions en retard »
- « Corrections demandées »
- « Ma direction en 1 coup d'œil »
- « Dernière mise à jour »
- « Livrable attendu »
- « Prochaine étape »
- « Données incomplètes »

### Actions (boutons)
- Directeur : `Préparer une décision` · `Inscrire à la réunion` · `Relancer la direction` · `Demander une information` · `Exporter la note`
- Direction : `Mettre à jour` · `Déclarer un blocage` · `Demander un arbitrage` · `Soumettre ma mise à jour` (remplace un « Enregistrer » ambigu)
- Validateur : `Valider` · `Commenter` · `Demander une correction` · `Rejeter`

### Microcopy d'aide (exemples)
- Formulaire direction, champ commentaire : « Décrivez en une phrase ce qui a changé cette semaine. »
- Bouton arbitrage : « Signale au Cabinet qu'une décision est nécessaire. »
- Zone démo : « Donnée de démonstration — non partagée avec les autres comptes. »

### À proscrire
jargon technique, anglicismes (« dashboard », « owner », « deadline » dans l'UI visible), pages trop longues sans repères, graphiques décoratifs, tableaux sans hiérarchie, murs de texte.

---

## Règles de couleurs, badges et statuts

### Palette sémantique (source unique de vérité)

| Rôle sémantique | Couleur | Hex (aligné sur l'existant) | Emploi |
|---|---|---|---|
| Structure institutionnelle | Bleu foncé | `--ink-900` / `#18212F` | sidebar, titres, structure |
| Information / en cours / suivi normal | Bleu | `#1F6FEB` | statut « en cours », liens |
| Attention / échéance proche / à mettre à jour | Orange | `#D97706` | échéance proche, mise à jour attendue |
| Critique / retard / blocage / décision non exécutée | Rouge | `#C93C37` | **en_retard**, blocage, alerte critique |
| Achevé / conforme / validé | Vert | `#16794A` | statut « achevé », validé |
| Donnée secondaire / non démarré / brouillon | Gris | `#667085` | non démarré, suspendu, méta |

**Changement à appliquer :** dans `lib/operational.js`, `STATUS_COLORS.en_retard` passe de `#D97706` (orange) à `#C93C37` (rouge). L'orange reste pour « échéance proche » (état calculé, pas un statut stocké) et « mise à jour attendue ». Cela résout la seule ambiguïté rouge/orange du MVP.

### Correspondance statut opérationnel → couleur

| `status` (backend, inchangé) | Libellé FR | Couleur |
|---|---|---|
| `acheve` | Achevé | Vert |
| `en_cours` | En cours | Bleu |
| `en_retard` | En retard | **Rouge** |
| `en_attente_arbitrage` | En attente d'arbitrage | Rouge |
| `suspendu` | Suspendu | Gris |
| `non_demarre` | Non démarré | Gris |

### Badges spécifiques (texte + couleur, jamais couleur seule)

| Badge | Couleur | Déclencheur |
|---|---|---|
| À relancer | Rouge | direction sans MAJ > 14 j (`needs_follow_up`) |
| Arbitrage requis | Rouge | `needs_arbitration` |
| Donnée incomplète | Gris | responsable/échéance/axe manquant |
| Mise à jour requise | Orange | `submission_status` ≠ `soumis` ou MAJ ancienne |
| Soumis au suivi-évaluation | Bleu | `submission_status === "soumis"` |
| Correction demandée | Rouge | `submission_status === "correction_demandee"` |
| Validé | Vert | `submission_status === "valide"` / `validation_status === "valide"` |

Règle badges de fiabilité (à garder visibles, cf. handoff §3) : Officiel · Validé · Provisoire · Démonstration · Manquant.

---

## États vides, erreur, chargement

À concevoir pour **chaque** liste (le MVP a des états texte italique minimalistes ; on standardise via `EmptyState`).

### États vides — Vue Directeur
- Aucune alerte active : « Aucune alerte cette semaine. Le pilotage est à jour. »
- Aucune décision attendue : « Aucune décision à prendre cette semaine. »
- Aucune direction à relancer : « Toutes les directions ont mis à jour leur périmètre. »
- Aucune mission critique : « Aucune mission critique en ce moment. »
- Aucune réunion planifiée : « Aucune réunion planifiée. [Planifier une réunion] »

### États vides — Ma Direction
- Aucune mission affectée : « Aucune mission n'est encore rattachée à votre direction. Contactez la coordination. »
- Aucune action en retard : « Aucune action en retard. »
- Aucun blocage déclaré : « Aucun blocage déclaré. »
- Aucune décision attendue : « Aucune décision demandée au Cabinet. »
- Données non mises à jour : « Vous n'avez pas encore mis à jour vos missions cette semaine. [Commencer] »
- Accès non rattaché à une direction : « Votre compte n'est rattaché à aucune direction. Contactez l'administrateur. »

### États d'erreur (tous écrans)
- Chargement impossible : « Impossible de charger les données. [Réessayer] » (le MVP le fait déjà via `apiError` + `ErrorState`, à généraliser).
- Données incomplètes : bandeau « Certaines données sont manquantes et affichées comme telles. »
- Accès refusé (403) : « Vous n'avez pas accès à cette section. » (ne pas laisser une page blanche)
- Direction non configurée : « Aucune direction n'est configurée pour ce compte. »
- Mise à jour non enregistrée : toast rouge « Votre mise à jour n'a pas été enregistrée. Réessayez. »
- Conflit de validation (409) : « Cet élément a été modifié entre-temps. Rechargez avant de continuer. »
- Session expirée (401) : redirection login + message « Votre session a expiré, reconnectez-vous. » (déjà géré par l'intercepteur axios existant — à confirmer côté message).

### État chargement
Squelettes (skeleton) plutôt que spinner centré isolé pour les listes principales (Vue Directeur, Ma Direction), afin de préserver la structure perçue. Spinner acceptable pour les vues secondaires.

---

## Responsive et accessibilité

- **Desktop (cible principale)** : la Vue Directeur tient en 1 écran jusqu'au bloc ④ sans scroll sur 1440×900. Blocs ⑤⑥⑦ sous la ligne de flottaison.
- **Tablette** : grilles 3 colonnes → 2 ; le `MissionDrawer` prend 60 % de largeur ; les tableaux passent en cartes empilées dès `md`.
- **Mobile** : sidebar en drawer (déjà en place) ; toutes les tables « missions » et « directions » basculent en **cartes** (une carte = une mission/direction, champs empilés label→valeur) ; le formulaire direction en plein écran, sections repliables ; barre d'actions collante en bas.
- **Accessibilité** :
  - jamais la couleur seule → toujours texte/icône sur les badges et statuts (d'où `StatusBadge`).
  - contrastes AA sur texte (le gris `#667085` sur blanc passe AA en 14 px bold ; à vérifier pour le texte fin).
  - toutes les actions icône-seule reçoivent un `aria-label` (le MVP le fait partiellement — à généraliser).
  - focus visible sur cartes cliquables et items de drawer ; navigation clavier du drawer (Esc ferme, focus trap).
  - cibles tactiles ≥ 40 px sur mobile.

---

## Changements frontend sans nouvel endpoint

Réalisables immédiatement par Codex avec les données déjà exposées.

| Réf | Écran | Changement | Priorité |
|---|---|---|---|
| R1 | Vue Directeur | Réordonner les blocs (bloque > décisions > relancer > avance > réunion > contexte) via `MetricStrip` + `Section tone` | P0 |
| R2 | Vue Directeur | `MissionDrawer` ouvrable depuis chaque item (data via `/missions/{id}`) | P0 |
| R5 | Ma Direction | Vue « À mettre à jour cette semaine » par défaut, tableau en onglet secondaire | P0 |
| R6 | Ma Direction | Encart « Corrections demandées » (filtre `submission_status`) | P0 (voir dépendance R6-back pour le motif) |
| R7 | Ma Direction | `MissionDialog` en 3 sections | P1 |
| R8 | Ma Direction | Jauge `completeness_score` par mission | P1 |
| R3 | Vue Directeur | Bloc « Points à inscrire » relié à `/ordre-du-jour` | P1 |
| R9 | Validation M&E | Libellés d'actions + motif de revue | P1 |
| R11 | Alignement | Vue groupée par axe (rollup déjà dans `/director-dashboard`) | P1 |
| — | Tous | `EmptyState` + états erreur standardisés | P1 |
| — | Tous | Sémantique couleur unifiée (`STATUS_COLORS.en_retard` → rouge) | P0 |
| — | Vue Directions | Cartes + barres de progression au lieu de 12 colonnes | P1 |
| — | Alertes | Vue hiérarchisée par gravité (données `/alerts`) | P1 |
| — | Mobile | Tables → cartes empilées | P2 |

---

## Besoins backend ou modèle de données

À transmettre par Codex à l'équipe backend. Aucune de ces recommandations n'est supposée déjà disponible.

| Réf | Besoin | Justification UX | Bloque quelle reco |
|---|---|---|---|
| B1 | **Motif de correction lisible** : exposer, sur une mission `correction_demandee`, le commentaire/motif du validateur (champ ou dernière entrée `mission_updates` de type correction). | La direction doit savoir *quoi* corriger, pas seulement *qu'il faut* corriger. | R6 |
| B2 | **Relance partagée** : endpoint pour créer/lister une relance rattachée à une direction (objet, échéance, statut, auteur), persistée côté serveur. Aujourd'hui `localStorage` uniquement. | « Relancer la direction » doit être vu par la direction et suivi jusqu'à clôture. | R4, Vue Directions |
| B3 | **Compte rendu & décisions de réunion** : sur `/weekly-meetings/{id}`, pouvoir enregistrer, par point, le responsable désigné, le délai, la décision prise et le report éventuel ; distinguer « décision non exécutée ». | Combler le temps « après réunion » du parcours C. | Wireframe §7 (APRÈS) |
| B4 | **Champ « échéance proche »/« livrable échu » calculé** : si non déjà présent dans `/alerts`, exposer la distinction échéance proche (orange) vs échue (rouge). | Alimente la sémantique couleur et la vue Alertes. | Wireframe §8 |
| B5 | **Motif de revue par élément de validation** : exposer pourquoi un élément est en file (valeur manquante, écart, soumis, correction). | Parcours D, `[R9]`. | R9 |
| B6 | *(P2)* Pièces jointes / justificatifs binaires, notifications, commentaires de réunion structurés : nécessitent un travail backend dédié — **non conçus ici**, listés pour mémoire conformément au handoff §15.6. | — | P2 |

> Tant que B1–B5 ne sont pas livrés, les recos correspondantes s'implémentent en mode dégradé **clairement étiqueté** (ex. R6 affiche « Correction demandée » sans le motif, avec mention « motif à venir »).

---

## Risques et questions bloquantes

1. **Incohérence couleur rouge/orange** : le MVP mappe `en_retard` en orange ; la cible produit dit rouge. Décision retenue : rouge. → À confirmer par le métier, mais c'est le défaut recommandé. (Impact : 1 ligne dans `operational.js`.)
2. **Charge du `MissionDrawer`** : c'est le composant pivot ; s'il n'est pas fait, R2/R4/Alertes/Vue Directions perdent leur valeur. À implémenter en premier.
3. **Fonctions localStorage résiduelles** : relances multi-directions et compte rendu de réunion ne peuvent être « vraies » sans B2/B3. Ne pas les présenter comme partagées avant. Risque de confusion en formation si non étiqueté.
4. **Rôle `coordination`** : introduit par Codex (§15.3) mais absent de la liste de rôles initiale ; l'IA d'information ci-dessus le traite comme un DIRCAB sans arbitrage final — **à confirmer** (peut-il arbitrer une décision ? le handoff dit oui pour relances/arbitrages, non pour validation M&E).
5. **Volume de directions** : la Vue Directions en cartes doit rester lisible au-delà de ~15 directions ; prévoir tri et repli.

---

## Critères d'acceptation

Vérifiables par Codex, sans ambiguïté.

**Vue Directeur**
- [ ] À l'ouverture, les 3 premiers blocs visibles répondent à « avance / bloque / décisions » ; « bloque » est visuellement dominant (bordure/accent rouge, pleine largeur).
- [ ] Cliquer un blocage ouvre le `MissionDrawer` avec direction, cause, décision attendue et au moins une action ; Esc le ferme.
- [ ] « Directions à relancer » est visible sans scroller jusqu'au tableau du bas.
- [ ] Chaque liste possède un état vide rédigé (pas d'espace blanc).

**Ma Direction**
- [ ] La vue par défaut est « À mettre à jour cette semaine » ; le tableau complet est un onglet secondaire.
- [ ] Si `submission_status === "correction_demandee"` existe, un encart rouge « Corrections demandées » apparaît en tête.
- [ ] Le formulaire est en 3 sections ; le commentaire de suivi reste obligatoire ; le bouton dit « Soumettre au suivi-évaluation ».
- [ ] Après soumission, la mission affiche « Soumis » et quitte la liste « à mettre à jour ».

**Système**
- [ ] `en_retard` s'affiche en rouge partout ; aucune information portée par la couleur seule (badge = texte + couleur).
- [ ] Toute action icône-seule a un `aria-label`.
- [ ] Sur mobile, les tables missions et directions s'affichent en cartes empilées.
- [ ] Aucune fonction non disponible n'est présentée comme active ; les zones localStorage portent le marqueur « démo · non partagé ».
- [ ] Aucun nom de champ backend n'a été modifié ; aucun endpoint non listé en §Besoins backend n'est appelé.

**Alignement / Directions / Alertes**
- [ ] Alignement propose une lecture groupée par axe PND avec taux d'exécution agrégé.
- [ ] Vue Directions trie les « À relancer » en tête et montre l'exécution en barre.
- [ ] Les alertes sont regroupées par gravité (critique / attention / incomplet).

---

## Ordre d'implémentation recommandé

Écran par écran, du plus structurant au plus secondaire.

1. **Design system (socle)** — `StatusBadge`, `ProgressBar`, `EmptyState`, sémantique couleur (`operational.js`), `MissionDrawer`. *(P0 — débloque tout le reste.)*
2. **Vue Directeur** — réorganisation hiérarchique + drawer + états vides. *(P0)*
3. **Ma Direction** — vue « à mettre à jour » par défaut + encart corrections + formulaire 3 sections. *(P0, avec B1 pour le motif de correction.)*
4. **Alertes & arbitrages** — vue hiérarchisée par gravité, réutilisant le drawer. *(P1)*
5. **Vue Directions** — cartes + barres + tri « à relancer ». *(P1)*
6. **Réunions (Suivi hebdo + Ordre du jour)** — compléter les 3 temps ; « après réunion » dépend de B3. *(P1)*
7. **Validation M&E** — libellés + motif de revue (B5). *(P1)*
8. **Alignement PND** — vue groupée par axe. *(P1)*
9. **Reporting & Décisions** — cohérence visuelle, badges, états. *(P2)*
10. **Responsive mobile complet** — bascule cartes, formulaire plein écran. *(P2)*

---

### Note de coordination
Ce fichier est la spécification UX/UI de référence. Aucune modification de code React n'accompagne cette livraison (hors le présent document), conformément au périmètre demandé. Codex signalera dans `CODEX_TO_CLAUDE.md` tout conflit entre ces recommandations et les contrats techniques, en priorité sur le changement de couleur `en_retard` (décision 1) et sur les besoins B1–B5.
