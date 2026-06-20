# Audit — Cockpit METFPA (intégré PND · Politique EFTP · Stratégie digitale)
Date : 2026-06-19 · Auditeur : E1 (product / tech / UX / M&E)
Périmètre audité : projet Emergent réellement présent dans `/app`

---

## ⚠️ Constat liminaire (à lire en premier)

**Le « Cockpit intégré METFPA — PND · Politique EFTP · Stratégie digitale » décrit dans la demande n'existe PAS dans ce projet.**

- Aucun fichier HTML autonome, aucune section « Politique EFTP 2026–2035 », « Stratégie digitale 2026–2031 », « Alignement PND/Politique/Action », « Cascade KPI », « Pilotage Directeur » n'est présente.
- Aucune pièce jointe n'a été fournie (`get_assets_tool` → aucun asset).
- Ce qui existe réellement est le **« Cockpit PND 2026-2030 »** : une application **React 19 + FastAPI + MongoDB** générique, à 6 piliers nationaux et 720 actions de démonstration, construite lors des itérations précédentes.

**Conséquence méthodologique :** cet audit porte sur le projet réel (le cockpit PND générique) et évalue, pour chaque exigence METFPA, ce qui est *réutilisable*, *partiellement couvert* ou *absent*. Les recommandations partent du principe que l'on veut **spécialiser** ce cockpit générique en cockpit METFPA, et non auditer un artefact inexistant.

---

## 1. Résumé exécutif (verdict)

**Ce qui fonctionne (à préserver) :**
- Socle technique propre et moderne : React 19 (CRA/CRACO) + FastAPI + MongoDB, code modulaire (~2 080 lignes), build sans erreur, tests 18/18 backend.
- Modèle hiérarchique à 5 niveaux **Pilier → Secteur → Effet → Produit → Action** déjà persisté et éditable (CRUD, historique automatique, commentaires). C'est exactement la *colonne vertébrale results-chain* dont un dispositif PND a besoin.
- Auth JWT fonctionnelle, panneau de détail éditable, centre d'alertes, vue par ministère, analyse budgétaire, design institutionnel cohérent.

**Ce qui est risqué :**
- **100 % des données sont des données de démonstration générées aléatoirement** (`random.Random(2030)` dans `seed_data()`). Aucune donnée officielle, aucune source, aucun import.
- **Aucune des trois logiques officielles METFPA n'est modélisée** : pas de Politique EFTP (axes/effets/produits/actions clés), pas de Stratégie digitale (axes/objectifs/actions/KPI), pas de croisement PND 4.02 ↔ axes Politique ↔ axes Digital.
- **Modèle budgétaire trop pauvre** : un seul budget planifié/an + un « réalisé 2026 » unique. Pas de distinction planifié / engagé / exécuté / source de financement.
- **KPI non exploitables** : ce sont de simples chaînes de texte, sans baseline, cible, valeur, fréquence, source de vérification, responsable.
- **Aucun RBAC** : tout utilisateur authentifié a un accès CRUD total. Secrets en clair dans `.env`. Pas de traçabilité d'audit globale.
- **Export simulé** (toast), non fonctionnel.

