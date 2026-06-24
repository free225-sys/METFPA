# RAPPORT — Correction de l'échec de connexion (environnement déployé) · Cockpit METFPA

> Incident : échec de connexion en production (`https://etat-progression.emergent.host/login`), message visible « Une erreur est survenue. Veuillez réessayer. »
> Nature : problème **infrastructure/base de données** côté déploiement (pas un bug de logique d'authentification).
> Aucune donnée de production non liée n'a été modifiée. Aucun secret/jeton/mot de passe n'est exposé dans ce rapport.

## 1. Cause racine (root cause)

Le module METFPA utilisait une **deuxième base de données MongoDB** (`METFPA_DB_NAME`, par défaut `DB_NAME + "_metfpa"`) sur la même `MONGO_URL`. En **production**, la base managée n'autorise l'utilisateur de connexion que pour **une seule base** (`DB_NAME`). Toute requête METFPA visant la seconde base échouait (autorisation refusée) → **HTTP 500** sur tout endpoint touchant la base METFPA, y compris `/api/metfpa/auth/login`. Le frontend affichait alors son message générique de repli.

### Preuves (production, via curl)
| Requête | Touche la base | Résultat AVANT |
|---|---|---|
| `GET /api/` (statique) | non | **200** (app vivante) |
| `POST /api/auth/login` (legacy) | base primaire `DB_NAME` | **401** (base primaire OK) |
| `GET /api/metfpa/health` | base METFPA (2ᵉ base) | **500** |
| `POST /api/metfpa/auth/login` | base METFPA (2ᵉ base) | **500** |
| `OPTIONS` préflight CORS | — | **200**, en-têtes corrects |

→ Seule la **2ᵉ base** échouait ; la base primaire fonctionnait sur la même `MONGO_URL`. CORS écarté (préflight 200, `curl` sans CORS obtient aussi 500). C'est donc un défaut d'**autorisation de base de données**, pas d'authentification ni de CORS.

## 2. Correctif

METFPA partage désormais l'**unique base autorisée `DB_NAME`**, en **préfixant toutes ses collections** par `metfpa_` (proxy transparent dans `backend/metfpa/db.py`). Les collections legacy (`actions`, `users`) ne sont **jamais** touchées ; aucune seconde base n'est requise.

- `backend/metfpa/db.py` : nouveau `_PrefixedDB` ; `mdb.users` / `mdb["users"]` → `metfpa_users` dans `DB_NAME`. `METFPA_DB_NAME` reste un override explicite ; à défaut → `DB_NAME`.
- `backend/.env` (preview) : `METFPA_DB_NAME=""` pour exécuter exactement le chemin de production (base `DB_NAME` partagée + préfixe).
- `frontend/src/context/AuthContext.js` : messages d'erreur de connexion spécifiques (401/403/422/500/réseau) — fin du message générique systématique.

Contraintes respectées : authentification non affaiblie, validation JWT intacte, aucun mot de passe en dur, RBAC + journal d'audit préservés, **aucune réinitialisation de base**, données legacy/production non modifiées.

## 3. Configuration frontend ↔ backend
- Frontend : `process.env.REACT_APP_BACKEND_URL` (aucune URL en dur, aucun localhost, routage `/api` correct).
- Endpoint testé : `POST /api/metfpa/auth/login`. Avant le correctif : **500** ; après : **200**.

## 4. Vérification base & utilisateurs (après correctif, preview)
- Base utilisée : `test_database` (= `DB_NAME`), collections `metfpa_*`.
- Seed au démarrage : `frameworks 3, pnd 20, pol 130, dig 12, indicators 19, alignments 3, activities 62` ; **users seeded: 4**.
- `admin@metfpa.ci` : présent, `active=true`, rôle `admin`, `password_hash` bcrypt (jamais en clair), vérification bcrypt OK.

## 5. Variables d'environnement vérifiées (noms uniquement)
`MONGO_URL` ✅, `DB_NAME` ✅, `METFPA_DB_NAME` (override optionnel) ✅, `JWT_SECRET` ✅, `METFPA_SEED_PASSWORD` (fallback documenté en place) ✅.
Algorithme JWT : HS256 · TTL : 8 h · bcrypt : compatible · schéma de login : `{access_token, token_type, user{...}}` · compte désactivé → 401.

## 6. CORS / reverse-proxy
Préflight production `OPTIONS /api/metfpa/auth/login` → **200** avec `Access-Control-Allow-Origin: https://etat-progression.emergent.host`, méthodes/headers/credentials corrects. CORS **fonctionnel** — non impliqué dans l'incident. (Aucune ouverture CORS globale effectuée.)

## 7. Gestion d'erreurs frontend (Section 7)
401 → « Adresse e-mail ou mot de passe incorrect. » · 403 → « Ce compte n'est pas autorisé à accéder au cockpit. » · 422 → « Les informations saisies sont invalides. » · 500 → « Une erreur serveur empêche actuellement la connexion. » · réseau → « Le service d'authentification est momentanément indisponible. » Aucune trace serveur exposée.

## 8. Tests de régression (4 rôles) — preview public URL
`testing_agent iteration_10.json` → **100 % (6/6 domaines), `retest_needed: false`** :
1. Connexions des 4 rôles + landing + sidebar par rôle ✅
2. Message 401 spécifique (mauvais mdp + email inconnu) ✅
3. Intégrité des données après migration (KPIs, 62 activités, budgets « milliards FCFA », 19 indicateurs, décisions/risques) ✅
4. RBAC (cabinet → access-denied sur /admin-users ; portefeuille DAF restreint) ✅
5. Session persistée après rechargement + logout ✅
6. Pages référentiels + accueil chargent ✅

Vérifications complémentaires (curl) : mauvais mdp → 401 ; email inconnu → 401 ; legacy `ministre@pnd.ci` → 200 (collections legacy intactes) ; aucun secret/jeton dans les logs.

## 9. Commits
- Frontend déployé (avant) / Backend déployé (avant) : version en production antérieure au correctif (renvoyait 500).
- Commit du correctif (preview) : `f09d64c` · branche `phase1-s1-metfpa`.

## 10. ⚠️ Action requise — Redéploiement
Le correctif est validé sur le **preview public** (`https://etat-progression.preview.emergentagent.com`). La **production** (`https://etat-progression.emergent.host`) exécute encore l'ancien code (500) jusqu'à un **redéploiement**. Après redéploiement, le démarrage créera les collections `metfpa_*` dans `DB_NAME` et (re)seedera les 4 comptes ; la connexion fonctionnera.

Vérification post-redéploiement (production) :
```
curl -s -o /dev/null -w "%{http_code}\n" https://etat-progression.emergent.host/api/metfpa/health   # attendu 200
```

## 11. Confirmation
Aucune donnée de production non liée modifiée ; collections legacy (`actions`, `users`) intactes (login legacy 200 vérifié) ; RBAC et audit préservés ; aucune base réinitialisée.
