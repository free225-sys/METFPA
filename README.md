# METFPA — Dashboard opérationnel

Application de pilotage du Ministère de l'Enseignement Technique, de la
Formation Professionnelle et de l'Apprentissage. Le frontend React fournit les
vues Administrateur, Directeur de cabinet et Direction d'agence. Le backend
FastAPI stocke les missions, mises à jour, alertes, décisions et réunions dans
MongoDB.

## Structure

- `frontend/` : React + CRACO, construit avec Yarn 1.
- `backend/` : API FastAPI et modules métier METFPA.
- `memory/seed_metfpa.json` : données d'initialisation suivies par Git.
- `.emergent/emergent.yml` : métadonnées de l'environnement Emergent.
- `netlify.toml` : build et routage SPA du frontend.

## Variables de déploiement

Backend obligatoires :

- `MONGO_URL` : URI de connexion MongoDB.
- `DB_NAME` : nom de la base MongoDB.
- `JWT_SECRET` : secret de signature des jetons d'authentification.

Frontend obligatoire au moment du build :

- `REACT_APP_BACKEND_URL` : URL publique du backend, sans suffixe `/api`.

Variables backend optionnelles :

- `CORS_ORIGINS` : origines additionnelles, séparées par des virgules.
- `CORS_ORIGIN_REGEX` : expression régulière d'origines autorisées.
- `METFPA_SEED_PASSWORD` : mot de passe initial des comptes de démonstration.
- `SEED_METFPA_PATH` : chemin du fichier de seed ; par défaut
  `/app/memory/seed_metfpa.json`.
- `METFPA_IMPORT_MAX_BYTES` et `METFPA_STALE_UPDATE_DAYS` : réglages métier.
- `LEGACY_PND_ENABLED` : active l'ancienne API PND, désactivée par défaut.
  `ADMIN_EMAIL` et `ADMIN_PASSWORD` ne sont requis que dans ce mode.

Des modèles sans secret sont fournis dans `backend/.env.example` et
`frontend/.env.example`. Les vrais fichiers `.env` restent ignorés par Git.

## Build et vérifications

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r backend/requirements-dev.txt
.venv/Scripts/python -m pytest -q backend/tests/test_mission_rules_unit.py backend/tests/test_operations_scope_unit.py backend/tests/test_decision_arbitration_roles_unit.py backend/tests/test_admin_user_creation_unit.py

cd frontend
yarn install --frozen-lockfile
yarn build
```

Le backend de production installe uniquement `backend/requirements.txt`. Les
dépendances de test sont isolées dans `backend/requirements-dev.txt` afin de ne
pas alourdir les conteneurs de déploiement.
