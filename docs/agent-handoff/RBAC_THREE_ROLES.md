# Modèle d'accès simplifié — trois rôles

Le dashboard METFPA utilise désormais trois rôles canoniques.

| Rôle technique | Libellé | Responsabilité |
|---|---|---|
| `admin` | Administrateur système | Utilisateurs, attribution des rôles et agences, outils techniques, support global et audit |
| `dircab` | DIRCAB / Cabinet décisionnel | Cockpit global, coordination, validation métier, réunions, relances, décisions, reporting et arbitrage final |
| `agency_director` | Direction d'agence | Consultation et mise à jour des missions, décisions, risques et livrables de sa seule agence |

## Migration automatique

Au démarrage, les anciens rôles sont convertis sans supprimer de compte :

- `direction_editor` → `agency_director` ;
- `coordination` → `dircab` ;
- `me_validator` → `dircab`.

Les jetons existants restent contrôlés à chaque requête par une relecture de l'utilisateur en base. Toute identité héritée est normalisée vers l'un des trois rôles.

## Règles invariantes

- L'arbitrage final reste réservé à `dircab`.
- `agency_director` doit obligatoirement être rattaché à une agence/direction.
- `agency_director` ne peut ni lire ni modifier une ressource d'une autre agence.
- `admin` ne peut pas retirer ou désactiver le dernier administrateur actif.
- Les opérations sensibles restent auditées.

## Comptes de démonstration

Mot de passe par défaut : `Metfpa@2026Demo` (remplaçable par `METFPA_SEED_PASSWORD`).

- `admin@metfpa.ci` — Administrateur ;
- `dircab@metfpa.ci` — Directeur de cabinet ;
- `direction.daf@metfpa.ci` — Direction d'agence DAF.