**Ce qui doit être corrigé avant de continuer :**
1. Décider explicitement le périmètre : spécialiser le cockpit PND en cockpit METFPA (recommandé) vs repartir d'un autre artefact.
2. Séparer formellement **données officielles de référence** et **données de suivi/démo** (deux origines, deux régimes de modification).
3. Étendre le modèle de données (Politique EFTP, Stratégie digitale, crosswalk d'alignement, KPI structurés, budget multi-états, risques, décisions).

**Verdict : PRÉSERVER & REFACTORISER (ne pas reconstruire).**
Le socle technique et la chaîne de résultats sont sains et réutilisables à ~60-70 %. Il faut **étendre le modèle métier** et **remplacer les données mock par des données officielles importables**, pas réécrire l'application.

---

## 2. Tableau d'audit détaillé

| Domaine | Constat | Sévérité | Évidence dans le projet | Impact | Recommandation | Priorité |
|---|---|---|---|---|---|---|
| Périmètre | Le cockpit METFPA décrit (EFTP, Digital, alignement) n'existe pas ; seul un cockpit PND générique est présent | Critique | `frontend/src/pages/*` = Dashboard, TreeView, ActionsTable, Analytics, Alerts, Ministries (aucune page EFTP/Digital) | Le produit ne couvre pas la mission réelle | Cadrer le périmètre METFPA puis étendre le modèle | P0 |
| Données | 720 actions générées aléatoirement, aucune source | Critique | `server.py` `seed_data()` `rng = random.Random(2030)` | Aucune fiabilité institutionnelle | Importer données officielles + marquer l'origine | P0 |
| Modèle budgétaire | 1 budget planifié/an + `actual_2026` seul ; pas d'engagé/source | Élevée | clé action : `budget`, `actual_2026`, `total_budget` | Pas d'arbitrage budgétaire réel | Modèle budget multi-états + financement | P1 |
| KPI | KPIs = liste de chaînes de texte, sans valeur/baseline/cible | Élevée | `kpis: rng.sample(KPI_TPL,...)` (libellés seuls) | Pas de suivi M&E réel | Entité Indicateur structurée | P1 |
| Alignement | Aucun crosswalk PND↔Politique↔Digital↔Plan | Critique | aucun champ d'alignement dans le modèle | Cascade stratégique impossible | Table d'alignement (mapping) | P1 |
| Cascade KPI | Inexistante | Élevée | — | Pas de lien stratégique→opérationnel | Hiérarchie d'indicateurs | P1 |
| RBAC | Tout user authentifié = CRUD total | Élevée | `get_current_user` sans contrôle de rôle ; routes non protégées par rôle | Risque d'intégrité des données | Rôles (Lecteur/Saisie/Validateur/Admin) | P1 |
| Sécurité secrets | `JWT_SECRET`, `ADMIN_PASSWORD` en clair dans `.env` | Élevée | `backend/.env` | Fuite de secrets | Secrets gérés hors repo, rotation | P1 |
| Auth durcissement | Pas de lockout/anti-bruteforce, pas de reset | Moyenne | `login()` sans compteur d'échecs | Vulnérabilité | Lockout 5 essais + reset | P2 |
| Traçabilité | Historique par action OK, mais pas d'audit trail global (qui/quand/quoi à l'échelle système) | Moyenne | `history[]` par action seulement | Redevabilité partielle | Journal d'audit central | P2 |
| Export | Export Excel/PDF simulé (toast) | Moyenne | `exportFile()` → `toast.success` | Pas de livrable Cabinet | Export réel xlsx/pdf/pptx | P2 |
| M&E | Champs manquants (baseline, cible, source, fréquence, risque, décision, preuve, direction responsable) | Élevée | clés action : ni `baseline`, ni `target`, ni `risk`, ni `decision`, ni `evidence` | Workflow M&E impossible | Étendre le schéma action/indicateur | P1 |
| Risques | Pas de registre de risques | Élevée | aucune collection `risks` | Pas de pilotage des blocages | Module Risques | P1 |
| Décisions | Pas de suivi des décisions du Cabinet | Élevée | aucune collection `decisions` | Pas de redevabilité décisionnelle | Module Décisions | P1 |
| Date système | `TODAY` figé au 2026-06-15 | Faible | `server.py` `TODAY = datetime(2026,6,15...)` | Retards/échéances faussés en prod | Utiliser la date courante (paramétrable démo) | P2 |
| Vue Cabinet | Pas de « Decision Brief » / synthèse 2 minutes | Élevée | Dashboard = KPIs + graphes, pas de brief décisionnel | Inadapté au Directeur de Cabinet | Vue Cabinet dédiée | P1 |
| Responsive | Desktop-first ; sidebar fixe 280px non repliable ; tables à scroll horizontal | Moyenne | `Sidebar` `w-[280px] fixed` ; tables `min-w-[...]` | Mauvaise UX tablette/mobile | Sidebar repliable + tables adaptatives | P2 |
| Maintenabilité | Code propre, peu de dette ; logique de seed mêlée au serveur | Faible | `seed_data()` dans `server.py` | Évolutivité OK | Externaliser seed/import | P3 |

---

## 3. Carte de fiabilité des données

| Bloc de données | Classification | Statut |
|---|---|---|
| 6 piliers + 30 secteurs (libellés) | Réf. plausible mais **non sourcée** | À valider / remplacer par nomenclature PND officielle |
| Effets / Produits (libellés générés par template) | **Démo/mock** | À remplacer |
| 720 actions (codes, intitulés, dotations) | **Démo/mock (aléatoire)** | À remplacer intégralement |
| Budgets annuels 2026-2030 | **Démo/mock** | À remplacer par budget officiel |
| `actual_2026` (exécuté) | **Calculé sur mock** (`budget*progress*alea`) | Non fiable |
| Avancement `progress` | **Démo/mock** | À saisir réellement |
| Statuts / blocages / motifs | **Démo/mock** | À saisir réellement |
| Historique / commentaires seedés | **Démo/mock** | À purger avant pilote |
| KPI (libellés) | **Démo/mock**, non structurés | À remplacer par cadre d'indicateurs |
| Alertes (bloqué/retard/budget nul) | **Calculé** à partir du mock | Logique réutilisable, données non fiables |
| Vue ministères / taux d'exécution | **Calculé** sur mock | Logique réutilisable |
| Politique EFTP / Stratégie digitale | **Manquant** | À créer |
| Alignement PND↔Politique↔Digital | **Manquant** | À créer |
| Baseline / cibles / sources / preuves | **Manquant** | À créer |

