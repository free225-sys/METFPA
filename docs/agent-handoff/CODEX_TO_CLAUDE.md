# Handoff Codex vers Claude — Dashboard opérationnel METFPA

## Statut du document

- Émetteur : Codex
- Destinataires : Claude et son agent UX/UI
- Branche de référence : `codex/agent-handoff`
- Objet : cadrer le travail UX/UI à appliquer au dashboard existant
- Hors périmètre Claude : backend, endpoints, modèle de données, permissions, tests, build et Git d’implémentation

Ce fichier est le support de coordination versionné entre les agents. Claude doit restituer ses décisions et recommandations dans :

`docs/agent-handoff/CLAUDE_TO_CODEX.md`

## 1. Produit à concevoir

Le produit est un dashboard opérationnel destiné en priorité au Directeur de cabinet du Ministère de la Formation Professionnelle.

Il doit permettre de répondre immédiatement à trois questions :

1. Qu’est-ce qui avance ?
2. Qu’est-ce qui bloque ?
3. Quelles décisions doivent être prises cette semaine, ce mois ou lors de la prochaine réunion de suivi ?

Le dashboard relie les éléments suivants :

- missions du ministère ;
- axes et référentiels stratégiques ;
- actions et activités ;
- alignement PND et programmes budgétaires ;
- directions, agences et entités responsables ;
- livrables et échéances ;
- niveau d’avancement ;
- retards, blocages et alertes ;
- risques ;
- décisions attendues et décisions prises ;
- relances et points de réunion.

Le projet existe déjà. Il ne faut ni le redessiner comme un produit entièrement nouveau, ni proposer un benchmark ou une note stratégique. Le travail attendu de Claude est directement applicable par Codex dans les pages React existantes.

## 2. Principe opérationnel obligatoire

Le dashboard n’est pas une simple vue de consultation du Directeur de cabinet.

Chaque direction, agence ou entité sous tutelle doit avoir un accès propre lui permettant de mettre à jour son périmètre :

- missions ;
- actions et activités ;
- tâches et livrables ;
- échéances ;
- avancement ;
- blocages ;
- alertes ;
- décisions attendues ;
- commentaires ou éléments justificatifs.

Ces mises à jour doivent alimenter automatiquement la Vue Directeur. L’expérience doit donc être pensée comme une boucle continue :

`mise à jour Direction → consolidation → détection des écarts → arbitrage DIRCAB → décision → relance → suivi`

## 3. État technique actuel à respecter

### Stack

- Frontend : React 19, React Router, JavaScript/JSX, Tailwind CSS, shadcn/Radix, Lucide, Axios.
- Backend : FastAPI et MongoDB.
- API principale : `/api/metfpa`.
- Interface entièrement en français.
- Structure responsive déjà présente : sidebar fixe/repliable sur desktop et drawer sur mobile.
- Identité visuelle existante : Inter, sidebar sombre, palette institutionnelle ivoirienne vert/orange/or.

### Rôles actifs

| Rôle technique | Utilisateur fonctionnel | Capacité principale |
|---|---|---|
| `dircab` | Directeur de cabinet / équipe Cabinet | Lecture globale, arbitrage, décisions et relances |
| `direction_editor` | Direction, agence ou entité | Mise à jour de son propre périmètre |
| `me_validator` | Suivi-évaluation | Contrôle qualité et validation |
| `admin` | Administrateur | Utilisateurs, rôles, supervision et accès complet |

Le rôle historique `cabinet_reader` a été retiré de la version actuelle.

### Règles à ne pas contourner dans le design

- Un `direction_editor` ne peut modifier que les données de sa direction.
- Le DIRCAB peut piloter et gérer les décisions, mais ne doit pas devenir administrateur technique.
- La validation M&E appartient au validateur et à l’administrateur.
- Toute action indisponible doit être masquée ou clairement présentée en lecture seule avant le clic.
- Les données manquantes doivent être affichées comme « manquantes », jamais comme zéro.
- Les statuts de fiabilité doivent rester visibles : officiel, validé, provisoire, démonstration, manquant.
- Aucun nouveau contrat API ne doit être supposé silencieusement. Toute recommandation nécessitant un endpoint doit être listée séparément.

## 4. Données et fonctionnalités déjà disponibles

### Données serveur

