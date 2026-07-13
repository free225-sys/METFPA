from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from .db import mdb, audit, FRAMEWORK_META, OVERLAP
from .auth import get_identity, require_role, assert_direction_scope, EDIT_ROLES, VALIDATE_ROLES
from .mission_rules import canonical_status

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
async def frameworks(identity: dict = Depends(get_identity)):
    return await _list("frameworks")


@metfpa_router.get("/pnd")
async def pnd(identity: dict = Depends(get_identity)):
    return {"framework": await mdb.frameworks.find_one({"key": "PND"}, {"_id": 0}),
            "nodes": await _list("pnd_nodes", sort="code")}


@metfpa_router.get("/politique")
async def politique(identity: dict = Depends(get_identity)):
    return {"framework": await mdb.frameworks.find_one({"key": "POL"}, {"_id": 0}),
            "nodes": await _list("pol_nodes", sort="code")}


@metfpa_router.get("/digital")
async def digital(identity: dict = Depends(get_identity)):
    return {"framework": await mdb.frameworks.find_one({"key": "DIG"}, {"_id": 0}),
            "nodes": await _list("dig_nodes", sort="code"),
            "profile": await mdb.dig_profile.find_one({}, {"_id": 0})}


@metfpa_router.get("/indicators")
async def indicators(identity: dict = Depends(get_identity)):
    return await _list("indicators")


@metfpa_router.get("/alignments")
async def alignments(identity: dict = Depends(get_identity)):
    return await _list("alignments", sort="pol_axe")


@metfpa_router.get("/activities")
async def activities(identity: dict = Depends(get_identity)):
    query = {"direction": identity.get("direction")} if identity["role"] == "direction_editor" else None
    return await _list("activities", q=query, sort="code_action")


@metfpa_router.get("/budget/consolidated")
async def budget_consolidated(identity: dict = Depends(get_identity)):
    fr = await _list("frameworks")
    items = []
    for f in fr:
        ov_years = max(0, min(f["period_end"], OVERLAP["end"]) - max(f["period_start"], OVERLAP["start"]) + 1)
        ov_value = round(f["annual_average"] * ov_years, 1)
        items.append({
            "framework": f["key"], "label": f["label"], "period": f"{f['period_start']}-{f['period_end']}",
            "period_start": f["period_start"], "period_end": f["period_end"], "period_years": f["period_years"],
            "total": f["total"], "annual_average": f["annual_average"],
            "overlap_years": ov_years, "overlap_value": ov_value,
            "budget_scope": f["budget_scope"], "source": f["source_document"],
            "data_origin": f["data_origin"], "validation_status": f["validation_status"]})
    return {"items": items, "overlap_period": OVERLAP, "annotation": NORM_NOTE,
            "overlap_note": ("Recouvrement 2026-2030 estimé = moyenne annuelle × années communes "
                             "(approximation, requiert validation client)."),
            "comparison_modes": ["total", "annual_average", "overlap_period", "source_framework"],
            "requires_client_validation": True}


def _quarter_end(echeance):
    """'YYYY-TQ' -> ISO date of quarter end. Returns None if unparsable."""
    try:
        y, q = echeance.split("-T")
        m, d = {"1": (3, 31), "2": (6, 30), "3": (9, 30), "4": (12, 31)}[q]
        return datetime(int(y), m, d, tzinfo=timezone.utc)
    except Exception:
        return None