**Règle d'or recommandée :** chaque enregistrement doit porter un champ `data_origin ∈ {officiel, saisie_operationnelle, calculé, démo}` et un `source_document`. Aujourd'hui, aucun de ces champs n'existe.

---

## 4. Évaluation UX — page par page (projet réel)

| Page | Rôle actuel | Forces | Faiblesses pour un Directeur de Cabinet |
|---|---|---|---|
| Login | Auth | Sobre, régalien, blason | OK |
| Tableau de bord | KPIs + donut + trajectoire + top 10 | Lecture rapide des 5 KPIs | Pas de « décisions requises », pas de brief, graphes parfois décoratifs (exécuté = 1 point) |
| Arborescence | Drill-down 5 niveaux + panneau éditable | Excellente navigation stratégie→opérationnel, édition inline, historique/commentaires | C'est une vue *gestionnaire*, pas *Cabinet* |
| Actions | Table paginée/filtrable + édition | Très complète | Trop dense pour un décideur ; pas de tri « plus en retard / plus coûteux / plus stratégique » mis en avant |
| Vue par ministère | Consolidé par maître d'ouvrage | Bonne idée, lisible | Manque direction responsable interne, pas d'arbitrage |
| Analyse budgétaire | Barres groupées, variance, taux | Graphes utiles et colorés par pilier | Pas de distinction engagé/exécuté/financement |
| Centre d'alertes | Tableau sévérité/type/retard + filtres | Très proche d'un vrai module M&E d'alertes | Pas de lien vers décisions, pas de bottlenecks structurés |

**Manques de vues décisionnelles :** pas de **Vue Cabinet** (synthèse < 2 min), pas de **Decision Brief**, pas de **Arbitrage budgétaire**, pas de **Registre de risques/bottlenecks** structuré.

---

## 5. Évaluation de l'alignement stratégique

| Lien attendu | État | Commentaire |
|---|---|---|
| PND → résultat sectoriel → effets → produits | **Partiel** | La chaîne Pilier→Secteur→Effet→Produit→Action existe, mais générique (6 piliers nationaux), non centrée sur le **résultat sectoriel EFTP (PND 4.02)** |
| Politique EFTP → axes → effets → produits → actions clés | **Absent** | À modéliser entièrement |
| Stratégie digitale → axes → objectifs → actions → budget → KPI | **Absent** | À modéliser entièrement |
| Plan d'action ministériel | **Partiel** | Les « actions » existent mais ne sont pas rattachées à un plan d'action METFPA officiel |
| Cascade KPI (stratégique→opérationnel) | **Absent** | KPIs non structurés, non hiérarchisés |
| Cascade budgétaire (national/programme→action) | **Partiel** | Budget par action existe, mais pas relié à un programme budgétaire ni à plusieurs cadres |
| Crosswalk PND 4.02 ↔ Axe Politique ↔ Axe Digital ↔ Activité | **Absent** | C'est le cœur de la valeur « intégrée » → à construire |

**Conclusion :** la *structure* est bonne, la *substance* stratégique METFPA est à créer.

---

## 6. Architecture cible recommandée

- **Frontend** : conserver React 19 + Tailwind + shadcn. Ajouter pages : Vue Cabinet, Politique EFTP, Stratégie digitale, Alignement (matrice de croisement), Risques, Décisions, Indicateurs.
- **Backend** : conserver FastAPI. Introduire des entités métier distinctes (voir modèle ci-dessous) et un service d'import.
- **Base de données** : MongoDB conservé. Collections : `frameworks` (PND/Politique/Digital), `axes`, `effects`, `products`, `actions`, `indicators`, `budget_lines`, `risks`, `decisions`, `evidence`, `alignments`, `audit_log`, `users`, `imports`.
- **Modèle de données clé** :
  - `action` : + `responsible_direction`, `owner`, `baseline`, `target`, `deadline`, `source_document`, `verification_source`, `reporting_frequency`, `status`, `risk_level`, `decision_required`, `last_update`, `evidence[]`, `data_origin`.
  - `indicator` : `code`, `label`, `unit`, `baseline`, `target`, `current`, `frequency`, `owner`, `verification_source`, `parent_id` (cascade), `linked_action_ids`.
  - `budget_line` : `action_id`, `year`, `planifié`, `engagé`, `exécuté`, `source_financement`.
  - `alignment` : `pnd_result`, `policy_axis`, `digital_axis`, `action_id` (crosswalk).