- référentiels PND 4.02, Politique EFTP et Stratégie digitale ;
- alignements entre référentiels ;
- activités et direction responsable ;
- avancement, statut et alerte d’une activité ;
- indicateurs ;
- budgets consolidés ;
- décisions ;
- risques et scores de criticité ;
- alertes calculées ;
- historique des modifications ;
- validation M&E ;
- utilisateurs et rôles ;
- rapports de dry-run Excel ;
- note Cabinet PDF.

### Fonctions encore locales au navigateur

Ces objets sont actuellement stockés dans `localStorage` et doivent être identifiés comme « démonstration / non partagé » dans toute proposition fondée sur l’existant :

- ordre du jour ;
- relances ;
- notes de réunion ;
- statuts de liens d’alignement ;
- note libre du Directeur.

Claude peut proposer leur expérience cible partagée. Il doit alors signaler explicitement les besoins backend correspondants dans sa restitution.

## 5. Pages React existantes

### Pilotage Directeur

- `/pilotage-directeur` : synthèse Cabinet ;
- `/suivi-hebdo` : suivi de la semaine ;
- `/ordre-du-jour` : préparation de réunion ;
- `/decisions` : registre et arbitrages ;
- `/risks` : registre des risques ;
- `/vue-directions` : comparaison des directions ;
- `/reporting` : note PDF et rapports ;
- `/budget-consolide` : vue budgétaire ;
- `/declinaison` : lecture annuelle, trimestrielle et mensuelle.

### Travail des directions

- `/plan-action` : portefeuille et mise à jour des activités ;
- `/kpi-cascade` : indicateurs et corrections ;
- référentiels et alignements en consultation.

### Validation et administration

- `/kpi-cascade` : file de validation M&E ;
- `/imports` : import Excel en dry-run uniquement ;
- `/audit-log` : traçabilité ;
- `/admin-users` : utilisateurs, rôles et directions.

### Référentiels

- `/pnd-402` ;
- `/politique-eftp` ;
- `/strategie-digitale` ;
- `/alignement`.

## 6. Parcours prioritaires à travailler

### Parcours A — Direction met à jour son activité

1. La direction arrive sur son espace.
2. Elle voit les éléments à mettre à jour, en retard, bloqués ou retournés pour correction.
3. Elle ouvre une activité sans perdre le contexte de sa liste.
4. Elle renseigne avancement, tâche/livrable, échéance, blocage et décision attendue.
5. Elle enregistre et voit clairement l’état de transmission.
6. La mise à jour remonte dans la Vue Directeur.

Question UX à résoudre : comment rendre ce parcours rapide, répétable et compréhensible pour des utilisateurs peu techniques ?

### Parcours B — DIRCAB identifie un blocage et prépare une décision

1. Le DIRCAB ouvre la Vue Directeur.
2. Il voit les sujets prioritaires de la semaine.
3. Il ouvre un sujet et accède à son contexte : direction, action, historique, retard, risque, budget et décision attendue.
4. Il choisit de relancer, demander une information, préparer une décision ou inscrire le point à la prochaine réunion.
5. Le sujet conserve un responsable, une échéance et un statut de suivi.

Question UX à résoudre : comment passer du constat à l’action sans naviguer entre cinq pages ?

### Parcours C — Préparation et tenue de la réunion de suivi

1. Les sujets proposés sont regroupés automatiquement.
2. Le DIRCAB sélectionne les points à inscrire.
3. Chaque point comporte contexte, blocage, décision attendue, responsable et pièces utiles.
4. Pendant ou après la réunion, le point devient décision, relance ou action de suivi.
5. Les décisions sont suivies jusqu’à clôture.

### Parcours D — Validation M&E

1. Le validateur ouvre une file de travail unique.
2. Il comprend immédiatement pourquoi chaque élément nécessite une revue.
3. Il valide, commente, rejette ou demande une correction.
4. La direction concernée voit la correction demandée.
5. Le validateur suit les retours jusqu’à validation finale.

## 7. Écrans à traiter en priorité

### Priorité 1

1. Vue Directeur orientée « avance / blocage / décisions ».
2. Espace Direction orienté mise à jour opérationnelle.
3. Fiche transverse d’un sujet ou d’une activité.
4. Préparation de la réunion et ordre du jour.
5. File de validation M&E.

### Priorité 2

