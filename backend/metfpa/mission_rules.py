"""Pure operational rules for the METFPA Director dashboard.

This module deliberately has no database or FastAPI dependency so the core
normalisation and alert rules can be unit-tested without a running MongoDB.
The existing ``activities`` collection remains the canonical persistence
source; API responses expose the additive mission vocabulary defined here.
"""
from __future__ import annotations

from calendar import monthrange
from datetime import datetime, timezone, timedelta
from typing import Iterable


MISSION_STATUSES = {
    "non_demarre",
    "en_cours",
    "acheve",
    "en_retard",
    "suspendu",
    "en_attente_arbitrage",
}

SUBMISSION_STATUSES = {"brouillon", "soumis", "valide", "correction_demandee"}
PRIORITIES = {"faible", "moyenne", "haute", "critique"}
RISK_LEVELS = {"faible", "modere", "eleve", "critique"}

LEGACY_TO_STATUS = {
    "Non démarré": "non_demarre",
    "À l'heure": "en_cours",
    "En cours": "en_cours",
    "Achevé": "acheve",
    "En retard": "en_retard",
    "Suspendu": "suspendu",
    "Bloqué": "en_attente_arbitrage",
}

STATUS_TO_LEGACY = {
    "non_demarre": "Non démarré",
    "en_cours": "En cours",
    "acheve": "Achevé",
    "en_retard": "En retard",
    "suspendu": "Suspendu",
    "en_attente_arbitrage": "Bloqué",
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def parse_datetime(value) -> datetime | None:
    """Parse ISO dates and the legacy ``YYYY-TQ`` quarter format."""
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        text = str(value).strip()
        if len(text) == 7 and text[4:6] == "-T" and text[6] in "1234":
            year = int(text[:4])
            month, day = {"1": (3, 31), "2": (6, 30), "3": (9, 30), "4": (12, 31)}[text[6]]
            return datetime(year, month, day, 23, 59, 59, tzinfo=timezone.utc)
        try:
            dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except (TypeError, ValueError):
            return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def canonical_status(value: str | None) -> str:
    if value in MISSION_STATUSES:
        return value
    return LEGACY_TO_STATUS.get(value or "", "non_demarre")


def legacy_status(value: str) -> str:
    return STATUS_TO_LEGACY.get(value, value)


def is_overdue(mission: dict, now: datetime | None = None) -> bool:
    now = now or utcnow()
    due = parse_datetime(mission.get("due_date") or mission.get("echeance"))
    status = canonical_status(mission.get("status") or mission.get("statut"))
    return bool(due and due < now and status != "acheve")


def _priority(raw: dict, blocker: str) -> str:
    value = (raw.get("priority") or "").lower()
    if value in PRIORITIES:
        return value
    if blocker or canonical_status(raw.get("status") or raw.get("statut")) == "en_attente_arbitrage":
        return "haute"
    return "moyenne"


def _risk(raw: dict, blocker: str) -> str:
    value = (raw.get("risk_level") or raw.get("niveau_risque") or "").lower()
    if value in RISK_LEVELS:
        return value
    return "eleve" if blocker else "modere"


def normalise_mission(raw: dict, now: datetime | None = None) -> dict:
    """Expose the target mission contract while preserving legacy aliases."""
    now = now or utcnow()
    blocker = raw.get("blocker") or raw.get("alerte") or ""
    declared = canonical_status(raw.get("status") or raw.get("statut"))
    effective = "en_retard" if declared != "acheve" and is_overdue(raw, now) else declared
    progress = raw.get("progress", raw.get("avancement", 0))
    try:
        progress = max(0, min(100, int(progress or 0)))
    except (TypeError, ValueError):
        progress = 0

    owner = raw.get("responsible_person") or raw.get("owner") or raw.get("responsable")
    due_date = raw.get("due_date") or raw.get("echeance")
    expected = raw.get("expected_deliverable") or raw.get("livrable_attendu")
    mission_title = raw.get("mission_title") or raw.get("axe_pol_nom") or raw.get("strategic_objective") or raw.get("intitule")
    action_title = raw.get("action_title") or raw.get("intitule")
    activity_title = raw.get("activity_title") or raw.get("intitule")
    last_update = raw.get("last_update") or raw.get("derniere_maj") or raw.get("updated_at")
    direction = raw.get("direction")

    completeness_values = [direction, owner, due_date, expected, action_title]
    completeness = round(sum(v not in (None, "") for v in completeness_values) / len(completeness_values) * 100)

    return {
        **raw,
        "id": raw.get("id"),
        "code": raw.get("code") or raw.get("code_action"),
        "pnd_pillar": raw.get("pnd_pillar") or "PND 2026-2030",
        "pnd_axis": raw.get("pnd_axis") or raw.get("pnd_effet"),
        "strategic_objective": raw.get("strategic_objective") or raw.get("axe_pol_nom"),
        "budget_program": raw.get("budget_program") or raw.get("produit_pol"),
        "ministry_mission": raw.get("ministry_mission") or raw.get("axe_pol_nom"),
        "mission_title": mission_title,
        "action_title": action_title,
        "activity_title": activity_title,
        "direction": direction,
        "responsible_person": owner,
        "owner": owner,
        "due_date": due_date,
        "declared_status": declared,
        "status": effective,
        "progress": progress,
        "expected_deliverable": expected,
        "deliverable_link": raw.get("deliverable_link"),
        "blocker": blocker,
        "decision_required": raw.get("decision_required") or raw.get("decision_requise") or "",
        "next_step": raw.get("next_step") or "",
        "priority": _priority(raw, blocker),
        "risk_level": _risk(raw, blocker),
        "needs_arbitration": bool(raw.get("needs_arbitration") or blocker or declared == "en_attente_arbitrage"),
        "last_update": last_update,
        "submission_status": raw.get("submission_status") or "brouillon",
        "data_origin": raw.get("data_origin") or "demo_tracking",
        "validation_status": raw.get("validation_status") or "to_validate",
        "comments": raw.get("comments") or [],
        "supporting_documents": raw.get("supporting_documents") or [],
        "completeness_score": completeness,
        # Backward-compatible aliases consumed by existing pages.
        "code_action": raw.get("code_action") or raw.get("code"),
        "intitule": raw.get("intitule") or activity_title,
        "avancement": progress,
        "statut": legacy_status(effective),
        "echeance": raw.get("echeance") or due_date,
        "alerte": blocker,
        "derniere_maj": last_update,
    }


def update_score(last_update, now: datetime | None = None) -> int:
    now = now or utcnow()
    dt = parse_datetime(last_update)
    if not dt:
        return 0
    days = max(0, (now - dt).days)
    if days <= 7:
        return 100
    if days <= 14:
        return 70
    if days <= 30:
        return 40
    return 10


def direction_performance(missions: Iterable[dict], now: datetime | None = None, stale_days: int = 14) -> list[dict]:
    now = now or utcnow()
    groups: dict[str, list[dict]] = {}
    for item in missions:
        mission = normalise_mission(item, now)
        groups.setdefault(mission.get("direction") or "Non renseignée", []).append(mission)

    output = []
    for direction, rows in groups.items():
        last_updates = [parse_datetime(x.get("last_update")) for x in rows]
        last_updates = [x for x in last_updates if x]
        last = max(last_updates) if last_updates else None
        stale = not last or (now - last) > timedelta(days=stale_days)
        output.append({
            "direction": direction,
            "missions_total": len(rows),
            "missions_completed": sum(x["status"] == "acheve" for x in rows),
            "missions_in_progress": sum(x["status"] == "en_cours" for x in rows),
            "missions_overdue": sum(x["status"] == "en_retard" for x in rows),
            "execution_rate": round(sum(x["progress"] for x in rows) / len(rows), 1) if rows else 0,
            "blockers": sum(bool(x["blocker"]) for x in rows),
            "decisions_required": sum(bool(x["decision_required"] or x["needs_arbitration"]) for x in rows),
            "last_update": last.isoformat() if last else None,
            "update_score": update_score(last, now),
            "completeness_rate": round(sum(x["completeness_score"] for x in rows) / len(rows), 1) if rows else 0,
            "needs_follow_up": stale,
            "data_origin": "demo_tracking",
            "validation_status": "to_validate",
        })
    return sorted(output, key=lambda x: (not x["needs_follow_up"], -x["missions_overdue"], x["direction"]))


def build_operational_alerts(missions: Iterable[dict], decisions: Iterable[dict], now: datetime | None = None,
                             stale_days: int = 14) -> list[dict]:
    now = now or utcnow()
    alerts = []
    rows = [normalise_mission(x, now) for x in missions]

    def add(rule, severity, title, description, resource_type, resource_id, direction=None, evidence=None):
        alerts.append({
            "alert_id": f"{rule}:{resource_id}",
            "rule_id": rule,
            "severity": severity,
            "title": title,
            "description": description,
            "related_resource_type": resource_type,
            "related_resource_id": resource_id,
            "direction": direction,
            "evidence": evidence or {},
            "generated_at": now.isoformat(),
            "data_origin": "demo_tracking",
            "validation_status": "to_validate",
        })

    for mission in rows:
        mid = mission.get("id") or mission.get("code")
        label = f"{mission.get('code') or ''} — {mission.get('action_title') or mission.get('mission_title') or ''}".strip(" —")
        if mission["status"] == "en_retard":
            severity = "critique" if mission["priority"] in ("haute", "critique") else "eleve"
            add("MISSION_OVERDUE", severity, "Mission en retard", label, "mission", mid, mission.get("direction"),
                {"due_date": mission.get("due_date"), "priority": mission["priority"]})
        if mission["blocker"]:
            severity = "critique" if mission["priority"] in ("haute", "critique") else "eleve"
            add("MISSION_BLOCKED", severity, "Blocage à arbitrer", mission["blocker"], "mission", mid,
                mission.get("direction"), {"blocker": mission["blocker"]})
        if not mission["responsible_person"] or not mission["due_date"]:
            missing = [name for name, value in (("responsable", mission["responsible_person"]), ("échéance", mission["due_date"])) if not value]
            add("MISSION_INCOMPLETE", "modere", "Mission incomplète", f"{label} : {', '.join(missing)} manquant(s).",
                "mission", mid, mission.get("direction"), {"missing": missing})
        if mission["needs_arbitration"] or mission["decision_required"]:
            add("MISSION_ARBITRATION", "eleve", "Décision ou arbitrage attendu",
                mission["decision_required"] or mission["blocker"] or label, "mission", mid,
                mission.get("direction"), {"decision_required": mission["decision_required"]})

    for perf in direction_performance(rows, now, stale_days):
        if perf["needs_follow_up"]:
            add("DIRECTION_STALE", "eleve", "Direction sans mise à jour récente",
                f"{perf['direction']} doit être relancée.", "direction", perf["direction"], perf["direction"],
                {"last_update": perf["last_update"], "update_score": perf["update_score"]})

    for decision in decisions:
        due = parse_datetime(decision.get("due_date"))
        closed = decision.get("status") in ("implemented", "closed", "rejected")
        if due and due < now and not closed:
            add("DECISION_OVERDUE", "critique", "Décision non exécutée dans le délai",
                decision.get("title") or "Décision sans titre", "decision", decision.get("id"),
                decision.get("direction"), {"due_date": decision.get("due_date"), "status": decision.get("status")})

    rank = {"critique": 0, "eleve": 1, "modere": 2, "faible": 3}
    alerts.sort(key=lambda x: (rank.get(x["severity"], 9), x["title"], str(x["related_resource_id"])))
    return alerts


def decision_windows(decisions: Iterable[dict], now: datetime | None = None) -> tuple[list[dict], list[dict]]:
    now = now or utcnow()
    week_end = now + timedelta(days=7)
    month_end = datetime(now.year, now.month, monthrange(now.year, now.month)[1], 23, 59, 59, tzinfo=timezone.utc)
    active = [d for d in decisions if d.get("status") not in ("implemented", "closed", "rejected")]
    this_week, this_month = [], []
    for decision in active:
        due = parse_datetime(decision.get("due_date"))
        if due and due <= week_end:
            this_week.append(decision)
        elif due and due <= month_end:
            this_month.append(decision)
    return this_week, this_month
