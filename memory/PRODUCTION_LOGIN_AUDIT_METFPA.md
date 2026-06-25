# AUDIT DIAGNOSTIC — Échec de connexion production · Cockpit METFPA (lecture seule)

> Production : `https://etat-progression.emergent.host` · Preview : `https://etat-progression.preview.emergentagent.com`
> Symptôme UI : « Une erreur serveur empêche actuellement la connexion. » (= message 500 du frontend).
> **Aucune modification effectuée** (code, env, base, déploiement). Audit lecture seule. Correctif en attente d'approbation.

---

## A. Verdict exécutif

- **Cause racine** : en production, le module METFPA effectue ses opérations MongoDB sur une **base de données non autorisée** (la 2ᵉ base `metfpa_dev` / `*_metfpa`), alors que la base managée de production n'autorise l'utilisateur de connexion que pour **une seule base** (`DB_NAME`). Toute requête METFPA touchant la base → erreur d'autorisation → **HTTP 500**.
- **Composant affecté** : couche d'accès aux données METFPA (`backend/metfpa/db.py`) + **configuration d'environnement de production** (`METFPA_DB_NAME`).
- **Niveau de confiance** : **ÉLEVÉ.** Le correctif de code déployé (`db.py`) bascule sur la base autorisée `DB_NAME` **uniquement si `METFPA_DB_NAME` est vide/absent**. Or la production échoue encore sur les seules opérations METFPA → la production cible toujours la 2ᵉ base, donc soit `METFPA_DB_NAME` est encore défini (`metfpa_dev`) dans l'environnement de production, soit le backend déployé ne contient pas encore le correctif.

## B. Preuves

Requêtes directes (curl) contre la **production**, après redéploiement :

| Endpoint | Touche la base | Statut | Interprétation |
|---|---|---|---|
| `GET /api/` | non | **200** | App vivante |
| `GET /openapi.json` | non | **200** | FastAPI démarré |
| `POST /api/auth/login` (legacy) | base primaire `DB_NAME` | **401** | Base primaire **accessible & autorisée** |
| `GET /api/metfpa/frameworks` | (auth avant DB) | **401** | Auth OK, n'atteint pas la base |
| `GET /api/metfpa/health` | **base METFPA** | **500** | Échec sur la base METFPA |
| `POST /api/metfpa/auth/login` | **base METFPA** | **500** | Échec sur la base METFPA |
| `OPTIONS /api/metfpa/auth/login` (préflight) | — | **200**, `Access-Control-Allow-Origin: https://etat-progression.emergent.host` | CORS **fonctionnel** |

**Logique d'élimination** : seule la base METFPA échoue ; la base primaire fonctionne sur la **même** `MONGO_URL`. `/health` ne fait qu'un `count_documents` (aucun JWT, aucun bcrypt) → l'erreur est purement **connexion/autorisation base**, pas auth ni JWT ni bcrypt. `curl` (sans navigateur) obtient 500 → **CORS exclu**.

> Logs runtime de production : non récupérables via l'outil disponible (analyse statique uniquement). L'exception attendue est une `pymongo.errors.OperationFailure` « not authorized on metfpa_dev to execute command » (code 13). Confirmation possible par les logs Emergent.

## C. Classification

**Deployment environment mismatch** (variable d'environnement) **+ database connectivity defect** (autorisation sur une base non autorisée).
→ Ce n'est PAS : défaut frontend, défaut de démarrage backend, défaut de proxy/routage, ni défaut CORS.

## D. Comparaison preview ↔ production

| Élément | Preview | Production |
|---|---|---|
| Frontend `REACT_APP_BACKEND_URL` | preview URL ✅ | pointe correctement vers `…emergent.host` (UI charge, 401/500 reçus) ✅ |
| Base primaire (`DB_NAME`) | `test_database`, accessible | accessible (legacy 401) ✅ |
| Base METFPA | `test_database` + préfixe `metfpa_` (corrigé), **200** | cible `metfpa_dev` **non autorisée** → **500** ❌ |
| `METFPA_DB_NAME` (.env preview) | `""` (→ fallback `DB_NAME`) | **probablement `metfpa_dev`** (héritée du 1er déploiement) ou backend sans correctif |
| Mongo (autorisation) | local, multi-bases libres | managé, **1 seule base autorisée** |
| Seed au démarrage | OK (frameworks 3, activities 62, users 4) | non atteint (échec base) |

La divergence clé : Mongo local (preview) autorise n'importe quelle base ; Mongo managé (production) n'autorise que `DB_NAME`. La 2ᵉ base est l'angle mort.

## E. Plan de remédiation (en attente d'approbation)

**Correctif minimal et durable (recommandé — CODE)** : supprimer l'override `METFPA_DB_NAME` et **toujours** utiliser la base autorisée `DB_NAME` avec le préfixe `metfpa_`. Ainsi, aucune configuration d'environnement ne peut plus rediriger METFPA vers une 2ᵉ base non autorisée.
- Fichiers : `backend/metfpa/db.py` (1 ligne : `METFPA_DB_NAME = os.environ["DB_NAME"]`, retirer le `os.environ.get("METFPA_DB_NAME") or`), et `backend/.env` (retirer la clé `METFPA_DB_NAME`).
- Effet : METFPA = collections `metfpa_*` dans `DB_NAME` (déjà validé sur preview, collections legacy intactes).

**Alternative (SANS code, action utilisateur)** : dans la configuration d'environnement de la **production**, **supprimer** `METFPA_DB_NAME` (ou la définir égale à la valeur de `DB_NAME`). Puis redéployer.

- **Redéploiement requis ?** **OUI** (dans les deux cas).
- **Seed de base requis ?** **NON** — le démarrage seed automatiquement les collections `metfpa_*` (idempotent). Aucune réinitialisation de base.
- **Plan de rollback** : trivial — réintroduire la ligne `os.environ.get("METFPA_DB_NAME") or …`. Aucune donnée détruite (collections préfixées ; legacy jamais touchée).
- **Note CORS** : non lié à l'incident (préflight 200). Si souhaité par hygiène, élargir `CORS_ORIGINS` pour inclure le domaine de production — **optionnel**, sans effet sur ce 500.

## F. Liste de validation (après correctif approuvé)
1. `GET https://etat-progression.emergent.host/api/metfpa/health` → **200**.
2. `POST /api/metfpa/auth/login` (admin@metfpa.ci) → **200** + JWT retourné.
3. Endpoint protégé accessible avec le JWT (ex. `/api/metfpa/cabinet`).
4. Aucune erreur console navigateur ; aucun 5xx backend.
5. Connexion des 4 rôles + landing corrects.
6. Comportement du **preview inchangé** (régression nulle).

---
*Fin de l'audit. Aucune modification appliquée. En attente de votre approbation pour le correctif (option recommandée : retrait de l'override `METFPA_DB_NAME`).*
