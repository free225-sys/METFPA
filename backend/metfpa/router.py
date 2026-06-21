from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from .db import mdb, audit, FRAMEWORK_META, OVERLAP

metfpa_router = APIRouter(prefix="/api/metfpa")

NORM_NOTE = ("Les montants relèvent d'horizons de planification différents et ne doivent pas être "
             "interprétés comme un écart direct sans normalisation par période et périmètre.")
DEMO_STATUSES = {"En retard", "Bloqué"}


async def _list(coll, q=None, sort=None):
    cur = mdb[coll].find(q or {}, {"_id": 0})
    if sort:
        cur = cur.sort(sort)
    return await cur.to_list(5000)


@metfpa_router.get("/health")
async def health():
    return {"db": mdb.name, "frameworks": await mdb.frameworks.count_documents({}),
            "pnd_nodes": await mdb.pnd_nodes.count_documents({}),
            "pol_nodes": await mdb.pol_nodes.count_documents({}),
            "dig_nodes": await mdb.dig_nodes.count_documents({}),
            "indicators": await mdb.indicators.count_documents({}),
            "alignments": await mdb.alignments.count_documents({}),
            "activities": await mdb.activities.count_documents({})}


@metfpa_router.get("/frameworks")
async def frameworks():
    return await _list("frameworks")


@metfpa_router.get("/pnd")
async def pnd():
    return {"framework": await mdb.frameworks.find_one({"key": "PND"}, {"_id": 0}),
            "nodes": await _list("pnd_nodes", sort="code")}


@metfpa_router.get("/politique")
async def politique():
    return {"framework": await mdb.frameworks.find_one({"key": "POL"}, {"_id": 0}),
            "nodes": await _list("pol_nodes", sort="code")}


@metfpa_router.get("/digital")
async def digital():
    return {"framework": await mdb.frameworks.find_one({"key": "DIG"}, {"_id": 0}),
            "nodes": await _list("dig_nodes", sort="code"),
            "profile": await mdb.dig_profile.find_one({}, {"_id": 0})}


@metfpa_router.get("/indicators")
async def indicators():
    return await _list("indicators")


@metfpa_router.get("/alignments")
async def alignments():
    return await _list("alignments", sort="pol_axe")


@metfpa_router.get("/activities")
async def activities():
    return await _list("activities", sort="code_action")


@metfpa_router.get("/budget/consolidated")
async def budget_consolidated():
    fr = await _list("frameworks")
    items = [{"framework": f["key"], "label": f["label"], "period": f"{f['period_start']}-{f['period_end']}",
              "period_start": f["period_start"], "period_end": f["period_end"], "period_years": f["period_years"],
              "total": f["total"], "annual_average": f["annual_average"], "budget_scope": f["budget_scope"],
              "source": f["source_document"], "data_origin": f["data_origin"],
              "validation_status": f["validation_status"]} for f in fr]
    return {"items": items, "overlap_period": OVERLAP, "annotation": NORM_NOTE,
            "comparison_modes": ["total", "annual_average", "overlap_period", "source_framework"],
            "requires_client_validation": True}


@metfpa_router.get("/cabinet")
async def cabinet():
    acts = await _list("activities")
    alerts = [a for a in acts if a.get("statut") in DEMO_STATUSES or (a.get("alerte") or "")]
    echeances = sorted([a for a in acts if a.get("statut") != "Achevé"], key=lambda a: a.get("echeance") or "")[:8]
    top_costly = sorted(acts, key=lambda a: a.get("budget_prevu") or 0, reverse=True)[:5]
    return {
        "kpis": {"activites": len(acts),
                 "alertes": len(alerts),
                 "bloques": sum(1 for a in acts if a.get("statut") == "Bloqué"),
                 "en_retard": sum(1 for a in acts if a.get("statut") == "En retard")},
        "decisions_required": await _list("decisions"),  # placeholder collection (empty in S1)
        "alerts": alerts[:20],
        "echeances": echeances,
        "top_costly": top_costly,
        "data_notice": "Indicateurs opérationnels (avancement/exécuté/statut/alerte) = demo_tracking, non officiels.",
    }


# ---------- Mutations (audited) ----------
class ActivityUpdate(BaseModel):
    avancement: Optional[int] = None
    statut: Optional[str] = None
    alerte: Optional[str] = None


@metfpa_router.put("/activities/{aid}")
async def update_activity(aid: str, payload: ActivityUpdate, x_user: str = Header(default="dev")):
    a = await mdb.activities.find_one({"id": aid}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Activité introuvable")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not data:
        return a
    data["derniere_maj"] = datetime.now(timezone.utc).isoformat()
    await mdb.activities.update_one({"id": aid}, {"$set": data})
    await audit("update_activity", "activity", aid,
                avant={k: a.get(k) for k in data}, apres=data, user=x_user)
    return await mdb.activities.find_one({"id": aid}, {"_id": 0})


class PromoteInput(BaseModel):
    framework: str            # PND | POL | DIG
    validated_by: str
    validation_note: str = ""


@metfpa_router.post("/admin/validate")
async def promote_framework(payload: PromoteInput, x_user: str = Header(default="dev")):
    """Promotion workflow. Promotes ONLY when explicitly invoked with framework +
    validated_by. Never promotes automatically."""
    if payload.framework not in FRAMEWORK_META:
        raise HTTPException(status_code=400, detail="framework invalide (PND|POL|DIG)")
    if not payload.validated_by.strip():
        raise HTTPException(status_code=400, detail="validated_by requis pour toute promotion")
    coll = {"PND": "pnd_nodes", "POL": "pol_nodes", "DIG": "dig_nodes"}[payload.framework]
    promo = {"data_origin": "official_reference", "validation_status": "validated",
             "validated_by": payload.validated_by, "validated_at": datetime.now(timezone.utc).isoformat(),
             "validation_note": payload.validation_note}
    r1 = await mdb.frameworks.update_one({"key": payload.framework}, {"$set": promo})
    r2 = await mdb[coll].update_many({}, {"$set": promo})
    await audit("promote_framework", "framework", payload.framework,
                avant={"validation_status": "pending_metfpa_validation"}, apres=promo, user=x_user)
    return {"framework": payload.framework, "frameworks_updated": r1.modified_count,
            "nodes_updated": r2.modified_count, "validation_status": "validated"}


@metfpa_router.get("/audit-log")
async def audit_log():
    return await _list("audit_log")
