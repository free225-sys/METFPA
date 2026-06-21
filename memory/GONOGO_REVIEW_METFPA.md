# Go / No-Go — Package de revue Phase 0 (Cockpit METFPA intégré)
Date : 2026-06-19 · Statut : **NO-GO développement** jusqu'à validation METFPA
Aucun code de production modifié · Aucune donnée mock présentée comme officielle

---

## 1. Synthèse finale Phase 0

- **Décision de périmètre actée** : cockpit mono-secteur **PND P4 → Secteur 4.02 EFTP → Politique EFTP 2026-2035 → Stratégie digitale 2026-2031 → Plan d'action**. Le modèle générique 6 piliers est abandonné comme logique produit (référence technique seulement).
- **Socle préservé** : React 19 + FastAPI + MongoDB (préserver & refactoriser). **Le seed aléatoire `random.Random(2030)` est retiré du design cible.**
- **Données de référence extraites** dans `seed_metfpa.json` : 3 effets / 15 produits PND, 3 axes / 27 produits / **100 actions clés** Politique, 3 axes / 9 OS / 24 orientations / 12 KPI / 4 priorités Digital, 7 indicateurs en cascade.
- **62 activités opérationnelles** + **15 directions** = **démo / à valider**, marquées visiblement, jamais présentées comme officielles.
- **Livrables prêts pour revue** : seed, carte de fiabilité, dictionnaire, schéma Mongo, gabarit d'import, wireframes Cabinet/Accueil, workflow de validation, logique de réconciliation budgétaire.

---

## 2. Tableau de fiabilité des données

| Bloc | Volume | data_origin | validation_status | Action |
|---|---|---|---|---|
| PND 4.02 (effets/produits/budgets) | 3 / 15 | html_reference | pending_metfpa_validation | Confronter PND officiel |
| Politique EFTP (axes/produits/actions) | 3 / 27 / 100 | html_reference | pending_metfpa_validation | Confronter `.docx` |
| Stratégie digitale (axes/OS/orientations) | 3 / 9 / 24 | html_reference | pending_metfpa_validation | Confronter `.pdf` |
| KPI digital (base/cible) | 12 | html_reference | pending | base « n.d. » fréquente |
| Budget annuel + financement État/Bailleur | 6 ans + split | html_reference | pending | Valider |
| Priorités P1-P4 | 4 | html_reference | pending | Valider |
| Cascade KPI | 7 | html_reference | pending | Compléter valeurs actuelles |
| Alignement (pnd_effet, ancres) | — | html_reference | pending | Valider |
| **Activités (avancement/exécuté/statut/alerte)** | 62 | **demo_tracking** | **demo** | ❌ jamais officiel |
| **Directions responsables** | 15 | **to_validate** | to_validate | Demander liste officielle |
| **Budget engagé / source par activité** | — | **missing** | missing | Demander nomenclature |
| Baseline/cible/preuve/fréquence par activité | — | missing | missing | Saisie M&E |

---

## 3. Note de réconciliation budgétaire (`requires_client_validation`)

**Problème** : les totaux des trois cadres ne sont pas directement comparables.

| Cadre | Période | Années | Total (M FCFA) | **Moyenne annuelle** | Portée |
|---|---|---|---|---|---|
| PND 4.02 | 2026-2030 | 5 | 1 202 137,6 | **240 427,5 /an** | Cadre sectoriel national moyen terme |
| Politique EFTP | 2026-2035 | 10 | 2 937 726,0 | **293 772,6 /an** | Politique sectorielle décennale |
| Stratégie digitale | 2026-2031 | 6 | 33 562,0 | **5 593,7 /an** | Sous-programme transformation numérique |
| *Période de recouvrement* | 2026-2030 | 5 | — | — | Base de comparaison normalisée |

**Lecture** : sur les totaux bruts, Politique ≈ 2,4× PND ; **rapporté à la moyenne annuelle, l'écart tombe à ~1,2×** → l'écart s'explique très majoritairement par l'horizon (10 ans vs 5 ans). Cohérence confirmée côté digital (DIG 33 562 ≈ produit PND `4.02.1.6` 32 912).

**Règle à implémenter dans la vue Budget consolidé** :
- Champs ajoutés par cadre : `period_start`, `period_end`, `period_years`, `budget_scope` (faits dans le seed).
- Annotation visible : *« Les montants relèvent d'horizons de planification différents et ne doivent pas être interprétés comme un écart direct sans normalisation par période et périmètre. »*
- Option de comparaison normalisée : **(a)** total · **(b)** moyenne annuelle · **(c)** période de recouvrement 2026-2030 · **(d)** cadre source.
- Ne PAS forcer la réconciliation → marqué **`requires_client_validation`**.

---

## 4. Workflow de validation de `seed_metfpa.json`

```
  [ seed_metfpa.json ]
   data_origin = html_reference
   validation_status = pending_metfpa_validation
   source_document = HTML + cross-check (.docx Politique, .pdf Digital)
            │
            ▼  Revue METFPA (relecture libellés + budgets vs documents officiels)
   ┌─────────────────────────────┐
   │  Décision de validation      │
   └─────────────────────────────┘
       │ validé                       │ corrections
       ▼                              ▼
  PROMOTION (sans ré-import total)   Annotations / corrections ciblées
   data_origin = official_reference   puis re-soumission
   validation_status = validated
   + validated_by, validated_at, validation_note
```
**Principe d'implémentation** : promotion *en place* (mise à jour des champs de statut au niveau enregistrement/cadre), pas de réimport manuel global. Granularité : par cadre (PND/POL/DIG) et idéalement par nœud. Toute promotion journalisée dans `audit_log`. Les activités démo restent `demo_tracking` indépendamment de la promotion des référentiels.