6. Registre des décisions.
7. Suivi hebdomadaire.
8. Vue par direction.
9. Registre des risques.
10. Reporting.

Les référentiels ne sont pas prioritaires pour une refonte profonde. Ils doivent rester accessibles comme contexte du pilotage.

## 8. Orientation UX attendue

### Vue Directeur

La première zone visible doit répondre aux trois questions du produit. Éviter une simple accumulation de KPI.

Organisation recommandée à explorer :

- Ce qui avance ;
- Ce qui bloque ;
- Décisions cette semaine ;
- Décisions à préparer ce mois ;
- Prochaine réunion ;
- Directions à relancer.

Chaque carte ou ligne doit permettre d’ouvrir le contexte et de déclencher une action.

### Espace Direction

La direction doit voir d’abord :

- mises à jour attendues ;
- corrections demandées ;
- activités en retard ou bloquées ;
- échéances proches ;
- décisions attendues de sa part ;
- progression de son portefeuille.

L’expérience doit privilégier la saisie guidée et les actions explicites plutôt que les tableaux très larges.

### Fiche transverse

Explorer un drawer ou panneau de détail réutilisable contenant :

- titre, statut et priorité ;
- mission/axe/action parente ;
- direction responsable ;
- avancement et échéance ;
- dernier livrable ;
- blocage et cause ;
- décision attendue ;
- risques et alertes liés ;
- historique ;
- actions autorisées selon le rôle.

### Tables et actions

- Réduire les colonnes visibles par défaut.
- Déplacer le détail dans un panneau latéral.
- Remplacer les groupes d’icônes ambiguës par une action principale et un menu secondaire libellé.
- Prévoir filtres sauvegardables ou vues ciblées si cela reste compatible avec l’existant.
- Toujours concevoir les états chargement, vide, erreur, lecture seule et succès.

## 9. Contraintes UI

À conserver :

- français ;
- typographie Inter ;
- palette institutionnelle ivoirienne ;
- sidebar sombre ;
- interface claire ;
- Lucide pour les icônes ;
- rayons modérés ;
- tableaux adaptés aux données administratives ;
- densité professionnelle ;
- responsive desktop/tablette/mobile.

À éviter :

- esthétique SaaS générique ;
- grands espaces décoratifs au détriment de l’information ;
- dépendance à la couleur seule ;
- graphiques sans action associée ;
- multiplication des cartes KPI ;
- fausses fonctionnalités présentées comme disponibles ;
- redesign nécessitant de remplacer React, Tailwind ou les composants existants.

## 10. Points techniques connus à prendre en compte

- Le backend possède encore un ancien cockpit PND dans `server.py`, mais l’UX cible concerne uniquement METFPA.
- Les données METFPA sont isolées par préfixe de collections MongoDB.
- Le chargement initial des données de démonstration doit être refactoré par Codex ; cela ne doit pas bloquer le design.
- L’import Excel ne fait qu’une simulation : ne pas concevoir un bouton d’application comme s’il existait déjà.
- La note Cabinet PDF est le seul rapport complètement généré côté serveur.
- Plusieurs autres rapports sont encore des placeholders.
- La persistance serveur de l’ordre du jour et des relances sera une évolution backend ; toute maquette qui l’utilise doit le signaler.
- Les pages existantes doivent être améliorées progressivement, pas remplacées par une nouvelle application parallèle.

## 11. Livrables demandés à Claude

Claude doit produire dans `CLAUDE_TO_CODEX.md` :

1. une architecture d’information cible, par rôle ;
2. les parcours détaillés Directeur, Direction et validation M&E ;
3. les wireframes textuels ou visuels des cinq écrans de priorité 1 ;
4. la hiérarchie exacte de la Vue Directeur ;
5. la hiérarchie exacte de l’Espace Direction ;
6. les composants UI à créer, modifier ou réutiliser ;
7. le wording français des titres, filtres, actions et états ;
8. les règles responsive et d’accessibilité ;
9. une liste séparée des recommandations réalisables sans backend supplémentaire ;
10. une liste séparée des besoins backend/endpoints nécessaires ;
11. des critères d’acceptation vérifiables par Codex ;
12. un ordre d’implémentation recommandé, écran par écran.

## 12. Format obligatoire de `CLAUDE_TO_CODEX.md`

Le fichier de retour doit contenir ces sections :

