"""METFPA Phase 2A — M&E validation workflow (backend only).

Generic, server-enforced validation state machine over indicators, activities,
decisions and risks. Every action requires VALIDATE_ROLES (me_validator, admin);
`reopen` is admin-only. All actions are written to the audit log. Transitions
use conditional (atomic) updates so concurrent validations resolve to one
winner and one 409."""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from pymongo import ReturnDocument

from .db import mdb, audit
from .auth import require_role, VALIDATE_ROLES

validation_router = APIRouter(prefix="/api/metfpa/validation")

ENTITY_COLLECTIONS = {
    "indicators": "indicators",
    "activities": "activities",
    "decisions": "decisions",
    "risks": "risks",
}
# audit() entries keep the singular vocabulary used by the existing log
ENTITY_SINGULAR = {"indicators": "indicator", "activities": "activity",
                   "decisions": "decision", "risks": "risk"}

TO_VALIDATE = "to_validate"
VALIDATED = "validated"
REJECTED = "rejected"
CORRECTION_REQUESTED = "correction_requested"

# Statuses considered "awaiting validation". Existing vocabulary is preserved:
# referentials use pending_metfpa_validation, registers use to_validate, seeded
# activities carry the legacy value "demo"; a missing field is equivalent.
PENDING_EQUIV = [TO_VALIDATE, "pending_metfpa_validation", "demo"]

TRANSITIONS = {
    "validate": {"from": PENDING_EQUIV + [CORRECTION_REQUESTED], "to": VALIDATED},
    "reject": {"from": PENDING_EQUIV + [CORRECTION_REQUESTED], "to": REJECTED},
    "request_correction": {"from": PENDING_EQUIV + [REJECTED], "to": CORRECTION_REQUESTED},
    "reopen": {"from": [VALIDATED, REJECTED], "to": TO_VALIDATE},
}
COMMENT_REQUIRED = {"reject", "request_correction", "comment"}
ACTIONS = set(TRANSITIONS) | {"comment"}


class ValidationIn(BaseModel):
    action: str
    comment: str = ""


def _status_filter(allowed, include_missing):
    """Mongo filter matching the allowed from-statuses (atomicity guard)."""
    clauses = [{"validation_status": {"$in": allowed}}]
    if include_missing:
        clauses.append({"validation_status": {"$exists": False}})
        clauses.append({"validation_status": None})
    return {"$or": clauses}


@validation_router.post("/{entity_type}/{eid}")
async def apply_validation(entity_type: str, eid: str, payload: ValidationIn,
                           identity: dict = Depends(require_role(*VALIDATE_ROLES))):
    if entity_type not in ENTITY_COLLECTIONS:
        raise HTTPException(status_code=400,
                            detail=f"Type d'entité invalide (attendu: {sorted(ENTITY_COLLECTIONS)})")
    action = payload.action
    if action not in ACTIONS:
        raise HTTPException(status_code=400, detail=f"Action invalide (attendu: {sorted(ACTIONS)})")
    if action == "reopen" and identity["role"] != "admin":
        raise HTTPException(status_code=403, detail="Réouverture réservée à l'administrateur")
    comment = payload.comment.strip()
    if action in COMMENT_REQUIRED and not comment:
        raise HTTPException(status_code=400, detail="Commentaire requis pour cette action")

    coll = mdb[ENTITY_COLLECTIONS[entity_type]]
    current = await coll.find_one({"id": eid}, {"_id": 0})
    if not current:
        raise HTTPException(status_code=404, detail="Élément introuvable")

    now = datetime.now(timezone.utc).isoformat()
    entry = {"date": now, "author": identity["email"], "role": identity["role"],
             "action": action, "text": comment}

    if action == "comment":
        await coll.update_one({"id": eid}, {"$push": {"validation_comments": entry}})
        await audit("validation_comment", ENTITY_SINGULAR[entity_type], eid,
                    avant=None, apres={"comment": comment}, user=identity["email"])
        return await coll.find_one({"id": eid}, {"_id": 0})

    tr = TRANSITIONS[action]
    update = {"$set": {"validation_status": tr["to"]}, "$push": {"validation_comments": entry}}
    if action == "validate":
        update["$set"]["validated_by"] = identity["email"]
        update["$set"]["validated_at"] = now
    elif action == "reopen":
        update["$unset"] = {"validated_by": "", "validated_at": ""}

    # Atomic guard: the expected from-status is part of the filter, so a
    # concurrent transition leaves this update matching nothing -> 409.
    doc = await coll.find_one_and_update(
        {"id": eid, **_status_filter(tr["from"], include_missing=action != "reopen")},
        update, projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    if doc is None:
        raise HTTPException(
            status_code=409,
            detail=f"Transition interdite : statut actuel « {current.get('validation_status')} » "
                   f"n'autorise pas « {action} »")

    await audit(f"validation_{action}", ENTITY_SINGULAR[entity_type], eid,
                avant={"validation_status": current.get("validation_status")},
                apres={"validation_status": tr["to"], "comment": comment or None},
                user=identity["email"])
    return doc
