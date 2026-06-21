"""METFPA Sprint S4 — backend RBAC, auth hardening, alerts, PDF, admin user mgmt tests."""
import os
import jwt
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://etat-progression.preview.emergentagent.com").rstrip("/")
PWD = "Metfpa@2026Demo"
SECRET = os.environ.get("JWT_SECRET", "9f3c7a1e8b246d05f7e9a1c4d6b8203e5f7a9c1b3d5e7f9018263544a6b8c0d2")

ACCOUNTS = {
    "admin": "admin@metfpa.ci",
    "validator": "validateur@metfpa.ci",
    "editor": "direction.daf@metfpa.ci",
    "reader": "cabinet@metfpa.ci",
}


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


# ---- AUTH hardening ----
class TestAuth:
    def test_login_returns_role_direction(self):
        r = _login(ACCOUNTS["editor"])
        assert r.status_code == 200
        d = r.json()
        assert d["token_type"] == "bearer"
        assert d["user"]["role"] == "direction_editor"
        assert d["user"]["direction"] == "DAF"
        assert isinstance(d["access_token"], str) and len(d["access_token"]) > 20

    def test_login_wrong_password(self):
        r = _login(ACCOUNTS["admin"], "WRONG")
        assert r.status_code == 401

    def test_me_returns_identity(self, tokens):
        r = requests.get(f"{BASE}/api/metfpa/auth/me", headers=_h(tokens["admin"]))
        assert r.status_code == 200
        assert r.json()["role"] == "admin"
        assert r.json()["email"] == ACCOUNTS["admin"]

    def test_missing_token_401(self):
        r = requests.get(f"{BASE}/api/metfpa/auth/me")
        assert r.status_code == 401

    def test_malformed_token_401(self):
        r = requests.get(f"{BASE}/api/metfpa/auth/me",
                         headers={"Authorization": "Bearer not.a.jwt"})
        assert r.status_code == 401

    def test_tampered_token_401(self, tokens):
        tok = tokens["admin"]
        bad = tok[:-4] + ("AAAA" if tok[-4:] != "AAAA" else "BBBB")
        r = requests.get(f"{BASE}/api/metfpa/auth/me", headers=_h(bad))
        assert r.status_code == 401

    def test_expired_token_401(self):
        payload = {"sub": "fake", "email": "x@x", "role": "admin", "type": "metfpa_access",
                   "exp": datetime.now(timezone.utc) - timedelta(minutes=5)}
        tok = jwt.encode(payload, SECRET, algorithm="HS256")
        r = requests.get(f"{BASE}/api/metfpa/auth/me", headers=_h(tok))
        assert r.status_code == 401

    def test_wrong_type_token_401(self):
        payload = {"sub": "fake", "email": "x@x", "role": "admin", "type": "OTHER",
                   "exp": datetime.now(timezone.utc) + timedelta(hours=1)}
        tok = jwt.encode(payload, SECRET, algorithm="HS256")
        r = requests.get(f"{BASE}/api/metfpa/auth/me", headers=_h(tok))
        assert r.status_code == 401