```md
# Handoff Claude vers Codex

## Décisions UX validées
## Architecture d’information
## Parcours Directeur de cabinet
## Parcours Direction / agence / entité
## Parcours Validation M&E
## Wireframes et hiérarchie des écrans
## Composants et design system
## Wording final
## Responsive et accessibilité
## Changements frontend sans nouvel endpoint
## Besoins backend ou modèle de données
## Risques et questions bloquantes
## Critères d’acceptation
## Ordre d’implémentation recommandé
```

Chaque recommandation doit indiquer au minimum :

- page concernée ;
- rôle concerné ;
- problème résolu ;
- comportement attendu ;
- composant concerné ;
- dépendance backend éventuelle ;
- priorité : P0, P1 ou P2.

## 13. Décisions déjà prises par Codex

- Le produit reste le cockpit METFPA existant.
- Le DIRCAB est le rôle décisionnel central.
- Les directions disposent de comptes et d’un périmètre de mise à jour propre.
- Les mises à jour Direction alimentent la consolidation Directeur.
- Le backend reste autoritaire pour les rôles et le scope direction.
- Les fonctions locales de démonstration devront progressivement devenir des fonctions serveur partagées.
- L’implémentation UX sera réalisée par Codex après réception du fichier de Claude.
- Aucun benchmark ni refonte complète du socle n’est attendu.

## 14. Prochaine étape de coordination

Claude analyse ce handoff et pousse :

`docs/agent-handoff/CLAUDE_TO_CODEX.md`

Codex utilisera ensuite ce fichier comme spécification d’implémentation, signalera les éventuels conflits avec les contrats techniques et mettra à jour le présent handoff si une décision d’architecture modifie le périmètre UX.

## 15. Mise à jour Codex — MVP Dashboard Directeur implémenté

Cette section décrit l’état réel de la branche `codex/dashboard-director-mvp`. Elle prime sur les formulations prospectives des sections précédentes.

### 15.1 Source de vérité et modèle

La collection MongoDB existante `metfpa_activities` reste la source de vérité des missions opérationnelles. Aucun second registre concurrent n’a été créé.

Un contrat « mission » additif normalise les champs existants et conserve les alias historiques afin de ne pas casser `/activities` ni les pages secondaires :

- `id`, `code` ;
- `pnd_pillar`, `pnd_axis` ;
- `strategic_objective`, `budget_program`, `ministry_mission` ;
- `mission_title`, `action_title`, `activity_title` ;
- `direction`, `responsible_person` ;
- `due_date`, `status`, `progress` ;
- `expected_deliverable`, `deliverable_link` ;
- `blocker`, `decision_required`, `next_step` ;
- `priority`, `risk_level`, `needs_arbitration` ;
- `last_update`, `submission_status` ;
- `data_origin`, `validation_status` ;
- `comments`, `supporting_documents`, `completeness_score`.

Les statuts opérationnels sont :

- `non_demarre` ;
- `en_cours` ;
- `acheve` ;
- `en_retard` ;
- `suspendu` ;
- `en_attente_arbitrage`.

Les statuts de soumission directionnelle sont :

- `brouillon` ;
- `soumis` ;
- `valide` ;
- `correction_demandee`.

### 15.2 Endpoints MVP disponibles

| Méthode | Endpoint | Usage |
|---|---|---|
| GET | `/api/metfpa/director-dashboard` | Synthèse Directeur consolidée |
| GET | `/api/metfpa/pnd-alignment` | Chaîne PND → mission → direction |
| GET | `/api/metfpa/missions` | Liste normalisée, filtrée par rôle |
| GET | `/api/metfpa/missions/{id}` | Détail d’une mission |
| PATCH | `/api/metfpa/missions/{id}` | Mise à jour Coordination/Admin ou Direction scopée |
| GET | `/api/metfpa/directions-performance` | Performance et fraîcheur par direction |
| GET | `/api/metfpa/my-direction` | Synthèse de la direction connectée |
| GET | `/api/metfpa/my-direction/missions` | Missions de la direction connectée |
| PATCH | `/api/metfpa/my-direction/missions/{id}` | Mise à jour limitée à sa direction |
| POST | `/api/metfpa/my-direction/missions/{id}/updates` | Soumission hebdomadaire commentée |
| GET | `/api/metfpa/weekly-meetings` | Réunions et ordre du jour proposé |
| POST | `/api/metfpa/weekly-meetings` | Création d’une réunion partagée |
| PATCH | `/api/metfpa/weekly-meetings/{id}` | Mise à jour de la réunion et de l’agenda |
| GET | `/api/metfpa/alerts` | Alertes opérationnelles calculées |
| PATCH | `/api/metfpa/decisions/{id}` | Mise à jour partielle d’une décision |
| GET | `/api/metfpa/update-log` | Journal structuré des mises à jour |

