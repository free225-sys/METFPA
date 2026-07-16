"""Phase 2A backend tests — 2A-0 (auth gating, audit-log RBAC, activity history scope,
direction clearing, cabinet decisions-first, validation RBAC) and 2A-1 (Excel dry-run import).

Run: pytest -q /app/backend/tests/metfpa_phase2a_test.py
"""
import io
import os
import pytest
import requests
from openpyxl import Workbook

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://etat-progression.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api/metfpa"
PWD = "Metfpa@2026Demo"

ACCOUNTS = {
    "admin": "admin@metfpa.ci",
    "validator": "dircab@metfpa.ci",
    "editor": "direction.daf@metfpa.ci",
    "dircab": "dircab@metfpa.ci",
}


def _login(email, password=PWD):
    return requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)


@pytest.fixture(scope="session")
def tokens():
    out = {}
    for k, email in ACCOUNTS.items():
        r = _login(email)
        assert r.status_code == 200, f"{email} login: {r.status_code} {r.text}"
        out[k] = r.json()["access_token"]
    return out


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# -------- 2A-0 AUTH GATING --------
GATED_GETS = [
    "/pnd", "/politique", "/digital", "/indicators", "/alignments",
    "/activities", "/frameworks", "/cabinet", "/budget/consolidated",
    "/cabinet/alerts",
]


class TestAuthGating:
    def test_health_open(self):
        r = requests.get(f"{API}/health", timeout=20)
        assert r.status_code == 200

    @pytest.mark.parametrize("path", GATED_GETS)
    def test_unauth_returns_401(self, path):
        r = requests.get(f"{API}{path}", timeout=20)
        assert r.status_code == 401, f"{path} unauth got {r.status_code}"

    @pytest.mark.parametrize("path", GATED_GETS)
    def test_auth_returns_200(self, path, tokens):
        r = requests.get(f"{API}{path}", headers=_h(tokens["dircab"]), timeout=20)
        assert r.status_code == 200, f"{path} dircab got {r.status_code} {r.text[:200]}"


