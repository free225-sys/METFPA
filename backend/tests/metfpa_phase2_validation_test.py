"""METFPA Phase 2A — M&E validation workflow backend tests.

Covers: 401 / 403 / 400 / 404 / 409 paths, successful transitions on the four
entity types, admin-only reopen, comment requirements, indicator id backfill,
and audit-log entries. Same conventions as metfpa_s4_test.py (runs against a
deployed or local instance via REACT_APP_BACKEND_URL)."""
import os
import uuid

import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "http://127.0.0.1:8001").rstrip("/")
PWD = os.environ.get("METFPA_SEED_PASSWORD", "Metfpa@2026Demo")

ACCOUNTS = {
    "admin": "admin@metfpa.ci",
    "validator": "validateur@metfpa.ci",
    "editor": "direction.daf@metfpa.ci",
    "reader": "cabinet@metfpa.ci",
}
V = "/api/metfpa/validation"


def _login(email, password=PWD):
    return requests.post(f"{BASE}/api/metfpa/auth/login",
                         json={"email": email, "password": password}, timeout=20)


@pytest.fixture(scope="session")
def tokens():
    out = {}
    for k, email in ACCOUNTS.items():
        r = _login(email)
        assert r.status_code == 200, f"{email} login failed: {r.status_code} {r.text}"
        out[k] = r.json()["access_token"]
    return out


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


def _mk_decision(tokens, title):
    r = requests.post(f"{BASE}/api/metfpa/decisions", json={"title": title}, headers=_h(tokens["admin"]))
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _mk_risk(tokens, title):
    r = requests.post(f"{BASE}/api/metfpa/risks",
                      json={"title": title, "probability": 3, "impact": 3}, headers=_h(tokens["admin"]))
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _any_activity(tokens):
    r = requests.get(f"{BASE}/api/metfpa/activities", headers=_h(tokens["admin"]))
    assert r.status_code == 200
    return r.json()


def _any_indicator(tokens):
    r = requests.get(f"{BASE}/api/metfpa/indicators", headers=_h(tokens["admin"]))
    assert r.status_code == 200
    return r.json()


# ---------------- Auth & role guards ----------------
class TestGuards:
    def test_401_without_token(self, tokens):
        did = _mk_decision(tokens, "P2 401")
        r = requests.post(f"{BASE}{V}/decisions/{did}", json={"action": "validate"})
        assert r.status_code == 401

    def test_403_editor_cannot_validate(self, tokens):
        did = _mk_decision(tokens, "P2 403 editor")
        r = requests.post(f"{BASE}{V}/decisions/{did}",
                          json={"action": "validate"}, headers=_h(tokens["editor"]))
        assert r.status_code == 403

    def test_403_reader_cannot_validate(self, tokens):
        did = _mk_decision(tokens, "P2 403 reader")
        for action in ["validate", "reject", "request_correction", "comment"]:
            r = requests.post(f"{BASE}{V}/decisions/{did}",
                              json={"action": action, "comment": "x"}, headers=_h(tokens["reader"]))
            assert r.status_code == 403, f"{action}: {r.status_code}"

    def test_403_validator_cannot_reopen(self, tokens):
        did = _mk_decision(tokens, "P2 reopen guard")
        r = requests.post(f"{BASE}{V}/decisions/{did}",
                          json={"action": "validate"}, headers=_h(tokens["validator"]))
        assert r.status_code == 200
        r = requests.post(f"{BASE}{V}/decisions/{did}",
                          json={"action": "reopen"}, headers=_h(tokens["validator"]))
        assert r.status_code == 403


# ---------------- Input validation ----------------
class TestInputs:
    def test_400_reject_requires_comment(self, tokens):
        did = _mk_decision(tokens, "P2 400 reject")
        r = requests.post(f"{BASE}{V}/decisions/{did}",
                          json={"action": "reject"}, headers=_h(tokens["validator"]))
        assert r.status_code == 400

    def test_400_request_correction_requires_comment(self, tokens):
        did = _mk_decision(tokens, "P2 400 corr")
        r = requests.post(f"{BASE}{V}/decisions/{did}",
                          json={"action": "request_correction", "comment": "   "},
                          headers=_h(tokens["validator"]))
        assert r.status_code == 400

    def test_400_invalid_entity_type(self, tokens):
        r = requests.post(f"{BASE}{V}/frameworks/xyz",
                          json={"action": "validate"}, headers=_h(tokens["validator"]))
        assert r.status_code == 400

    def test_400_invalid_action(self, tokens):
        did = _mk_decision(tokens, "P2 400 action")
        r = requests.post(f"{BASE}{V}/decisions/{did}",
                          json={"action": "approve"}, headers=_h(tokens["validator"]))
        assert r.status_code == 400

    def test_404_unknown_id(self, tokens):
        r = requests.post(f"{BASE}{V}/decisions/{uuid.uuid4().hex}",
                          json={"action": "validate"}, headers=_h(tokens["validator"]))
        assert r.status_code == 404


