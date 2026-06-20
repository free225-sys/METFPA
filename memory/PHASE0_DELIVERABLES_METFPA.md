# Phase 0 — Livrables #2 à #8 (METFPA)
Base : `seed_metfpa.json` extrait du cockpit HTML de référence · 2026-06-19
> Aucun code de production modifié. Aucune donnée de suivi présentée comme officielle.

---

## #2 — Carte de fiabilité des données (data reliability map)

| Bloc | Volume réel | `data_origin` | Fiabilité | Action |
|---|---|---|---|---|
| PND P4 / secteur 4.02 (effets, produits, budgets) | 3 effets · 15 produits · 1 202 137,6 M | html_reference → official_reference | À valider | Confronter au PND officiel |
| Politique EFTP (axes, produits, actions clés) | 3 axes · 27 produits · **100 actions** · 2 937 726 M | html_reference → official_reference | À valider | Confronter au `.docx` |
| Stratégie digitale (axes, OS, orientations) | 3 axes · 9 OS · 24 orientations · 33 562 M | html_reference → official_reference | À valider | Confronter au `.pdf` |
| DIG — 12 KPI (base/cible) | 12 | html_reference | Bonne | base souvent « n.d. » → to_validate |
| DIG — budget annuel 2026-2031 + financement État 15%/Bailleur 85% | 6 années + split | html_reference | Bonne | Valider |
| DIG — priorités P1-P4 (état/bailleur) | 4 | html_reference | Bonne | Valider |
| KPI cascade (national→sectoriel→digital) | 7 | html_reference | Structure OK | Compléter sources/valeurs actuelles |
| Alignement (pnd_effet sur axes, ancres digitales) | AX→effet, ancre 4.02.1.6 / 1.4 | html_reference | Bonne | Valider |
| **Activités opérationnelles** (avancement, exécuté, statut, alerte) | 62 activités | **demo_tracking** | ❌ NON officiel | Ne jamais présenter comme réel |
| Directions responsables | 15 distinctes | **to_validate** | ❌ | Demander liste officielle |
| Budget **engagé** par activité | — | **missing** | — | Demander nomenclature |
| Source de financement **par activité** | — | **missing** | — | Demander nomenclature |
| Baseline/cible/preuve/fréquence par activité | — | **missing** | — | À saisir (M&E) |

### ⚠️ Incohérences budgétaires détectées (à arbitrer avant pilote)
1. **Politique EFTP totale (2 937 726 M) > PND secteur 4.02 total (1 202 137 M)** — facteur ~2,4×. Probable différence d'horizon (Politique 2026-2035 sur 10 ans vs PND 5 ans) et de périmètre de chiffrage. **À expliquer/réconcilier**, sinon le « budget consolidé » sera trompeur.
2. **AX2 (accès) = 2 634 266 M** représente ~90 % de la Politique → dominance écrasante des infrastructures, à confirmer.
3. **Budgets nuls/`null`** : produits POL `1.10`, `3.8`, `3.9` sans budget → missing.
4. **Cohérent** : DIG total (33 562 M) ≈ produit PND `4.02.1.6` digital (32 912 M) → ancrage validé.

---

## #3 — Dictionnaire de données (consolidé, d'après le seed réel)

**Référentiels (lecture seule après import) :**
- `pnd_node` : `code`, `niveau`(pilier|secteur|effet|produit), `parent_code`, `nom`, `resultat?`, `budget_total`, `ancre_digital?`, `data_origin`, `source_document`.
- `pol_node` : `code`, `niveau`(axe|produit|action), `parent_code`, `nom`, `effet?`(axe), `budget_total?`(peut être null), `pnd_effet`(lien), `ancre_digital?`, `data_origin`, `source_document`.
- `dig_node` : `code`, `niveau`(axe|objectif), `parent_code`, `nom`, `budget_total?`, `pct?`, `etat?`, `bailleur?`, `orientations?[]`, `pnd_ancre`, `pol_ancre`, `data_origin`.
- `dig_profile` : `annuel`{2026..2031}, `financement`{etat,bailleur,etat_pct,bailleur_pct}, `priorites`[{code,nom,actions,total,etat,bailleur}].
- `indicator` : `code`, `niveau`, `libelle`, `unite`, `base`, `cible`, `cible_annee`, `valeur_actuelle`, `axe`, `parent_id`, `linked_activity_ids[]`, `source`, `source_verification`, `frequence`, `responsable`, `data_origin`.
- `alignment` : `pol_axe`, `pol_axe_nom`, `pol_total`, `pnd_effet`, `pnd_effet_nom`, `pnd_total`, `nb_produits`, `dig_ancrage`.

