"""METFPA Sprint S3B — Decision & Risk registers (CRUD, audited).
Isolated in METFPA_DB_NAME. Records without an official source are classified
demo_tracking / to_validate. No invented official data."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field, field_validator

from .db import mdb, audit

registers_router = APIRouter(prefix="/api/metfpa")

DECISION_STATUSES = ["draft", "pending", "approved", "rejected", "implemented", "closed"]
DECISION_TYPES = ["arbitrage", "validation", "orientation", "ressource", "autre"]
RISK_STATUSES = ["open", "monitored", "mitigating", "closed"]
RISK_CATEGORIES = ["strategique", "operationnel", "financier", "gouvernance", "technique", "externe"]
PRIORITIES = ["faible", "moyenne", "haute", "critique"]

DEFAULT_ORIGIN = {"data_origin": "demo_tracking", "validation_status": "to_validate"}


def _now():
    return datetime.now(timezone.utc).isoformat()


def severity_from_score(score: int) -> str:
    """1-5 scale → score 1-25. Documented, deterministic mapping."""
    if score >= 15:
        return "critique"
    if score >= 10:
        return "eleve"
    if score >= 5:
        return "modere"
    return "faible"


# ---------------- Decisions ----------------
class DecisionIn(BaseModel):
    title: str
    description: str = ""
    decision_type: str = "autre"
    priority: str = "moyenne"
    status: str = "draft"
    requested_by: str = ""
    assigned_to: str = ""
    related_activity_id: Optional[str] = None
    related_framework: Optional[str] = None
    due_date: Optional[str] = None
    decision_date: Optional[str] = None
    resolution: str = ""

    @field_validator("status")
    @classmethod
    def _status(cls, v):
        if v not in DECISION_STATUSES:
            raise ValueError(f"status invalide (attendu: {DECISION_STATUSES})")
        return v

    @field_validator("decision_type")
    @classmethod
    def _type(cls, v):
        if v not in DECISION_TYPES:
            raise ValueError(f"decision_type invalide (attendu: {DECISION_TYPES})")
        return v

    @field_validator("priority")
    @classmethod
    def _prio(cls, v):
        if v not in PRIORITIES:
            raise ValueError(f"priority invalide (attendu: {PRIORITIES})")
        return v


@registers_router.get("/decisions")
async def list_decisions():
    return await mdb.decisions.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)


@registers_router.get("/decisions/meta")
async def decisions_meta():
    return {"statuses": DECISION_STATUSES, "types": DECISION_TYPES, "priorities": PRIORITIES}


@registers_router.get("/decisions/{did}")
async def get_decision(did: str):
    d = await mdb.decisions.find_one({"id": did}, {"_id": 0})
    if not d:
        raise HTTPException(404, "Décision introuvable")
    return d


@registers_router.post("/decisions")
async def create_decision(payload: DecisionIn, x_user: str = Header(default="dev")):
    doc = {"id": uuid.uuid4().hex, **payload.model_dump(), **DEFAULT_ORIGIN,
           "created_at": _now(), "updated_at": _now(), "created_by": x_user, "updated_by": x_user}
    await mdb.decisions.insert_one(dict(doc))
    doc.pop("_id", None)
    await audit("create_decision", "decision", doc["id"], avant=None, apres=payload.model_dump(), user=x_user)
    return doc


@registers_router.put("/decisions/{did}")
async def update_decision(did: str, payload: DecisionIn, x_user: str = Header(default="dev")):
    cur = await mdb.decisions.find_one({"id": did}, {"_id": 0})
    if not cur:
        raise HTTPException(404, "Décision introuvable")
    data = {**payload.model_dump(), "updated_at": _now(), "updated_by": x_user}
    await mdb.decisions.update_one({"id": did}, {"$set": data})
    await audit("update_decision", "decision", did,
                avant={k: cur.get(k) for k in payload.model_dump()}, apres=payload.model_dump(), user=x_user)
    return await mdb.decisions.find_one({"id": did}, {"_id": 0})


@registers_router.delete("/decisions/{did}")
async def delete_decision(did: str, x_user: str = Header(default="dev")):
    cur = await mdb.decisions.find_one({"id": did}, {"_id": 0})
    if not cur:
        raise HTTPException(404, "Décision introuvable")
    await mdb.decisions.delete_one({"id": did})
    await audit("delete_decision", "decision", did, avant=cur, apres=None, user=x_user)
    return {"deleted": did}


# ---------------- Risks ----------------
class RiskIn(BaseModel):
    title: str
    description: str = ""
    category: str = "operationnel"
    probability: int = Field(ge=1, le=5)
    impact: int = Field(ge=1, le=5)
    status: str = "open"
    owner: str = ""
    related_activity_id: Optional[str] = None
    related_framework: Optional[str] = None
    mitigation_plan: str = ""
    mitigation_deadline: Optional[str] = None
    residual_probability: Optional[int] = Field(default=None, ge=1, le=5)
    residual_impact: Optional[int] = Field(default=None, ge=1, le=5)

    @field_validator("status")
    @classmethod
    def _status(cls, v):
        if v not in RISK_STATUSES:
            raise ValueError(f"status invalide (attendu: {RISK_STATUSES})")
        return v

    @field_validator("category")
    @classmethod
    def _cat(cls, v):
        if v not in RISK_CATEGORIES:
            raise ValueError(f"category invalide (attendu: {RISK_CATEGORIES})")
        return v


def _risk_computed(p: int, i: int, rp, ri):
    score = p * i
    out = {"risk_score": score, "severity": severity_from_score(score)}
    if rp is not None and ri is not None:
        out["residual_score"] = rp * ri
        out["residual_severity"] = severity_from_score(rp * ri)
    return out


@registers_router.get("/risks")
async def list_risks():
    return await mdb.risks.find({}, {"_id": 0}).sort("risk_score", -1).to_list(2000)


@registers_router.get("/risks/meta")
async def risks_meta():
    return {"statuses": RISK_STATUSES, "categories": RISK_CATEGORIES, "scale": "1-5",
            "severity_rule": {"critique": ">=15", "eleve": ">=10", "modere": ">=5", "faible": "<5"}}


@registers_router.get("/risks/{rid}")
async def get_risk(rid: str):
    r = await mdb.risks.find_one({"id": rid}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Risque introuvable")
    return r


@registers_router.post("/risks")
async def create_risk(payload: RiskIn, x_user: str = Header(default="dev")):
    comp = _risk_computed(payload.probability, payload.impact, payload.residual_probability, payload.residual_impact)
    doc = {"id": uuid.uuid4().hex, **payload.model_dump(), **comp, **DEFAULT_ORIGIN,
           "created_at": _now(), "updated_at": _now(), "created_by": x_user, "updated_by": x_user}
    await mdb.risks.insert_one(dict(doc))
    doc.pop("_id", None)
    await audit("create_risk", "risk", doc["id"], avant=None, apres={**payload.model_dump(), **comp}, user=x_user)
    return doc


@registers_router.put("/risks/{rid}")
async def update_risk(rid: str, payload: RiskIn, x_user: str = Header(default="dev")):
    cur = await mdb.risks.find_one({"id": rid}, {"_id": 0})
    if not cur:
        raise HTTPException(404, "Risque introuvable")
    comp = _risk_computed(payload.probability, payload.impact, payload.residual_probability, payload.residual_impact)
    data = {**payload.model_dump(), **comp, "updated_at": _now(), "updated_by": x_user}
    await mdb.risks.update_one({"id": rid}, {"$set": data})
    await audit("update_risk", "risk", rid,
                avant={k: cur.get(k) for k in payload.model_dump()}, apres={**payload.model_dump(), **comp}, user=x_user)
    return await mdb.risks.find_one({"id": rid}, {"_id": 0})


@registers_router.delete("/risks/{rid}")
async def delete_risk(rid: str, x_user: str = Header(default="dev")):
    cur = await mdb.risks.find_one({"id": rid}, {"_id": 0})
    if not cur:
        raise HTTPException(404, "Risque introuvable")
    await mdb.risks.delete_one({"id": rid})
    await audit("delete_risk", "risk", rid, avant=cur, apres=None, user=x_user)
    return {"deleted": rid}