- **Import des données** : import Excel/CSV avec mapping de colonnes + validation + journal d'import (`imports`). Données officielles en lecture seule (verrouillées), suivi opérationnel éditable.
- **Authentification & rôles** : Lecteur (Cabinet), Saisie (directions), Validateur (M&E), Admin. JWT conservé, secrets sortis du repo.
- **Export** : xlsx (openpyxl), pdf (note de synthèse Cabinet), pptx (présentation Conseil).
- **Audit trail** : `audit_log` central (user, action, entité, avant/après, horodatage).
- **Gestion des preuves** : object storage pour pièces justificatives (rapports, PV).
- **Vues dashboard** : Cabinet (brief), Pilotage opérationnel, Budget, Risques, Décisions, Alignement.

---

## 7. Feuille de route par phases

- **Phase 0 — Stabilisation de l'audit (1 sem.)** : cadrer le périmètre METFPA ; figer la nomenclature officielle (PND 4.02, axes Politique, axes Digital) ; définir le dictionnaire de données ; marquer toutes les données actuelles comme « démo ».
- **Phase 1 — Cockpit prêt pour présentation (2-3 sem.)** : ajouter Vue Cabinet (brief < 2 min, décisions requises, top retards/coûts/risques) ; remplacer les libellés génériques par la structure METFPA réelle ; bannière « données de démonstration » explicite ; export PDF de synthèse.
- **Phase 2 — Modèle de données & import (3-4 sem.)** : nouvelles entités (indicateurs, budget multi-états, alignement, risques, décisions) ; import Excel officiel + validation ; verrouillage des données de référence ; champ `data_origin`/`source_document` partout.
- **Phase 3 — Workflow M&E (3-4 sem.)** : cadre de résultats + cadre logique ; baseline/cible/progrès ; cascade KPI ; preuves jointes ; alertes basées sur données réelles ; suivi décisions ; physique vs financier.
- **Phase 4 — Déploiement institutionnel (3-4 sem.)** : RBAC complet + audit trail ; secrets sécurisés + durcissement auth ; sauvegardes ; hébergement/sécurité ; exports xlsx/pdf/pptx ; pilote interne puis mise en production.

---

## 8. Actions immédiates (à faire juste après l'audit)

1. **Valider le verdict de périmètre** : confirmer qu'on spécialise le cockpit PND existant en cockpit METFPA (et non auditer un artefact HTML inexistant).
2. **Fournir les sources officielles** : nomenclature PND 4.02, document Politique EFTP 2026-2035 (axes/effets/produits/actions), Stratégie digitale 2026-2031 (axes/objectifs/actions/KPI), plan d'action, lignes budgétaires.
3. **Geler/étiqueter les données démo** : afficher un bandeau « Données de démonstration — non officielles » jusqu'au remplacement.
4. **Définir le dictionnaire de données** (champs M&E obligatoires + `data_origin` + `source_document`).
5. **Concevoir la Vue Cabinet / Decision Brief** (maquette) avant tout développement.
6. **Sécuriser les secrets** : sortir `JWT_SECRET`/`ADMIN_PASSWORD` du dépôt, prévoir RBAC.
7. **Spécifier le format d'import Excel** (un onglet par cadre : PND, Politique, Digital, Plan d'action, Budget, Indicateurs).

---

### Annexe — Inventaire technique réel
- Frontend : React 19, CRA + CRACO, Tailwind, shadcn/ui, Recharts, Framer Motion. Pages : Login, Dashboard, TreeView, ActionsTable, Ministries, Analytics, Alerts.
- Backend : FastAPI (`server.py`, 618 lignes), MongoDB via motor, JWT (PyJWT) + bcrypt.
- Données : collection `actions` (720, mock), `users` (4 : 1 admin + 3 directeurs démo).
- Auth : Bearer token (localStorage), pas de RBAC, `TODAY` figé.
- Export : simulé. Tests : 18/18 backend, ~95% frontend (itération 2).
