"""Operational Director dashboard, mission and weekly-meeting API.

The existing ``activities`` collection is intentionally reused as the mission
store. New fields are additive and legacy aliases remain synchronised so all
pre-existing endpoints and pages continue to work during the MVP transition.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from .auth import get_identity, require_role, assert_direction_scope
from .db import mdb, audit
from .mission_rules import (
    MISSION_STATUSES,
    PRIORITIES,
    RISK_LEVELS,
    SUBMISSION_STATUSES,
    build_operational_alerts,
    decision_windows,
    direction_performance,
    legacy_status,
    normalise_mission,
    parse_datetime,
    utcnow,
)


operations_router = APIRouter(prefix="/api/metfpa")

GLOBAL_ROLES = ("dircab", "admin")
MISSION_EDIT_ROLES = ("agency_director", "dircab", "admin")
MEETING_READ_ROLES = ("dircab", "admin")
MEETING_EDIT_ROLES = ("dircab", "admin")
STALE_DAYS = int(os.environ.get("METFPA_STALE_UPDATE_DAYS", "14"))


class MissionPatch(BaseModel):
    status: Optional[str] = None
    progress: Optional[int] = Field(default=None, ge=0, le=100)
    responsible_person: Optional[str] = None
    due_date: Optional[str] = None
    expected_deliverable: Optional[str] = None
    deliverable_link: Optional[str] = None
    blocker: Optional[str] = None
    decision_required: Optional[str] = None
    next_step: Optional[str] = None
    priority: Optional[str] = None
    risk_level: Optional[str] = None
    needs_arbitration: Optional[bool] = None
    submission_status: Optional[str] = None
    comment: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value):
        if value is not None and value not in MISSION_STATUSES:
            raise ValueError(f"statut invalide (attendu: {sorted(MISSION_STATUSES)})")
        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value):
        if value is not None and value not in PRIORITIES:
            raise ValueError(f"priorité invalide (attendu: {sorted(PRIORITIES)})")
        return value

    @field_validator("risk_level")
    @classmethod
    def validate_risk(cls, value):
        if value is not None and value not in RISK_LEVELS:
            raise ValueError(f"risque invalide (attendu: {sorted(RISK_LEVELS)})")
        return value

    @field_validator("submission_status")
    @classmethod
    def validate_submission(cls, value):
        if value is not None and value not in SUBMISSION_STATUSES:
            raise ValueError(f"statut de soumission invalide (attendu: {sorted(SUBMISSION_STATUSES)})")
        return value


class MissionUpdateIn(MissionPatch):
    comment: str = Field(min_length=1)


class MeetingIn(BaseModel):
    title: str
    meeting_date: str
    status: str = "planned"
    agenda: list[dict[str, Any]] = Field(default_factory=list)
    previous_commitments: list[dict[str, Any]] = Field(default_factory=list)
    decisions: list[dict[str, Any]] = Field(default_factory=list)
    notes: str = ""


class MeetingPatch(BaseModel):
    title: Optional[str] = None
    meeting_date: Optional[str] = None
    status: Optional[str] = None
    agenda: Optional[list[dict[str, Any]]] = None
    previous_commitments: Optional[list[dict[str, Any]]] = None
    decisions: Optional[list[dict[str, Any]]] = None
    notes: Optional[str] = None


def _scope_query(identity: dict) -> dict:
    return {"direction": identity.get("direction")} if identity.get("role") == "agency_director" else {}


async def _raw_missions(identity: dict, query: Optional[dict] = None) -> list[dict]:
    scoped = {**_scope_query(identity), **(query or {})}
    return await mdb.activities.find(scoped, {"_id": 0}).sort("code_action", 1).to_list(5000)


def _filters(rows: list[dict], **values) -> list[dict]:
    result = rows
    for field, value in values.items():
        if value:
            result = [row for row in result if str(row.get(field) or "") == str(value)]
    return result


async def _find_mission(mid: str, identity: dict) -> dict:
    raw = await mdb.activities.find_one({"id": mid}, {"_id": 0})
    if not raw:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    if identity.get("role") == "agency_director":
        assert_direction_scope(identity, raw.get("direction"))
    return raw


def _persistence_patch(payload: MissionPatch, identity: dict) -> tuple[dict, str | None]:
    data = payload.model_dump(exclude_unset=True)
    comment = data.pop("comment", None)
    now = utcnow().isoformat()
    if "status" in data:
        data["statut"] = legacy_status(data["status"])
    if "progress" in data:
        data["avancement"] = data["progress"]
    if "blocker" in data:
        data["alerte"] = data["blocker"]
    if "due_date" in data:
        data["echeance"] = data["due_date"]
    if identity.get("role") == "agency_director":
        data["submission_status"] = "soumis"
        data["validation_status"] = "to_validate"
    data.update({
        "last_update": now,
        "derniere_maj": now,
        "updated_at": now,
        "updated_by": identity.get("email"),
    })
    return data, comment


async def _apply_patch(mid: str, payload: MissionPatch, identity: dict) -> dict:
    current = await _find_mission(mid, identity)
    data, comment = _persistence_patch(payload, identity)
    if len(data) <= 4 and not comment:  # only automatic metadata
        return normalise_mission(current)
    update: dict[str, Any] = {"$set": data}
    if comment:
        update["$push"] = {"comments": {"text": comment, "author": identity["email"],
                                          "role": identity["role"], "date": data["last_update"]}}
    await mdb.activities.update_one({"id": mid}, update)
    changed = {k: v for k, v in data.items() if k not in {"updated_at", "updated_by", "derniere_maj", "last_update"}}
    entry = {
        "id": uuid.uuid4().hex,
        "mission_id": mid,
        "mission_code": current.get("code_action") or current.get("code"),
        "direction": current.get("direction"),
        "user": identity["email"],
        "role": identity["role"],
        "before": {k: current.get(k) for k in changed},
        "after": changed,
        "comment": comment,
        "created_at": data["last_update"],
        "data_origin": "demo_tracking",
        "validation_status": data.get("validation_status", current.get("validation_status", "to_validate")),
    }
    await mdb.mission_updates.insert_one(dict(entry))
    await audit("update_mission", "mission", mid, avant=entry["before"], apres={**changed, "comment": comment},
                user=identity["email"])
    result = await mdb.activities.find_one({"id": mid}, {"_id": 0})
    return normalise_mission(result)


async def ensure_operational_schema() -> dict:
    """Add mission defaults without overwriting any existing operational edit."""
    cursor = mdb.activities.find({}, {"_id": 0})
    updated = 0
    async for raw in cursor:
        mission = normalise_mission(raw)
        defaults = {
            "status": mission["declared_status"],
            "progress": mission["progress"],
            "pnd_pillar": mission["pnd_pillar"],
            "pnd_axis": mission["pnd_axis"],
            "strategic_objective": mission["strategic_objective"],
            "budget_program": mission["budget_program"],
            "ministry_mission": mission["ministry_mission"],
            "mission_title": mission["mission_title"],
            "action_title": mission["action_title"],
            "activity_title": mission["activity_title"],
            "priority": mission["priority"],
            "risk_level": mission["risk_level"],
            "submission_status": mission["submission_status"],
            "comments": raw.get("comments") or [],
            "supporting_documents": raw.get("supporting_documents") or [],
        }
        missing = {key: value for key, value in defaults.items() if key not in raw}
        if missing:
            await mdb.activities.update_one({"id": raw["id"]}, {"$set": missing})
            updated += 1
    await mdb.mission_updates.create_index([("mission_id", 1), ("created_at", -1)])
    await mdb.weekly_meetings.create_index("id", unique=True)
    await mdb.weekly_meetings.create_index("meeting_date")
    return {"activities_backfilled": updated}


@operations_router.get("/missions")
async def list_missions(
    direction: Optional[str] = None,
    status: Optional[str] = None,
    pnd_axis: Optional[str] = None,
    budget_program: Optional[str] = None,
    priority: Optional[str] = None,
    risk_level: Optional[str] = None,
    identity: dict = Depends(get_identity),
):
    rows = [normalise_mission(x) for x in await _raw_missions(identity)]
    rows = _filters(rows, direction=direction, status=status, pnd_axis=pnd_axis,
                    budget_program=budget_program, priority=priority, risk_level=risk_level)
    return {"items": rows, "total": len(rows), "scope_direction": identity.get("direction") if identity["role"] == "agency_director" else None}


@operations_router.get("/missions/{mid}")
async def get_mission(mid: str, identity: dict = Depends(get_identity)):
    return normalise_mission(await _find_mission(mid, identity))


@operations_router.patch("/missions/{mid}")
async def patch_mission(mid: str, payload: MissionPatch,
                        identity: dict = Depends(require_role(*MISSION_EDIT_ROLES))):
    return await _apply_patch(mid, payload, identity)


@operations_router.get("/my-direction")
async def my_direction(identity: dict = Depends(require_role("agency_director"))):
    rows = [normalise_mission(x) for x in await _raw_missions(identity)]
    perf = direction_performance(rows, stale_days=STALE_DAYS)
    return {"direction": identity.get("direction"), "user": identity,
            "performance": perf[0] if perf else None, "mission_count": len(rows)}


@operations_router.get("/my-direction/missions")
async def my_direction_missions(identity: dict = Depends(require_role("agency_director"))):
    rows = [normalise_mission(x) for x in await _raw_missions(identity)]
    return {"items": rows, "total": len(rows), "scope_direction": identity.get("direction")}


@operations_router.patch("/my-direction/missions/{mid}")
async def patch_my_direction_mission(mid: str, payload: MissionPatch,
                                     identity: dict = Depends(require_role("agency_director"))):
    return await _apply_patch(mid, payload, identity)


@operations_router.post("/my-direction/missions/{mid}/updates")
async def submit_direction_update(mid: str, payload: MissionUpdateIn,
                                  identity: dict = Depends(require_role("agency_director"))):
    return await _apply_patch(mid, payload, identity)


@operations_router.get("/pnd-alignment")
async def pnd_alignment(identity: dict = Depends(get_identity)):
    rows = [normalise_mission(x) for x in await _raw_missions(identity)]
    items = [{key: row.get(key) for key in (
        "id", "code", "pnd_pillar", "pnd_axis", "strategic_objective", "budget_program",
        "ministry_mission", "action_title", "activity_title", "direction", "status", "progress",
        "priority", "risk_level", "data_origin", "validation_status"
    )} for row in rows]
    return {"items": items, "total": len(items),
            "chain": ["PND", "Axe", "Objectif sectoriel", "Programme budgétaire", "Mission", "Direction", "Statut", "Avancement"]}


@operations_router.get("/directions-performance")
async def directions_performance(identity: dict = Depends(require_role(*GLOBAL_ROLES))):
    rows = await _raw_missions(identity)
    items = direction_performance(rows, stale_days=STALE_DAYS)
    return {"items": items, "total": len(items), "stale_after_days": STALE_DAYS,
            "directions_to_follow_up": sum(x["needs_follow_up"] for x in items)}


async def _operational_context():
    missions = await mdb.activities.find({}, {"_id": 0}).to_list(5000)
    decisions = await mdb.decisions.find({}, {"_id": 0}).to_list(2000)
    normalised = [normalise_mission(x) for x in missions]
    alerts = build_operational_alerts(normalised, decisions, stale_days=STALE_DAYS)
    performance = direction_performance(normalised, stale_days=STALE_DAYS)
    return normalised, decisions, alerts, performance


@operations_router.get("/alerts")
async def operational_alerts(identity: dict = Depends(require_role(*GLOBAL_ROLES))):
    _missions, _decisions, alerts, _performance = await _operational_context()
    counts = {severity: sum(x["severity"] == severity for x in alerts)
              for severity in ("critique", "eleve", "modere", "faible")}
    return {"items": alerts, "total": len(alerts), "counts": counts,
            "stale_after_days": STALE_DAYS,
            "rules": ["mission_overdue", "priority_overdue", "decision_overdue", "direction_stale",
                      "mission_incomplete", "mission_blocked", "arbitration_required"]}


def _next_monday(now: datetime) -> datetime:
    days = (7 - now.weekday()) % 7 or 7
    return (now + timedelta(days=days)).replace(hour=9, minute=0, second=0, microsecond=0)


def _agenda_from_alerts(alerts: list[dict]) -> list[dict]:
    return [{
        "id": f"proposal:{a['alert_id']}",
        "source": "automatic_alert",
        "source_id": a["related_resource_id"],
        "subject": a["title"],
        "description": a["description"],
        "direction": a.get("direction"),
        "priority": "critique" if a["severity"] == "critique" else "haute",
        "status": "proposed",
        "data_origin": a["data_origin"],
    } for a in alerts if a["severity"] in ("critique", "eleve")][:12]


@operations_router.get("/weekly-meetings")
async def weekly_meetings(identity: dict = Depends(require_role(*MEETING_READ_ROLES))):
    items = await mdb.weekly_meetings.find({}, {"_id": 0}).sort("meeting_date", -1).to_list(200)
    _missions, _decisions, alerts, _performance = await _operational_context()
    now = utcnow()
    future = [x for x in items if (parse_datetime(x.get("meeting_date")) or now - timedelta(days=1)) >= now]
    next_meeting = sorted(future, key=lambda x: x.get("meeting_date") or "")[0] if future else {
        "id": None,
        "title": "Réunion hebdomadaire de suivi",
        "meeting_date": _next_monday(now).isoformat(),
        "status": "proposed",
        "agenda": [],
        "data_origin": "demo_tracking",
        "validation_status": "to_validate",
    }
    return {"items": items, "next_meeting": next_meeting, "proposed_agenda": _agenda_from_alerts(alerts)}


@operations_router.post("/weekly-meetings")
async def create_weekly_meeting(payload: MeetingIn,
                                identity: dict = Depends(require_role(*MEETING_EDIT_ROLES))):
    now = utcnow().isoformat()
    doc = {"id": uuid.uuid4().hex, **payload.model_dump(), "created_at": now, "updated_at": now,
           "created_by": identity["email"], "updated_by": identity["email"],
           "data_origin": "demo_tracking", "validation_status": "to_validate"}
    await mdb.weekly_meetings.insert_one(dict(doc))
    doc.pop("_id", None)
    await audit("create_weekly_meeting", "weekly_meeting", doc["id"], apres=payload.model_dump(), user=identity["email"])
    return doc


@operations_router.patch("/weekly-meetings/{meeting_id}")
async def patch_weekly_meeting(meeting_id: str, payload: MeetingPatch,
                               identity: dict = Depends(require_role(*MEETING_EDIT_ROLES))):
    current = await mdb.weekly_meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not current:
        raise HTTPException(status_code=404, detail="Réunion introuvable")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return current
    data.update({"updated_at": utcnow().isoformat(), "updated_by": identity["email"]})
    await mdb.weekly_meetings.update_one({"id": meeting_id}, {"$set": data})
    await audit("update_weekly_meeting", "weekly_meeting", meeting_id,
                avant={k: current.get(k) for k in data}, apres=data, user=identity["email"])
    return await mdb.weekly_meetings.find_one({"id": meeting_id}, {"_id": 0})


@operations_router.get("/update-log")
async def update_log(mission_id: Optional[str] = Query(default=None), identity: dict = Depends(get_identity)):
    query: dict[str, Any] = {}
    if mission_id:
        query["mission_id"] = mission_id
    if identity["role"] == "agency_director":
        query["direction"] = identity.get("direction")
    elif identity["role"] not in GLOBAL_ROLES:
        raise HTTPException(status_code=403, detail="Accès refusé pour ce rôle")
    items = await mdb.mission_updates.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return {"items": items, "total": len(items)}


@operations_router.get("/director-dashboard")
async def director_dashboard(identity: dict = Depends(require_role("dircab", "admin"))):
    missions, decisions, alerts, performance = await _operational_context()
    this_week, this_month = decision_windows(decisions)
    completed = sum(x["status"] == "acheve" for x in missions)
    overdue = sum(x["status"] == "en_retard" for x in missions)
    blockers = [x for x in missions if x["blocker"]]
    pending_decisions = [d for d in decisions if d.get("status") not in ("implemented", "closed", "rejected")]
    completeness = round(sum(x["completeness_score"] for x in missions) / len(missions), 1) if missions else 0
    implementation_rate = round(sum(d.get("status") in ("implemented", "closed") for d in decisions) / len(decisions) * 100, 1) if decisions else 0
    financial_gaps = []
    for mission in missions:
        planned, executed = mission.get("budget_prevu"), mission.get("budget_execute")
        if planned not in (None, 0) and executed is not None:
            financial_gaps.append(round(mission["progress"] - (executed / planned * 100), 1))
    axis_groups: dict[str, list[dict]] = {}
    for mission in missions:
        axis_groups.setdefault(mission.get("pnd_axis") or "Non renseigné", []).append(mission)
    execution_by_axis = [{
        "pnd_axis": axis,
        "missions_total": len(rows),
        "execution_rate": round(sum(x["progress"] for x in rows) / len(rows), 1),
        "missions_overdue": sum(x["status"] == "en_retard" for x in rows),
    } for axis, rows in sorted(axis_groups.items())]
    top = sorted(missions, key=lambda x: (
        x["priority"] not in ("critique", "haute"),
        not bool(x["blocker"]),
        x["status"] != "en_retard",
        x["progress"],
    ))[:5]
    meetings = await weekly_meetings(identity)
    return {
        "summary": {
            "execution_rate": round(sum(x["progress"] for x in missions) / len(missions), 1) if missions else 0,
            "missions_total": len(missions),
            "missions_completed": completed,
            "missions_overdue": overdue,
            "critical_blockers": sum(x["priority"] in ("haute", "critique") for x in blockers),
            "decisions_pending": len(pending_decisions),
            "directions_stale": sum(x["needs_follow_up"] for x in performance),
            "data_completeness_rate": completeness,
            "decision_implementation_rate": implementation_rate,
            "submitted_updates": sum(x.get("submission_status") == "soumis" for x in missions),
            "updates_pending_validation": sum(x.get("validation_status") in ("to_validate", "pending_metfpa_validation") for x in missions),
            "deliverables_overdue": sum(x["status"] == "en_retard" and bool(x["expected_deliverable"]) for x in missions),
            "missions_incomplete": sum(x["completeness_score"] < 100 for x in missions),
            "physical_budget_gap_average": round(sum(financial_gaps) / len(financial_gaps), 1) if financial_gaps else None,
        },
        "execution_by_pnd_axis": execution_by_axis,
        "what_advances": sorted([x for x in missions if x["status"] in ("en_cours", "acheve")], key=lambda x: -x["progress"])[:10],
        "what_blocks": sorted([x for x in missions if x["blocker"] or x["status"] == "en_retard"], key=lambda x: (not bool(x["blocker"]), x["progress"]))[:10],
        "top_priority_missions": top,
        "directions_performance": performance,
        "directions_to_follow_up": [x for x in performance if x["needs_follow_up"]],
        "alerts_this_week": alerts[:12],
        "decisions_this_week": this_week,
        "decisions_this_month": this_month,
        "next_meeting": meetings["next_meeting"],
        "proposed_agenda": meetings["proposed_agenda"],
        "data_origin": "demo_tracking",
        "validation_status": "to_validate",
    }