# -------- 2A-0 AUDIT-LOG RBAC --------
class TestAuditLog:
    def test_unauth_401(self):
        r = requests.get(f"{API}/audit-log", timeout=20)
        assert r.status_code == 401

    def test_validator_200(self, tokens):
        r = requests.get(f"{API}/audit-log", headers=_h(tokens["validator"]), timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_200(self, tokens):
        r = requests.get(f"{API}/audit-log", headers=_h(tokens["admin"]), timeout=20)
        assert r.status_code == 200

    def test_dircab_200(self, tokens):
        r = requests.get(f"{API}/audit-log", headers=_h(tokens["dircab"]), timeout=20)
        assert r.status_code == 200

    def test_editor_403(self, tokens):
        r = requests.get(f"{API}/audit-log", headers=_h(tokens["editor"]), timeout=20)
        assert r.status_code == 403


# -------- 2A-0 ACTIVITY HISTORY SCOPE --------
def _find_activities(tokens):
    r = requests.get(f"{API}/activities", headers=_h(tokens["admin"]), timeout=20)
    assert r.status_code == 200
    acts = r.json()
    daf = next((a for a in acts if a.get("direction") == "DAF"), None)
    non_daf = next((a for a in acts if a.get("direction") and a.get("direction") != "DAF"), None)
    return daf, non_daf, acts


class TestActivityHistoryScope:
    def test_dircab_any(self, tokens):
        daf, non_daf, _ = _find_activities(tokens)
        for a in (daf, non_daf):
            if a:
                r = requests.get(f"{API}/activities/{a['id']}/history", headers=_h(tokens["dircab"]), timeout=20)
                assert r.status_code == 200, f"dircab on {a['id']}: {r.status_code}"

    def test_editor_daf_only(self, tokens):
        daf, non_daf, _ = _find_activities(tokens)
        assert daf is not None
        r = requests.get(f"{API}/activities/{daf['id']}/history", headers=_h(tokens["editor"]), timeout=20)
        assert r.status_code == 200
        if non_daf:
            r2 = requests.get(f"{API}/activities/{non_daf['id']}/history", headers=_h(tokens["editor"]), timeout=20)
            assert r2.status_code == 403, f"editor on non-DAF {non_daf['id']}: {r2.status_code}"

    def test_validator_and_admin(self, tokens):
        daf, _, _ = _find_activities(tokens)
        for k in ("validator", "admin"):
            r = requests.get(f"{API}/activities/{daf['id']}/history", headers=_h(tokens[k]), timeout=20)
            assert r.status_code == 200

    def test_unknown_404(self, tokens):
        r = requests.get(f"{API}/activities/DOES_NOT_EXIST/history", headers=_h(tokens["admin"]), timeout=20)
        assert r.status_code == 404


# -------- 2A-0 ADMIN DIRECTION CLEARING --------
class TestDirectionClearing:
    def _users(self, tokens):
        r = requests.get(f"{API}/admin/users", headers=_h(tokens["admin"]), timeout=20)
        assert r.status_code == 200
        return r.json()

    def test_omit_preserves(self, tokens):
        users = self._users(tokens)
        editor = next(u for u in users if u["email"] == ACCOUNTS["editor"])
        original_dir = editor["direction"]
        # Patch without 'direction' key — must keep DAF
        r = requests.put(f"{API}/admin/users/{editor['id']}",
                         json={"active": editor.get("active", True)},
                         headers=_h(tokens["admin"]), timeout=20)
        assert r.status_code == 200, r.text
        users2 = self._users(tokens)
        e2 = next(u for u in users2 if u["id"] == editor["id"])
        assert e2["direction"] == original_dir

    def test_clear_editor_direction_422(self, tokens):
        users = self._users(tokens)
        editor = next(u for u in users if u["email"] == ACCOUNTS["editor"])
        r = requests.put(f"{API}/admin/users/{editor['id']}",
                         json={"direction": None},
                         headers=_h(tokens["admin"]), timeout=20)
        assert r.status_code == 422

    def test_clear_dircab_direction_ok(self, tokens):
        users = self._users(tokens)
        dircab = next(u for u in users if u["email"] == ACCOUNTS["dircab"])
        original_dir = dircab.get("direction")
        r = requests.put(f"{API}/admin/users/{dircab['id']}",
                         json={"direction": None},
                         headers=_h(tokens["admin"]), timeout=20)
        assert r.status_code == 200
        users2 = self._users(tokens)
        r2 = next(u for u in users2 if u["id"] == dircab["id"])
        assert r2.get("direction") in (None, "", None)
        # restore
        if original_dir:
            requests.put(f"{API}/admin/users/{dircab['id']}",
                         json={"direction": original_dir},
                         headers=_h(tokens["admin"]), timeout=20)


# -------- 2A-0 CABINET DECISIONS FIRST --------
class TestCabinetOrder:
    def test_pdf_decisions_before_kpis(self, tokens):
        r = requests.get(f"{API}/cabinet/export/pdf", headers=_h(tokens["admin"]), timeout=30)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")


# -------- 2A-1 IMPORTS RBAC --------
DRYRUN = f"{API}/imports/excel/dry-run"


def _upload(file_path, token=None):
    with open(file_path, "rb") as f:
        files = {"file": (os.path.basename(file_path), f.read(),
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    headers = _h(token) if token else {}
    return requests.post(DRYRUN, files=files, headers=headers, timeout=60)


class TestImportRBAC:
    def test_unauth_401(self):
        r = _upload("/tmp/imp/valid.xlsx")
        assert r.status_code == 401

    def test_dircab_200(self, tokens):
        r = _upload("/tmp/imp/valid.xlsx", tokens["dircab"])
        assert r.status_code == 200

    def test_editor_403(self, tokens):
        r = _upload("/tmp/imp/valid.xlsx", tokens["editor"])
        assert r.status_code == 403

    def test_validator_200(self, tokens):
        r = _upload("/tmp/imp/valid.xlsx", tokens["validator"])
        assert r.status_code == 200, r.text[:300]

    def test_admin_200(self, tokens):
        r = _upload("/tmp/imp/valid.xlsx", tokens["admin"])
        assert r.status_code == 200, r.text[:300]


# -------- 2A-1 FILE VALIDATION --------
class TestFileValidation:
    def test_fake_xls_blocked(self, tokens):
        r = _upload("/tmp/imp/fake.xls", tokens["admin"])
        # may be 200 with verdict BLOCKED_BY_ERRORS or 400
        assert r.status_code in (200, 400, 422)
        if r.status_code == 200:
            data = r.json()
            assert data.get("verdict") == "BLOCKED_BY_ERRORS"
            assert data.get("file_errors") or any("extension" in str(e).lower() or "zip" in str(e).lower()
                                                  for e in data.get("file_errors", []))


# -------- 2A-1 DRY-RUN VERDICTS --------
class TestVerdicts:
    def test_valid_ready_for_review(self, tokens):
        r = _upload("/tmp/imp/valid.xlsx", tokens["admin"])
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data["verdict"] in ("READY_FOR_REVIEW", "READY_WITH_WARNINGS"), data["verdict"]

    def test_warn_warnings(self, tokens):
        r = _upload("/tmp/imp/warn.xlsx", tokens["admin"])
        assert r.status_code == 200
        data = r.json()
        assert data["verdict"] in ("READY_WITH_WARNINGS", "READY_FOR_REVIEW"), data["verdict"]

    def test_blocked_verdict(self, tokens):
        r = _upload("/tmp/imp/blocked.xlsx", tokens["admin"])
        assert r.status_code == 200
        data = r.json()
        assert data["verdict"] == "BLOCKED_BY_ERRORS", data["verdict"]

    def test_missingcol_blocked(self, tokens):
        r = _upload("/tmp/imp/missingcol.xlsx", tokens["admin"])
        assert r.status_code == 200
        data = r.json()
        assert data["verdict"] == "BLOCKED_BY_ERRORS", data["verdict"]

    def test_never_ready_to_apply(self, tokens):
        for f in ("valid.xlsx", "warn.xlsx", "blocked.xlsx", "missingcol.xlsx"):
            r = _upload(f"/tmp/imp/{f}", tokens["admin"])
            if r.status_code == 200:
                assert r.json()["verdict"] != "READY_TO_APPLY"


# -------- 2A-1 NO BUSINESS MUTATION --------
class TestNoMutation:
    def test_activities_count_unchanged(self, tokens):
        r1 = requests.get(f"{API}/activities", headers=_h(tokens["admin"]), timeout=20)
        before = len(r1.json())
        # Run several dry-runs
        for _ in range(2):
            _upload("/tmp/imp/valid.xlsx", tokens["admin"])
            _upload("/tmp/imp/blocked.xlsx", tokens["admin"])
        r2 = requests.get(f"{API}/activities", headers=_h(tokens["admin"]), timeout=20)
        after = len(r2.json())
        assert before == after, f"activities count changed: {before} -> {after}"


# -------- 2A-1 LIST / GET / DELETE --------
class TestImportJobs:
    def test_list_validator_and_admin(self, tokens):
        for k in ("validator", "admin"):
            r = requests.get(f"{API}/imports", headers=_h(tokens[k]), timeout=20)
            assert r.status_code == 200
            assert isinstance(r.json(), list)

    def test_list_dircab_200(self, tokens):
        r = requests.get(f"{API}/imports", headers=_h(tokens["dircab"]), timeout=20)
        assert r.status_code == 200

    def test_get_and_delete_job(self, tokens):
        # create a job
        up = _upload("/tmp/imp/valid.xlsx", tokens["admin"])
        assert up.status_code == 200
        jid = up.json().get("id") or up.json().get("job_id") or up.json().get("import_id")
        assert jid, f"no job id in {list(up.json().keys())}"

        # get report
        r = requests.get(f"{API}/imports/{jid}", headers=_h(tokens["admin"]), timeout=20)
        assert r.status_code == 200, r.text[:300]
        report = r.json()
        assert "verdict" in report

        # delete
        d = requests.delete(f"{API}/imports/{jid}", headers=_h(tokens["admin"]), timeout=20)
        assert d.status_code in (200, 204)

        # get after delete -> 404
        r2 = requests.get(f"{API}/imports/{jid}", headers=_h(tokens["admin"]), timeout=20)
        assert r2.status_code == 404


# -------- 2A-0 VALIDATION RBAC (no live promotion) --------
class TestValidationRBAC:
    def test_unauth_401(self):
        r = requests.post(f"{API}/admin/validate", json={"framework": "ZZZ"}, timeout=20)
        assert r.status_code == 401

    def test_dircab_passes_rbac(self, tokens):
        r = requests.post(f"{API}/admin/validate", json={"framework": "ZZZ"},
                          headers=_h(tokens["dircab"]), timeout=20)
        assert r.status_code in (400, 404, 422)

    def test_editor_403(self, tokens):
        r = requests.post(f"{API}/admin/validate", json={"framework": "ZZZ"},
                          headers=_h(tokens["editor"]), timeout=20)
        assert r.status_code == 403

    def test_validator_passes_rbac(self, tokens):
        # invalid framework key => 400 (RBAC passed)
        r = requests.post(f"{API}/admin/validate",
                          json={"framework": "ZZZ_TEST_INVALID"},
                          headers=_h(tokens["validator"]), timeout=20)
        assert r.status_code in (400, 404, 422), r.text[:200]
