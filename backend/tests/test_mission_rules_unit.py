"""Unit tests for the operational mission contract and Director rules."""
from datetime import datetime, timezone, timedelta
from pathlib import Path
import sys


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from metfpa.mission_rules import (  # noqa: E402
    build_operational_alerts,
    decision_windows,
    direction_performance,
    is_overdue,
    normalise_mission,
)


NOW = datetime(2026, 7, 13, 10, 0, tzinfo=timezone.utc)


def mission(**overrides):
    base = {
        "id": "ACT001",
        "code_action": "1.1.1",
        "intitule": "Équiper les ateliers de formation",
        "axe_pol_nom": "Amélioration de la qualité de la formation",
        "pnd_effet": "4.02.1",
        "produit_pol": "PB-01",
        "direction": "DAF",
        "responsable": "Point focal DAF",
        "echeance": "2026-T3",
        "statut": "En cours",
        "avancement": 45,
        "livrable_attendu": "Ateliers équipés",
        "derniere_maj": (NOW - timedelta(days=3)).isoformat(),
        "data_origin": "demo_tracking",
        "validation_status": "to_validate",
    }
    return {**base, **overrides}


def test_normalise_mission_exposes_target_and_legacy_fields():
    item = normalise_mission(mission(), NOW)
    assert item["code"] == "1.1.1"
    assert item["pnd_axis"] == "4.02.1"
    assert item["budget_program"] == "PB-01"
    assert item["action_title"] == "Équiper les ateliers de formation"
    assert item["status"] == "en_cours"
    assert item["progress"] == item["avancement"] == 45
    assert item["data_origin"] == "demo_tracking"


def test_overdue_non_completed_mission_is_effectively_late():
    raw = mission(echeance="2026-T2", statut="En cours", priority="haute")
    assert is_overdue(raw, NOW)
    assert normalise_mission(raw, NOW)["status"] == "en_retard"
    assert not is_overdue(mission(echeance="2026-T2", statut="Achevé"), NOW)


def test_alert_rules_cover_blocker_arbitration_stale_direction_and_decision():
    raw = mission(
        echeance="2026-T2",
        alerte="Marché non attribué",
        decision_requise="Arbitrage budgétaire",
        priority="haute",
        derniere_maj=(NOW - timedelta(days=40)).isoformat(),
    )
    decisions = [{"id": "D1", "title": "Valider le marché", "status": "pending", "due_date": "2026-07-01"}]
    alerts = build_operational_alerts([raw], decisions, NOW, stale_days=14)
    rules = {a["rule_id"] for a in alerts}
    assert {"MISSION_OVERDUE", "MISSION_BLOCKED", "MISSION_ARBITRATION", "DIRECTION_STALE", "DECISION_OVERDUE"} <= rules
    assert next(a for a in alerts if a["rule_id"] == "MISSION_OVERDUE")["severity"] == "critique"


def test_direction_performance_calculates_execution_completeness_and_freshness():
    rows = [mission(avancement=50), mission(id="ACT002", code_action="1.1.2", avancement=100, statut="Achevé")]
    perf = direction_performance(rows, NOW, stale_days=14)[0]
    assert perf["direction"] == "DAF"
    assert perf["missions_total"] == 2
    assert perf["missions_completed"] == 1
    assert perf["execution_rate"] == 75.0
    assert perf["update_score"] == 100
    assert perf["needs_follow_up"] is False
    assert perf["completeness_rate"] == 100.0


def test_decision_windows_split_week_and_month():
    decisions = [
        {"id": "W", "status": "pending", "due_date": "2026-07-17"},
        {"id": "M", "status": "pending", "due_date": "2026-07-28"},
        {"id": "C", "status": "closed", "due_date": "2026-07-15"},
    ]
    week, month = decision_windows(decisions, NOW)
    assert [x["id"] for x in week] == ["W"]
    assert [x["id"] for x in month] == ["M"]
