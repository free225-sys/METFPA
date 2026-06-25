import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])

# Managed/production MongoDB authorizes a SINGLE database (DB_NAME). METFPA
# therefore ALWAYS uses that authorized database and namespaces every collection
# under METFPA_PREFIX, so legacy collections (actions, users) are never touched
# and no second (unauthorized) database is ever targeted. Any stale
# METFPA_DB_NAME runtime variable is intentionally ignored.
METFPA_PREFIX = "metfpa_"
METFPA_DB_NAME = os.environ["DB_NAME"]  # fail-fast if missing; no hardcoded fallback
_db = _client[METFPA_DB_NAME]


class _PrefixedDB:
    """Transparent collection-name prefixing inside the authorized database.

    `mdb.users` and `mdb["users"]` both resolve to the `metfpa_users` collection
    in DB_NAME, keeping METFPA data isolated from legacy collections without a
    separate database."""

    def __init__(self, db, prefix):
        object.__setattr__(self, "_db", db)
        object.__setattr__(self, "_prefix", prefix)

    @property
    def name(self):
        return self._db.name

    def __getitem__(self, collection):
        return self._db[self._prefix + collection]

    def __getattr__(self, collection):
        return self._db[self._prefix + collection]


mdb = _PrefixedDB(_db, METFPA_PREFIX)

# Framework planning metadata (period-normalized budget rule)
FRAMEWORK_META = {
    "PND": {"key": "PND", "label": "PND 4.02 (résultat sectoriel EFTP)",
            "period_start": 2026, "period_end": 2030, "period_years": 5,
            "budget_scope": "Cadre sectoriel national à moyen terme"},
    "POL": {"key": "POL", "label": "Politique EFTP 2026-2035",
            "period_start": 2026, "period_end": 2035, "period_years": 10,
            "budget_scope": "Politique sectorielle décennale"},
    "DIG": {"key": "DIG", "label": "Stratégie de digitalisation 2026-2031",
            "period_start": 2026, "period_end": 2031, "period_years": 6,
            "budget_scope": "Sous-programme de transformation numérique"},
}
OVERLAP = {"start": 2026, "end": 2030, "note": "Période commune aux trois cadres"}


async def audit(action, entite, entite_id=None, avant=None, apres=None, user="système"):
    await mdb.audit_log.insert_one({
        "user": user, "action": action, "entite": entite, "entite_id": entite_id,
        "avant": avant, "apres": apres,
        "horodatage": datetime.now(timezone.utc).isoformat(),
    })