# ---------------- Transitions (state machine) ----------------
class TestTransitions:
    def test_validate_decision(self, tokens):
        did = _mk_decision(tokens, "P2 validate")
        r = requests.post(f"{BASE}{V}/decisions/{did}",
                          json={"action": "validate", "comment": "conforme"},
                          headers=_h(tokens["validator"]))
        assert r.status_code == 200
        d = r.json()
        assert d["validation_status"] == "validated"
        assert d["validated_by"] == ACCOUNTS["validator"]
        assert d["validated_at"]
        assert any(c["action"] == "validate" for c in d["validation_comments"])

    def test_reject_risk_with_comment(self, tokens):
        rid = _mk_risk(tokens, "P2 reject risk")
        r = requests.post(f"{BASE}{V}/risks/{rid}",
                          json={"action": "reject", "comment": "score incohérent"},
                          headers=_h(tokens["validator"]))
        assert r.status_code == 200
        d = r.json()
        assert d["validation_status"] == "rejected"
        assert d["validation_comments"][-1]["text"] == "score incohérent"
        assert d["validation_comments"][-1]["role"] == "me_validator"

    def test_request_correction_on_activity(self, tokens):
        act = next(a for a in _any_activity(tokens)
                   if a.get("validation_status") in (None, "demo", "to_validate"))
        r = requests.post(f"{BASE}{V}/activities/{act['id']}",
                          json={"action": "request_correction", "comment": "budget manquant"},
                          headers=_h(tokens["validator"]))
        assert r.status_code == 200
        assert r.json()["validation_status"] == "correction_requested"
        # cleanup for idempotent re-runs: validate then admin reopen
        requests.post(f"{BASE}{V}/activities/{act['id']}",
                      json={"action": "validate"}, headers=_h(tokens["admin"]))
        requests.post(f"{BASE}{V}/activities/{act['id']}",
                      json={"action": "reopen"}, headers=_h(tokens["admin"]))

    def test_comment_indicator_without_transition(self, tokens):
        ind = _any_indicator(tokens)[0]
        before = ind.get("validation_status")
        r = requests.post(f"{BASE}{V}/indicators/{ind['id']}",
                          json={"action": "comment", "comment": "à vérifier avec la DGE"},
                          headers=_h(tokens["validator"]))
        assert r.status_code == 200
        d = r.json()
        assert d["validation_status"] == before  # unchanged
        assert d["validation_comments"][-1]["text"] == "à vérifier avec la DGE"

    def test_409_validate_twice(self, tokens):
        did = _mk_decision(tokens, "P2 409 twice")
        r1 = requests.post(f"{BASE}{V}/decisions/{did}",
                           json={"action": "validate"}, headers=_h(tokens["validator"]))
        assert r1.status_code == 200
        r2 = requests.post(f"{BASE}{V}/decisions/{did}",
                           json={"action": "validate"}, headers=_h(tokens["validator"]))
        assert r2.status_code == 409

    def test_409_reopen_on_pending(self, tokens):
        did = _mk_decision(tokens, "P2 409 reopen")
        r = requests.post(f"{BASE}{V}/decisions/{did}",
                          json={"action": "reopen"}, headers=_h(tokens["admin"]))
        assert r.status_code == 409

    def test_correction_then_validate(self, tokens):
        did = _mk_decision(tokens, "P2 corr->validate")
        r = requests.post(f"{BASE}{V}/decisions/{did}",
                          json={"action": "request_correction", "comment": "préciser l'échéance"},
                          headers=_h(tokens["validator"]))
        assert r.status_code == 200
        r = requests.post(f"{BASE}{V}/decisions/{did}",
                          json={"action": "validate"}, headers=_h(tokens["validator"]))
        assert r.status_code == 200
        assert r.json()["validation_status"] == "validated"

    def test_rejected_then_request_correction(self, tokens):
        did = _mk_decision(tokens, "P2 rejected->corr")
        requests.post(f"{BASE}{V}/decisions/{did}",
                      json={"action": "reject", "comment": "doublon"}, headers=_h(tokens["validator"]))
        r = requests.post(f"{BASE}{V}/decisions/{did}",
                          json={"action": "request_correction", "comment": "fusionner puis re-soumettre"},
                          headers=_h(tokens["validator"]))
        assert r.status_code == 200
        assert r.json()["validation_status"] == "correction_requested"

    def test_admin_reopen_validated(self, tokens):
        did = _mk_decision(tokens, "P2 admin reopen")
        requests.post(f"{BASE}{V}/decisions/{did}",
                      json={"action": "validate"}, headers=_h(tokens["validator"]))
        r = requests.post(f"{BASE}{V}/decisions/{did}",
                          json={"action": "reopen"}, headers=_h(tokens["admin"]))
        assert r.status_code == 200
        d = r.json()
        assert d["validation_status"] == "to_validate"
        assert "validated_by" not in d and "validated_at" not in d


# ---------------- Indicator ids (backfill) ----------------
class TestIndicatorIds:
    def test_all_indicators_have_unique_ids(self, tokens):
        inds = _any_indicator(tokens)
        assert len(inds) > 0
        ids = [i.get("id") for i in inds]
        assert all(ids), "indicateur sans id"
        assert len(set(ids)) == len(ids), "ids non uniques"


# ---------------- Audit log ----------------
class TestAudit:
    def test_actions_are_audited(self, tokens):
        did = _mk_decision(tokens, "P2 audit trail")
        requests.post(f"{BASE}{V}/decisions/{did}",
                      json={"action": "reject", "comment": "trace"}, headers=_h(tokens["validator"]))
        log = requests.get(f"{BASE}/api/metfpa/audit-log", headers=_h(tokens["admin"]))
        assert log.status_code == 200
        entries = [e for e in log.json() if e.get("entite_id") == did]
        assert any(e["action"] == "validation_reject" for e in entries)
        rej = next(e for e in entries if e["action"] == "validation_reject")
        assert rej["user"] == ACCOUNTS["validator"]
        assert rej["avant"] == {"validation_status": "to_validate"}
        assert rej["apres"]["validation_status"] == "rejected"