Les anciennes routes restent disponibles. `/activities`, `/decisions` et `/risks` sont désormais automatiquement limités à la direction de l’utilisateur `direction_editor`.

### 15.3 Rôles réellement appliqués

- `direction_editor` : voit et modifie uniquement les missions, décisions et risques de sa direction ; ses mises à jour passent à `soumis` et `to_validate`.
- `dircab` : accès aux synthèses globales, décisions, arbitrages, réunions et reporting ; pas de modification directe des missions.
- `coordination` : nouveau rôle Chef de cabinet/Coordination ; accès global, consolidation des missions, préparation des réunions, relances et arbitrages.
- `me_validator` : contrôle qualité, validation M&E, alertes et performance globale ; ne peut pas arbitrer une décision.
- `admin` : accès complet et gestion des comptes.

Les modifications de mission créent deux traces :

1. une entrée détaillée dans `metfpa_mission_updates` avec utilisateur, rôle, direction, avant, après, commentaire et date ;
2. une entrée dans le journal d’audit existant.

### 15.4 Règles métier disponibles

- échéance dépassée + mission non achevée → statut effectif `en_retard` ;
- retard + priorité haute/critique → alerte critique ;
- décision non exécutée après échéance → alerte critique ;
- direction sans mise à jour depuis 14 jours par défaut → « À relancer » ;
- mission sans responsable ou échéance → donnée incomplète ;
- blocage ou besoin d’arbitrage → point proposé pour la réunion ;
- points critiques → proposition automatique d’ordre du jour ;
- mises à jour Direction → recalcul immédiat de la Vue Directeur ;
- calcul des taux d’exécution global, par axe et par direction ;
- calcul de la complétude et du score de mise à jour par direction ;
- calcul du taux d’exécution des décisions et de l’écart physique/budgétaire lorsque les données existent.

### 15.5 Pages React consolidées

- `CabinetView.jsx` : Vue Directeur centrée sur avance, blocages, décisions, réunion et directions à relancer.
- `PlanAction.jsx` : tableau missions/actions et formulaire complet ; devient aussi l’espace `/ma-direction`.
- `Alignement.jsx` : chaîne PND complète avec filtres opérationnels.
- `VueDirections.jsx` : performance, complétude et fraîcheur par direction.
- `SuiviHebdo.jsx` : alertes, points proposés et engagements précédents.
- `OrdreDuJour.jsx` : sélection des points automatiques, persistance serveur et création de décision.
- `Reporting.jsx` : prévisualisation hebdomadaire et export PDF existant.

Les routes d’accès globales sont protégées côté React et côté FastAPI. La page `/ma-direction` est réservée à `direction_editor`.

### 15.6 Zones réservées à Claude

Claude peut améliorer sans nouvel endpoint :

- hiérarchie visuelle de la Vue Directeur ;
- densité et ordre des blocs ;
- wording des alertes et décisions ;
- présentation de la fiche mission ;
- ergonomie du formulaire Direction ;
- filtres et lisibilité des tableaux ;
- représentation des statuts, priorités, risques et niveaux de fiabilité ;
- responsive et accessibilité ;
- parcours de sélection de l’ordre du jour.

Claude ne doit pas modifier les noms de champs ou supposer de nouvelles écritures sans les signaler. Toute proposition de pièces jointes binaires, notifications, relances multicanales, commentaires de réunion structurés ou workflow d’approbation supplémentaire nécessite un besoin backend explicite dans `CLAUDE_TO_CODEX.md`.

### 15.7 Validation technique exécutée

- analyse AST : 23 fichiers Python valides ;
- import FastAPI : 59 routes montées ;
- contrôle des endpoints MVP : aucun manquant ;
- tests unitaires : 8 passés ;
- build React production : réussi ;
- tests d’intégration historiques sur preview : non exécutés, car ils écrivent sur un service distant et ne valideraient pas la branche locale.
