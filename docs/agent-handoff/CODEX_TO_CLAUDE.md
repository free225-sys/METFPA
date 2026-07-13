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