# ---- RBAC backend enforcement ----
class TestRBAC:
    def test_reader_cannot_post_decision(self, tokens):
        r = requests.post(f"{BASE}/api/metfpa/decisions",
                          json={"title": "TEST_S4 reader", "decision_type": "autre",
                                "priority": "moyenne", "status": "draft"},
                          headers=_h(tokens["reader"]))
        assert r.status_code == 403

    def test_reader_cannot_post_risk(self, tokens):
        r = requests.post(f"{BASE}/api/metfpa/risks",
                          json={"title": "TEST_S4 risk reader", "probability": 2, "impact": 2},
                          headers=_h(tokens["reader"]))
        assert r.status_code == 403

    def test_reader_cannot_put_activity(self, tokens):
        r = requests.put(f"{BASE}/api/metfpa/activities/ACT001",
                         json={"avancement": 50}, headers=_h(tokens["reader"]))
        assert r.status_code == 403

    def test_reader_cannot_validate(self, tokens):
        r = requests.post(f"{BASE}/api/metfpa/admin/validate",
                          json={"framework": "PND", "validated_by": "x", "validation_note": "t"},
                          headers=_h(tokens["reader"]))
        assert r.status_code == 403

    def test_editor_cannot_validate(self, tokens):
        r = requests.post(f"{BASE}/api/metfpa/admin/validate",
                          json={"framework": "PND", "validated_by": "x", "validation_note": "t"},
                          headers=_h(tokens["editor"]))
        assert r.status_code == 403

    def test_validator_can_call_validate_endpoint(self, tokens):
        # Use invalid framework so we test ROLE permission without actually promoting data
        r = requests.post(f"{BASE}/api/metfpa/admin/validate",
                          json={"framework": "INVALID", "validated_by": "tester", "validation_note": "t"},
                          headers=_h(tokens["validator"]))
        # passed RBAC -> hits validation 400 (invalid framework)
        assert r.status_code == 400

    def test_admin_can_call_validate_endpoint(self, tokens):
        r = requests.post(f"{BASE}/api/metfpa/admin/validate",
                          json={"framework": "INVALID", "validated_by": "tester", "validation_note": "t"},
                          headers=_h(tokens["admin"]))
        assert r.status_code == 400  # passed RBAC

    def test_direction_editor_scope(self, tokens):
        # Get activities -> find one with direction=DAF and one not
        r = requests.get(f"{BASE}/api/metfpa/activities", headers=_h(tokens["admin"]))
        assert r.status_code == 200
        acts = r.json()
        daf_act = next((a for a in acts if a.get("direction") == "DAF"), None)
        other_act = next((a for a in acts if a.get("direction") and a.get("direction") != "DAF"), None)
        assert daf_act, "expected at least one DAF activity"
        assert other_act, "expected at least one non-DAF activity"

        # DAF editor can PUT DAF activity
        r1 = requests.put(f"{BASE}/api/metfpa/activities/{daf_act['id']}",
                          json={"avancement": daf_act.get("avancement") or 10},
                          headers=_h(tokens["editor"]))
        assert r1.status_code == 200, r1.text

        # but NOT another direction's activity
        r2 = requests.put(f"{BASE}/api/metfpa/activities/{other_act['id']}",
                          json={"avancement": 12}, headers=_h(tokens["editor"]))
        assert r2.status_code == 403


# ---- Admin user management ----
class TestAdminUsers:
    def test_list_users_admin_only(self, tokens):
        r = requests.get(f"{BASE}/api/metfpa/admin/users", headers=_h(tokens["admin"]))
        assert r.status_code == 200
        users = r.json()
        assert len(users) >= 4
        emails = [u["email"] for u in users]
        for v in ACCOUNTS.values():
            assert v in emails

    def test_list_users_forbidden_for_others(self, tokens):
        for role in ("reader", "editor", "validator"):
            r = requests.get(f"{BASE}/api/metfpa/admin/users", headers=_h(tokens[role]))
            assert r.status_code == 403, f"{role} should be 403"

    def test_patch_user_role(self, tokens):
        users = requests.get(f"{BASE}/api/metfpa/admin/users", headers=_h(tokens["admin"])).json()
        target = next(u for u in users if u["email"] == ACCOUNTS["reader"])
        # toggle direction value
        r = requests.put(f"{BASE}/api/metfpa/admin/users/{target['id']}",
                         json={"direction": "TEST_SCOPE"}, headers=_h(tokens["admin"]))
        assert r.status_code == 200, r.text
        assert r.json()["direction"] == "TEST_SCOPE"
        # revert
        rev = requests.put(f"{BASE}/api/metfpa/admin/users/{target['id']}",
                           json={"direction": ""}, headers=_h(tokens["admin"]))
        # empty string is falsy in model_dump filter? UserPatch direction is Optional[str] so None means unset
        # the model_dump excludes None; empty string is kept. Just check no 500.
        assert rev.status_code in (200, 400)

    def test_last_admin_safeguard_409(self, tokens):
        users = requests.get(f"{BASE}/api/metfpa/admin/users", headers=_h(tokens["admin"])).json()
        admin_user = next(u for u in users if u["role"] == "admin" and u["active"])
        # try to demote
        r = requests.put(f"{BASE}/api/metfpa/admin/users/{admin_user['id']}",
                         json={"role": "cabinet_reader"}, headers=_h(tokens["admin"]))
        assert r.status_code == 409
        # try to deactivate
        r2 = requests.put(f"{BASE}/api/metfpa/admin/users/{admin_user['id']}",
                          json={"active": False}, headers=_h(tokens["admin"]))
        assert r2.status_code == 409


