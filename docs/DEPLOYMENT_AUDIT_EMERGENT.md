# Audit technique du redéploiement Emergent

Date : 19 juillet 2026

Branche auditée : `main`

Commit de départ : `450d08d`

Job Emergent déclaré : `cd09f9a9-3188-476f-9023-88b8ce0ff034`

## Conclusion

Deux risques réels existaient dans le dépôt : un manifeste Python beaucoup trop
large et non reproductible sur la cible ARM, et l'initialisation systématique
d'une API legacy pourtant désactivée. Ils ont été corrigés et couverts par les
vérifications décrites ci-dessous.

Après correction, le frontend se construit depuis un lockfile dans un dossier
vierge, les dépendances backend se résolvent pour Linux ARM/Python 3.11, les
tests passent et FastAPI charge les routes requises. Le dépôt est donc prêt au
déploiement. Si Emergent renvoie encore une réponse `Internal Server Error`
avant de créer un job et sans journal de build, l'échec se situe très
probablement dans l'API de contrôle ou le provisioning Emergent, et non dans le
code applicatif.

## Problèmes trouvés et corrections

### 1. Manifeste backend non reproductible et surdimensionné

`backend/requirements.txt` était un gel complet de 128 paquets, incluant des
outils de développement, des SDK IA/cloud et des bibliothèques lourdes non
importées par l'application. Il contenait notamment
`emergentintegrations==0.2.0`, indisponible lors d'une résolution propre de
wheels Linux ARM/Python 3.11, ainsi qu'une wheel privée `litellm`.

Impacts possibles : échec de résolution, dépendance à un dépôt privé, délai de
build ou dépassement mémoire du conteneur de déploiement.

Correction :

- réduction à 14 dépendances runtime effectivement utilisées ;
- conservation des versions applicatives déjà déclarées ;
- déplacement de `pytest`, `pytest-asyncio` et `httpx` dans
  `backend/requirements-dev.txt`.

### 2. Initialisation legacy exécutée alors que ses routes étaient désactivées

Avec `LEGACY_PND_ENABLED=false` (valeur par défaut), l'ancien routeur PND
n'était pas publié, mais son hook de démarrage créait toujours ses index,
exigeait `ADMIN_EMAIL` et `ADMIN_PASSWORD`, puis lançait son seed. Une variable
legacy absente pouvait donc faire échouer le démarrage du conteneur METFPA.

Correction : retour immédiat du hook legacy lorsqu'il est désactivé. Un test
unitaire vérifie désormais que ni la base legacy ni ses identifiants ne sont
requis dans ce mode.

### 3. Lockfile racine orphelin

Le dépôt contenait un `yarn.lock` racine vide alors qu'il n'existe aucun
`package.json` racine. Le vrai projet JavaScript et son lockfile complet se
trouvent dans `frontend/`. Ce fichier pouvait rendre la détection du monorepo
ambiguë pour un builder automatique.

Correction : suppression du lockfile racine ; `frontend/yarn.lock` est
conservé et validé avec `--frozen-lockfile`.

### 4. Contrat de configuration absent

Le README ne décrivait ni l'architecture ni les variables requises. Aucun
modèle `.env.example` n'était suivi par Git.

Correction : documentation des commandes et variables, ajout de modèles
backend/frontend sans secret, et exceptions ciblées dans `.gitignore`.

## Configuration vérifiée

- `.emergent/emergent.yml` : syntaxe JSON valide, également valide en YAML ;
  image ARM déclarée et identifiant de job présents.
- `netlify.toml` : base `frontend`, commande `npm run build`, publication de
  `frontend/build` et redirection SPA cohérentes.
- `frontend/package.json` : scripts CRACO présents et lockfile Yarn 1 cohérent.
- `memory/seed_metfpa.json` : fichier par défaut présent et suivi par Git.
- CORS : origines Netlify de production et deploy previews couvertes par la
  regex actuelle ; origines additionnelles configurables.

Variables obligatoires :

- backend : `MONGO_URL`, `DB_NAME`, `JWT_SECRET` ;
- frontend au build : `REACT_APP_BACKEND_URL`.

`ADMIN_EMAIL` et `ADMIN_PASSWORD` ne sont maintenant nécessaires que si
`LEGACY_PND_ENABLED=true`.

## Revue des changements récents

Les commits postérieurs au MVP portent sur la consolidation RBAC à trois rôles,
la création d'utilisateurs, les corrections UX et la documentation de handoff.
Ils n'ont modifié ni les manifests de dépendances, ni les scripts de build, ni
`.emergent/emergent.yml`, ni `netlify.toml`.

Le changement d'infrastructure applicative le plus proche est le correctif CORS
`0e09dc2`. Il élargit correctement l'accès aux deploy previews Netlify et ne
peut pas provoquer une exception de l'API de déploiement Emergent.

## Vérifications exécutées

### Frontend

- installation dans un dossier vierge :
  `yarn@1.22.22 install --frozen-lockfile --non-interactive` — succès ;
- build production avec une URL backend explicite — succès en 153,60 s ;
- résultat : bundle JS gzip 199,35 kB, CSS gzip 13,94 kB ;
- tests React : 6/6 réussis.

Les avertissements de peer-dependencies de `react-day-picker`, Babel, TypeScript
et `react-is` sont non bloquants et n'empêchent ni l'installation ni le build.

### Backend

- installation dans un venv vierge — succès ;
- `pip check` — aucune dépendance cassée ;
- résolution binaire Linux `manylinux2014_aarch64`, CPython 3.11 — succès ;
- compilation syntaxique de `backend/` — succès ;
- tests unitaires ciblés : 15/15 réussis ;
- import FastAPI sans identifiants admin legacy — succès ;
- routes chargées : 50 ; endpoints critiques présents :
  - `/api/metfpa/auth/login` ;
  - `/api/metfpa/admin/users` ;
  - `/api/metfpa/admin/directions` ;
  - `/api/metfpa/director-dashboard`.

Les avertissements `on_event` de FastAPI sont des dépréciations, pas des
erreurs de démarrage. Leur migration vers `lifespan` peut être planifiée hors de
ce correctif de déploiement.

## Évaluation finale

État du dépôt après corrections : **prêt au déploiement**.

Diagnostic si l'erreur persiste : **incident externe probable** lorsque la
plateforme répond immédiatement `Internal Server Error`, sans identifiant de
nouveau job ni étape de build. Transmettre à Emergent l'identifiant de job
ci-dessus, l'heure exacte de la tentative, et demander les journaux de l'API de
déploiement/provisioning.

Références plateforme :

- <https://help.emergent.sh/platform-documentation>
- <https://help.emergent.sh/deployment-related-issues>
