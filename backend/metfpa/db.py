import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
METFPA_DB_NAME = os.environ.get("METFPA_DB_NAME", os.environ["DB_NAME"] + "_metfpa")
mdb = _client[METFPA_DB_NAME]

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