**Couche opérationnelle (éditable, RBAC) :**
- `activity` : `id`, `intitule`, `code_action`, `direction`(→ref), `responsable`(missing), `axe_pol`, `produit_pol`, `pnd_effet`, `strategie?`, `budget_prevu`, `budget_engage`(missing), `budget_execute`(demo), `source_financement`(missing), `avancement`(demo), `statut`(enum), `echeance`, `baseline`(missing), `cible`(missing), `valeur_actuelle`(missing), `niveau_risque`(missing), `decision_requise`(missing), `frequence_reporting`(missing), `source_verification`(missing), `evidence[]`(missing), `alerte`, `derniere_maj`, `history[]`, `comments[]`, `data_origin`.
- `risk`, `decision`, `meeting`, `director_note`, `evidence`, `audit_log`, `import_log`, `user`(+role,+direction).

**Énumérations** : statut {Non démarré, En cours, À l'heure, En retard, Bloqué, Achevé} ; rôle {Lecteur Cabinet, Saisie Direction, Validateur M&E, Admin} ; sévérité {Critique, Majeur, Mineur} ; financement {État, Bailleur, Mixte} ; risque {Faible, Moyen, Élevé} ; data_origin {official_reference, html_reference, demo_tracking, computed, missing, to_validate}.

---

## #4 — Schéma MongoDB cible (collections)

```
frameworks        { key:'PND'|'POL'|'DIG', vision, total, meta }
pnd_nodes         { code, niveau, parent_code, nom, resultat?, budget_total, ancre_digital?, data_origin, source_document }
pol_nodes         { code, niveau, parent_code, nom, effet?, budget_total?, pnd_effet, ancre_digital?, data_origin, source_document }
dig_nodes         { code, niveau, parent_code, nom, budget_total?, pct?, etat?, bailleur?, orientations?, pnd_ancre, pol_ancre, data_origin }
dig_profile       { annuel, financement, priorites }
indicators        { code, niveau, libelle, unite, base, cible, cible_annee, valeur_actuelle, axe, parent_id, linked_activity_ids, source, source_verification, frequence, responsable, data_origin }
alignments        { pol_axe, pol_axe_nom, pol_total, pnd_effet, pnd_effet_nom, pnd_total, nb_produits, dig_ancrage }
activities        { ...cf dictionnaire... , history[], comments[], data_origin }   // remplace l'actuelle 'actions'
budget_lines      { referentiel, code_noeud, annee, planifie, engage, execute, source_financement, data_origin }
risks             { code, activite_id, libelle, niveau, probabilite, impact, mesure, responsable, statut }
decisions         { sujet, decision, impact, statut, date, auteur }
meetings          { date, objet, statut }
director_notes    { texte, auteur, date }
evidence          { entite, entite_id, fichier_url, type, uploaded_by, date }
users             { email, password_hash, name, title, role, direction }
audit_log         { user, action, entite, entite_id, avant, apres, horodatage }
import_log        { fichier, date, lignes, erreurs, valide_par }
```
Index : `pnd_nodes.code`, `pol_nodes.code`/`pnd_effet`, `activities.code_action`/`axe_pol`/`direction`, `indicators.niveau`, `budget_lines.referentiel+code_noeud+annee`.
**Suppression** : seed aléatoire `random.Random(2030)` et collection `actions` mock.

---

## #5 — Spécification du gabarit d'import `IMPORT_METFPA.xlsx`

| Onglet | Clés | Colonnes principales | Validation |
|---|---|---|---|
| `PND_4.02` | code | niveau, parent_code, nom, resultat, budget_total, ancre_digital | codes uniques, hiérarchie valide |
| `Politique_Nodes` | code | niveau, parent_code, nom, effet, budget_total, pnd_effet | pnd_effet ∈ PND ; somme produits ≤ axe |
| `Digital_Axes_OS` | code | niveau, parent_code, nom, pct, etat, bailleur, orientations | etat+bailleur=total ; Σpct=100 |
| `Digital_Profil` | annee | planifie, etat, bailleur, priorite | Σannuel=DIG.total |
| `Indicateurs` | code | niveau, libelle, unite, base, cible, cible_annee, axe, source, frequence | niveau ∈ enum |
| `Alignement` | pol_axe | pnd_effet, totaux, nb_produits, dig_ancrage | cohérence pol/pnd |
| `Plan_Action` | id | intitule, code_action, direction, axe_pol, produit_pol, pnd_effet, budget_prevu, budget_engage, source_financement, baseline, cible, echeance, frequence, responsable | direction ∈ ref ; liens valides |
| `Directions` | code | nom, responsable, type | référentiel obligatoire |
| `Budget_Lines` | referentiel+code+annee | planifie, engage, execute, source | referentiel ∈ {PND,POL,DIG} |

Règles globales : `data_origin='official_reference'` auto ; lignes en erreur rejetées avec rapport ; verrouillage lecture seule des référentiels ; journal dans `import_log`. **Bootstrap** = conversion de `seed_metfpa.json` en premier import (à faire valider).

---

## #6 — Wireframe « Pilotage Directeur » (Cabinet View)

```
┌─ COCKPIT METFPA · PILOTAGE DIRECTEUR ───────────────────[ Exporter note PDF ]┐
│ Bandeau: ⚠ DONNÉES DE SUIVI — DÉMONSTRATION (non officielles)                  │
├───────────────────────────────────────────────────────────────────────────────┤
│ [Avancement moyen 38%] [Exécution budg. 22%] [Alertes 9] [Bloqués 4] [Échéances<90j 6] │
├──────────────────── ① DÉCISIONS REQUISES (arbitrage) ─────────────────────────┤
│  Sujet                         | Direction | Impact | Décision (éditable)       │
│  Marché construction lot 3     | DAF       | Élevé  | [__________________]      │
│  Retard décaissement bailleur  | DAIP      | Élevé  | [__________________]      │
├──────── ② ALERTES & BLOCAGES ────────┬──────── ③ ÉCHÉANCES PROCHES ───────────┤
│ Sévérité│Code │Activité│Dir│Motif    │ Échéance │ Activité          │ Avanc.   │
│ ●Critique 1.7.1 Comm.  AGEFOP Marché.│ 2026-T3  │ Gestion flux app. │ 25%      │
│ ●Majeur  2.3.2 Accomp. IPNETP Décais.│ 2026-T4  │ Stratégie com.    │ 30%      │
├──────── ④ TOP 5 PLUS COÛTEUX ────────┴──────── ⑤ RISQUES (registre) ──────────┤
│ Construction (AX2.1) 341 407 M       │ Élevé · Dépendance inter-direction (x3) │
│ Réhabilitation (AX2.2) 137 393 M     │ Moyen · Retard décaissement bailleur    │
├──────────────────── ⑥ ARBITRAGE BUDGÉTAIRE ──────────────────────────────────┤
│ Par axe Politique: AX1 ▓▓ AX2 ▓▓▓▓▓▓▓▓▓ AX3 ▓   (Prévu vs Exécuté)            │
├──────────────────── ⑦ NOTE DU DIRECTEUR ─────────────────────────────────────┤
│ [ zone de texte libre, horodatée ]                                            │
└───────────────────────────────────────────────────────────────────────────────┘
Objectif: compréhension de la situation < 2 min ; décisions et risques en haut.
```

---

## #7 — Wireframe « Accueil — Vue intégrée »

```
┌─ COCKPIT METFPA INTÉGRÉ ─── PND 4.02 · Politique EFTP · Stratégie digitale ────┐
│ Hero: « Du PND national au suivi opérationnel des directions »                 │
│ Bandeau référentiels:  PND 4.02: 1 202 Md │ Politique: 2 938 Md │ Digital: 34 Md│
├──────────────── CHAÎNE DE RÉSULTATS (cliquable, drill-down) ───────────────────┤
│  PND P4 ▶ Secteur 4.02 ▶ 3 Effets ▶ 15 Produits                                │
│      └─ Politique EFTP: 3 Axes ▶ 27 Produits ▶ 100 Actions clés                │
│            └─ Stratégie digitale: 3 Axes ▶ 9 OS ▶ 24 Orientations (ancrée 4.02.1.6 / 1.4) │
├──────────────── KPIs GLOBAUX ─────────────────────────────────────────────────┤
│ [Avancement 38%] [Budget exécuté] [Taux exéc. 22%] [Directions 15] [Activités 62] [Alertes 9]│
├──────────── Budget par référentiel (barres, échelle log) ─── Alertes actives ──┤
│   PND ▓▓▓▓▓  Politique ▓▓▓▓▓▓▓  Digital ▓                │ 4 bloqués · 5 retards │
├───────────────────────────────────────────────────────────────────────────────┤
│ Accès rapide: [Vue PND] [Politique] [Digital] [Plan d'action] [Alignement] [KPI] [Pilotage] │
└───────────────────────────────────────────────────────────────────────────────┘
Note: bandeau permanent « données de suivi = démonstration » tant que non importé/validé.
```

---

## #8 — Checklist Go / No-Go (avant développement Phase 1)

| # | Critère | État |
|---|---|---|
| 1 | `seed_metfpa.json` extrait et relu | ✅ Fait (3 référentiels, 100 actions, 12 KPI, 62 activités démo) |
| 2 | Chaque bloc classé `data_origin` | ✅ Fait (carte de fiabilité #2) |
| 3 | Dictionnaire de données validé | ☐ À valider METFPA |
| 4 | Schéma MongoDB cible validé | ☐ À valider |
| 5 | Gabarit d'import `IMPORT_METFPA.xlsx` validé | ☐ À valider |
| 6 | Wireframe Cabinet View validé | ☐ À valider |
| 7 | Wireframe Accueil validé | ☐ À valider |
| 8 | Périmètre 4.02 unique confirmé | ✅ Confirmé (Décision 1) |
| 9 | Sources manquantes obtenues (budget engagé/source ; Directions) | ☐ En attente METFPA |
| 10 | Incohérence budgétaire POL>PND expliquée | ☐ À arbitrer |
| 11 | Décision : seed = import officiel après validation METFPA | ☐ À acter |
| 12 | Suppression du seed aléatoire planifiée | ✅ Actée (target design) |

**Go** = lignes 3-7 et 9-11 validées. Tant qu'elles ne le sont pas → **No-Go développement**, mais les livrables Phase 0 sont prêts pour revue.