---

## 5. Wireframe « Pilotage Directeur » (Cabinet View)

```
┌ COCKPIT METFPA · PILOTAGE DIRECTEUR ─────────────────[ Exporter note PDF ]┐
│ ⚠ DONNÉES DE SUIVI — DÉMONSTRATION (non officielles)                       │
│ [Avanc. moyen 38%][Exéc. budg. 22%*][Alertes 9][Bloqués 4][Échéances<90j 6]│
│  * exécuté = demo_tracking — non officiel                                   │
├ ① DÉCISIONS REQUISES (arbitrage) ──────────────────────────────────────────┤
│  Sujet | Direction(to_validate) | Impact | Décision [éditable]              │
├ ② ALERTES & BLOCAGES ───────────────┬ ③ ÉCHÉANCES PROCHES ─────────────────┤
│ ●Critique ●Majeur ●Mineur · motif   │ Échéance | Activité | Avancement      │
├ ④ TOP 5 PLUS COÛTEUX ───────────────┴ ⑤ RISQUES (registre) ───────────────┤
├ ⑥ ARBITRAGE BUDGÉTAIRE — Prévu vs Exécuté par axe (exécuté = démo) ─────────┤
├ ⑦ NOTE DU DIRECTEUR [texte libre horodaté] ────────────────────────────────┤
└─────────────────────────────────────────────────────────────────────────────┘
Objectif : situation comprise < 2 min · décisions/risques en haut · libellés financiers démo signalés.
```

---

## 6. Wireframe « Accueil — Vue intégrée »

```
┌ COCKPIT METFPA INTÉGRÉ — PND 4.02 · Politique EFTP · Stratégie digitale ────┐
│ Bandeau cadres (avec horizon) :                                             │
│  PND 4.02 (2026-30, 5 ans) 1 202 Md │ Politique (2026-35, 10 ans) 2 938 Md  │
│  Digital (2026-31, 6 ans) 34 Md     │ [ⓘ horizons différents — voir budget] │
├ CHAÎNE DE RÉSULTATS (drill-down cliquable) ─────────────────────────────────┤
│  PND P4 ▶ Secteur 4.02 ▶ 3 Effets ▶ 15 Produits                             │
│    └ Politique : 3 Axes ▶ 27 Produits ▶ 100 Actions clés                    │
│        └ Digital : 3 Axes ▶ 9 OS ▶ 24 Orientations (ancrée 4.02.1.6 / 1.4)  │
├ KPIs GLOBAUX [Avanc.][Exéc.*][Taux*][Directions 15‡][Activités 62‡][Alertes]┤
│  * / ‡ = demo_tracking / to_validate (signalés)                             │
├ Budget par référentiel (annoté horizons) ─── Alertes actives ───────────────┤
├ Accès rapide : PND · Politique · Digital · Plan d'action · Alignement · KPI · Pilotage │
└─────────────────────────────────────────────────────────────────────────────┘
Bandeau permanent « données de suivi = démonstration » jusqu'à import/validation officiels.
```

---

## 7. Validations client requises avant Phase 1

| # | Élément à valider | Bloquant Go ? |
|---|---|---|
| V1 | Dictionnaire de données (entités + champs M&E + enums) | Oui |
| V2 | Schéma MongoDB cible (14 collections) | Oui |
| V3 | Gabarit d'import `IMPORT_METFPA.xlsx` (9 onglets) | Oui |
| V4 | Workflow de validation/promotion du seed | Oui |
| V5 | Logique de réconciliation budgétaire (annotation + comparaison normalisée) | Oui |
| V6 | Wireframe Cabinet View | Oui |
| V7 | Wireframe Accueil intégré | Oui |
| V8 | Liste officielle des **Directions** METFPA | Oui (sinon `to_validate`) |
| V9 | Nomenclature budgétaire : **engagé / source par activité** | Oui (sinon `missing`) |
| V10 | Relecture/validation du contenu de `seed_metfpa.json` vs documents officiels | Oui (promotion) |
| V11 | Confirmation de l'explication d'écart budgétaire (horizon) | Oui (`requires_client_validation`) |

**Décision Go** = V1-V7 + V10-V11 validés. V8-V9 peuvent rester en `to_validate`/`missing` (affichés comme tels) pour démarrer la Phase 1 sans bloquer, à condition de ne jamais présenter ces données comme officielles.

---

### Index des artefacts Phase 0
- `seed_metfpa.json` — données de référence classées (validation_status = pending_metfpa_validation)
- `PHASE0_PLAN_METFPA.md` — plan d'implémentation détaillé
- `PHASE0_DELIVERABLES_METFPA.md` — livrables #2-#8 détaillés
- `AUDIT_METFPA_Cockpit.md` — audit initial
- `GONOGO_REVIEW_METFPA.md` — le présent package