@metfpa_router.get("/cabinet")
async def cabinet(identity: dict = Depends(require_role("dircab", "coordination", "me_validator", "admin"))):
    acts = await _list("activities")
    decisions = await _list("decisions")
    risks = await _list("risks")
    now = datetime.now(timezone.utc)
    horizon = now + timedelta(days=30)

    # ① Decisions requiring action (pending/draft, or overdue)
    def _dec_overdue(d):
        due = d.get("due_date")
        try:
            return bool(due) and datetime.fromisoformat(due.replace("Z", "+00:00")) < now and d.get("status") not in ("closed", "implemented", "rejected")
        except Exception:
            return False
    decisions_required = [d for d in decisions if d.get("status") in ("draft", "pending") or _dec_overdue(d)]

    # ② Alerts & blockers
    blocked = [a for a in acts if a.get("statut") in DEMO_STATUSES or (a.get("alerte") or "")]

    # ③ Deadlines: upcoming (<=30d) and overdue
    upcoming, overdue = [], []
    for a in acts:
        if a.get("statut") == "Achevé":
            continue
        qe = _quarter_end(a.get("echeance") or "")
        if not qe:
            continue
        if now <= qe <= horizon:
            upcoming.append(a)
        elif qe < now:
            overdue.append(a)
    upcoming.sort(key=lambda a: a.get("echeance") or "")
    overdue.sort(key=lambda a: a.get("echeance") or "")

    # ④ Risk exposure (critical/high first)
    SEV_RANK = {"critique": 0, "eleve": 1, "modere": 2, "faible": 3}
    open_risks = [r for r in risks if r.get("status") != "closed"]
    open_risks.sort(key=lambda r: (SEV_RANK.get(r.get("severity"), 9), -(r.get("risk_score") or 0)))
    critical_high = [r for r in open_risks if r.get("severity") in ("critique", "eleve")]

    # ⑤ Top planned-cost activities
    top_costly = sorted(acts, key=lambda a: a.get("budget_prevu") or 0, reverse=True)[:5]

    # Physical progress summary
    statut_counts = {}
    for a in acts:
        statut_counts[a.get("statut", "?")] = statut_counts.get(a.get("statut", "?"), 0) + 1
    avg_av = round(sum(a.get("avancement") or 0 for a in acts) / len(acts), 1) if acts else 0

    # Financial-data reliability summary
    fin_reliability = {
        "budget_prevu_present": sum(1 for a in acts if a.get("budget_prevu") is not None),
        "budget_execute_demo": sum(1 for a in acts if a.get("budget_execute") is not None),
        "budget_engage_missing": sum(1 for a in acts if a.get("budget_engage") is None),
        "source_financement_missing": sum(1 for a in acts if a.get("source_financement") is None),
        "directions_to_validate": sum(1 for a in acts if a.get("direction_status") == "to_validate"),
    }

    return {
        "kpis": {"activites": len(acts),
                 "alertes": len(blocked),
                 "bloques": sum(1 for a in acts if a.get("statut") == "Bloqué"),
                 "en_retard": sum(1 for a in acts if a.get("statut") == "En retard"),
                 "decisions_en_attente": len(decisions_required),
                 "risques_critiques": len(critical_high),
                 "avancement_moyen": avg_av},
        "decisions_required": decisions_required,
        "alerts": blocked[:20],
        "deadlines_upcoming": upcoming[:10],
        "deadlines_overdue": overdue[:10],
        "risks_critical_high": critical_high[:10],
        "top_costly": top_costly,
        "progress_summary": {"by_statut": statut_counts, "avancement_moyen": avg_av, "total": len(acts)},
        "financial_reliability": fin_reliability,
        "data_notice": "Indicateurs opérationnels (avancement/exécuté/statut/alerte) = demo_tracking, non officiels.",
    }


@metfpa_router.get("/activities/{aid}/history")
async def activity_history(aid: str, identity: dict = Depends(get_identity)):
    a = await mdb.activities.find_one({"id": aid}, {"_id": 0, "id": 1, "direction": 1})
    if not a:
        raise HTTPException(status_code=404, detail="Activité introuvable")
    # direction_editor may only read history of their own direction's activities
    if identity["role"] == "direction_editor":
        assert_direction_scope(identity, a.get("direction"))
    entries = await mdb.audit_log.find(
        {"entite": "activity", "entite_id": aid}, {"_id": 0}
    ).sort("horodatage", -1).to_list(500)
    return {"activity_id": aid, "count": len(entries), "entries": entries}


# ---------- Mutations (audited) ----------
class ActivityUpdate(BaseModel):
    avancement: Optional[int] = None
    statut: Optional[str] = None
    alerte: Optional[str] = None


@metfpa_router.put("/activities/{aid}")
async def update_activity(aid: str, payload: ActivityUpdate, identity: dict = Depends(require_role(*EDIT_ROLES))):
    a = await mdb.activities.find_one({"id": aid}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Activité introuvable")
    assert_direction_scope(identity, a.get("direction"))
    x_user = identity["email"]
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not data:
        return a
    # Keep the additive mission contract in sync with the legacy activity API.
    if "avancement" in data:
        data["progress"] = data["avancement"]
    if "statut" in data:
        data["status"] = canonical_status(data["statut"])
    if "alerte" in data:
        data["blocker"] = data["alerte"]
    data["derniere_maj"] = datetime.now(timezone.utc).isoformat()
    data["last_update"] = data["derniere_maj"]
    await mdb.activities.update_one({"id": aid}, {"$set": data})
    await audit("update_activity", "activity", aid,
                avant={k: a.get(k) for k in data}, apres=data, user=x_user)
    return await mdb.activities.find_one({"id": aid}, {"_id": 0})


class PromoteInput(BaseModel):
    framework: str            # PND | POL | DIG
    validated_by: str
    validation_note: str = ""


@metfpa_router.post("/admin/validate")
async def promote_framework(payload: PromoteInput, identity: dict = Depends(require_role(*VALIDATE_ROLES))):
    """Promotion workflow (Validateur M&E / Admin only). Promotes ONLY when
    explicitly invoked with framework + validated_by. Never promotes automatically."""
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
                avant={"validation_status": "pending_metfpa_validation"}, apres=promo, user=identity["email"])
    return {"framework": payload.framework, "frameworks_updated": r1.modified_count,
            "nodes_updated": r2.modified_count, "validation_status": "validated"}


@metfpa_router.get("/audit-log")
async def audit_log(identity: dict = Depends(require_role("me_validator", "admin"))):
    return await _list("audit_log")
