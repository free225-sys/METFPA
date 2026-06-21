"""METFPA S3B backend tests — cabinet aggregation, Decision/Risk CRUD with audit,
budget consolidated (4 modes), and activity history."""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api/metfpa"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json", "x-user": "pytest"})
    return sess


# ---------- Cabinet aggregation ----------
class TestCabinet:
    def test_cabinet_shape(self, s):
        r = s.get(f"{API}/cabinet", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("kpis", "decisions_required", "alerts", "deadlines_upcoming",
                  "deadlines_overdue", "risks_critical_high", "top_costly",
                  "progress_summary", "financial_reliability"):
            assert k in d, f"missing key {k}"
        for kk in ("activites", "alertes", "bloques", "en_retard",
                   "decisions_en_attente", "risques_critiques", "avancement_moyen"):
            assert kk in d["kpis"], f"missing kpi {kk}"
        # 62 activities, all missing budget_engage / source_financement
        assert d["kpis"]["activites"] == 62
        assert d["financial_reliability"]["budget_engage_missing"] == 62
        assert d["financial_reliability"]["source_financement_missing"] == 62


# ---------- Budget consolidated (4 modes) ----------
class TestBudget:
    def test_budget_consolidated(self, s):
        r = s.get(f"{API}/budget/consolidated", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["requires_client_validation"] is True
        assert d["comparison_modes"] == ["total", "annual_average", "overlap_period", "source_framework"]
        assert d["annotation"]
        assert d["overlap_note"]
        assert len(d["items"]) >= 3
        frames = {it["framework"]: it for it in d["items"]}
        for fw in ("PND", "POL", "DIG"):
            assert fw in frames, f"missing framework {fw}"
            it = frames[fw]
            for k in ("framework", "period_start", "period_end", "period_years",
                      "total", "annual_average", "overlap_years", "overlap_value",
                      "budget_scope", "source", "validation_status"):
                assert k in it, f"missing item key {k} for {fw}"
            assert it["overlap_years"] == 5, f"{fw} overlap_years expected 5 got {it['overlap_years']}"


# ---------- Decisions CRUD + audit ----------
class TestDecisions:
    @pytest.fixture(scope="class")
    def created_id(self, s):
        payload = {
            "title": "TEST_S3B decision",
            "description": "auto",
            "decision_type": "arbitrage",
            "priority": "haute",
            "status": "pending",
        }
        r = s.post(f"{API}/decisions", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["data_origin"] == "demo_tracking"
        assert d["validation_status"] == "to_validate"
        assert d["title"] == payload["title"]
        assert "id" in d
        yield d["id"]
        # cleanup
        s.delete(f"{API}/decisions/{d['id']}")

    def test_invalid_status_422(self, s):
        r = s.post(f"{API}/decisions", json={"title": "x", "status": "BAD"}, timeout=15)
        assert r.status_code == 422

    def test_list(self, s, created_id):
        r = s.get(f"{API}/decisions")
        assert r.status_code == 200
        ids = [d["id"] for d in r.json()]
        assert created_id in ids

    def test_get_one(self, s, created_id):
        r = s.get(f"{API}/decisions/{created_id}")
        assert r.status_code == 200
        assert r.json()["id"] == created_id

    def test_get_404(self, s):
        r = s.get(f"{API}/decisions/NOPE_404")
        assert r.status_code == 404

    def test_update(self, s, created_id):
        payload = {"title": "TEST_S3B decision updated", "decision_type": "arbitrage",
                   "priority": "critique", "status": "approved"}
        r = s.put(f"{API}/decisions/{created_id}", json=payload)
        assert r.status_code == 200
        body = r.json()
        assert body["title"] == "TEST_S3B decision updated"
        assert body["status"] == "approved"
        assert body["priority"] == "critique"

    def test_audit_has_entries(self, s, created_id):
        r = s.get(f"{API}/audit-log")
        assert r.status_code == 200
        entries = [e for e in r.json() if e.get("entite") == "decision" and e.get("entite_id") == created_id]
        actions = {e["action"] for e in entries}
        # at least create + update should be logged
        assert "create_decision" in actions
        assert "update_decision" in actions


# ---------- Risks CRUD with auto-scoring ----------
class TestRisks:
    def test_invalid_probability_422(self, s):
        r = s.post(f"{API}/risks",
                   json={"title": "x", "probability": 9, "impact": 3}, timeout=15)
        assert r.status_code == 422

    def test_invalid_impact_422(self, s):
        r = s.post(f"{API}/risks",
                   json={"title": "x", "probability": 3, "impact": 0}, timeout=15)
        assert r.status_code == 422

    def test_score_severity_critique(self, s):
        r = s.post(f"{API}/risks", json={
            "title": "TEST_S3B critique", "probability": 5, "impact": 4,
            "category": "operationnel", "status": "open"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["risk_score"] == 20
        assert d["severity"] == "critique"
        assert d["data_origin"] == "demo_tracking"
        rid = d["id"]

        # PUT recomputes
        r2 = s.put(f"{API}/risks/{rid}", json={
            "title": "TEST_S3B faible", "probability": 1, "impact": 2,
            "category": "operationnel", "status": "open"})
        assert r2.status_code == 200
        u = r2.json()
        assert u["risk_score"] == 2
        assert u["severity"] == "faible"

        # GET sorted by score desc — fetch list and verify sort
        rl = s.get(f"{API}/risks").json()
        scores = [r.get("risk_score") or 0 for r in rl]
        assert scores == sorted(scores, reverse=True)

        # audit has create + update for this risk
        audit = s.get(f"{API}/audit-log").json()
        actions = {e["action"] for e in audit if e.get("entite") == "risk" and e.get("entite_id") == rid}
        assert "create_risk" in actions and "update_risk" in actions

        # cleanup
        dr = s.delete(f"{API}/risks/{rid}")
        assert dr.status_code == 200
        # confirm deletion
        g = s.get(f"{API}/risks/{rid}")
        assert g.status_code == 404


# ---------- Activity history ----------
class TestActivityHistory:
    def test_unknown_404(self, s):
        r = s.get(f"{API}/activities/NOPE_ID/history")
        assert r.status_code == 404

    def test_history_after_edit(self, s):
        # Edit ACT001 to produce a history entry then read it back
        r = s.put(f"{API}/activities/ACT001",
                  json={"avancement": 42, "statut": "En cours", "alerte": "TEST_S3B_HISTORY"})
        assert r.status_code == 200, r.text
        h = s.get(f"{API}/activities/ACT001/history")
        assert h.status_code == 200
        data = h.json()
        assert data["activity_id"] == "ACT001"
        assert data["count"] >= 1
        latest = data["entries"][0]
        assert latest["entite"] == "activity"
        assert latest["entite_id"] == "ACT001"
        assert "horodatage" in latest
        # cleanup alert
        s.put(f"{API}/activities/ACT001", json={"alerte": ""})