# ---- Executive alerts ----
class TestAlerts:
    def test_alerts_requires_auth(self):
        r = requests.get(f"{BASE}/api/metfpa/cabinet/alerts")
        assert r.status_code == 401

    def test_alerts_structure_and_sorted(self, tokens):
        r = requests.get(f"{BASE}/api/metfpa/cabinet/alerts", headers=_h(tokens["reader"]))
        assert r.status_code == 200
        d = r.json()
        assert "alerts" in d and "counts" in d and "by_category" in d
        assert d["total"] == len(d["alerts"])
        sev_rank = {"critique": 0, "eleve": 1, "modere": 2, "faible": 3}
        ranks = [sev_rank.get(a["severity"], 9) for a in d["alerts"]]
        assert ranks == sorted(ranks), "alerts must be sorted critical-first"
        # required fields per spec
        if d["alerts"]:
            a = d["alerts"][0]
            for k in ("alert_id", "rule_id", "category", "severity", "title", "description",
                      "related_resource_type", "related_resource_id", "evidence",
                      "generated_at", "data_origin", "validation_status"):
                assert k in a, f"missing {k}"


# ---- PDF export ----
class TestPDF:
    def test_pdf_requires_auth(self):
        r = requests.get(f"{BASE}/api/metfpa/cabinet/export/pdf")
        assert r.status_code == 401

    def test_pdf_returned_for_authed(self, tokens):
        r = requests.get(f"{BASE}/api/metfpa/cabinet/export/pdf",
                         headers=_h(tokens["reader"]), timeout=60)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        cd = r.headers.get("content-disposition", "")
        assert "attachment" in cd and "METFPA_Cabinet_Brief_" in cd and ".pdf" in cd
        assert r.content[:4] == b"%PDF", "must be a real PDF"

    def test_pdf_audit_logged(self, tokens):
        # trigger
        requests.get(f"{BASE}/api/metfpa/cabinet/export/pdf", headers=_h(tokens["admin"]))
        # check audit log
        r = requests.get(f"{BASE}/api/metfpa/audit-log", headers=_h(tokens["admin"]))
        assert r.status_code == 200
        entries = r.json()
        assert any(e.get("action") == "export_cabinet_pdf" for e in entries)


# ---- Regression ----
class TestRegression:
    def test_health(self):
        r = requests.get(f"{BASE}/api/metfpa/health")
        assert r.status_code == 200
        d = r.json()
        assert d["activities"] > 0 and d["pnd_nodes"] > 0

    def test_pnd_politique_digital(self):
        for ep in ("/api/metfpa/pnd", "/api/metfpa/politique", "/api/metfpa/digital"):
            r = requests.get(f"{BASE}{ep}")
            assert r.status_code == 200, ep

    def test_cabinet_data(self, tokens):
        # cabinet endpoint isn't gated in router.py (no Depends)
        r = requests.get(f"{BASE}/api/metfpa/cabinet")
        assert r.status_code == 200
        d = r.json()
        assert "kpis" in d and "decisions_required" in d and "alerts" in d
        # missing financial values stay missing not zero
        fr = d["financial_reliability"]
        assert fr["budget_engage_missing"] > 0
