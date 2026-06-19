"""Backend API tests for Cockpit PND 2026-2030"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://etat-progression.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "ministre@pnd.ci"
ADMIN_PASSWORD = "PND2030!"


@pytest.fixture(scope="session")
def auth_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    assert data["user"]["email"] == ADMIN_EMAIL
    return data["access_token"]


@pytest.fixture(scope="session")
def client(auth_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"})
    return s


# ---------- AUTH ----------
class TestAuth:
    def test_login_wrong_password(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "WRONG_PWD"}, timeout=15)
        assert r.status_code == 401

    def test_me(self, client):
        r = client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_unauth(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401

    def test_logout(self, client):
        r = client.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200


# ---------- FILTERS ----------
class TestFilters:
    def test_filters(self, client):
        r = client.get(f"{BASE_URL}/api/filters")
        assert r.status_code == 200
        data = r.json()
        assert len(data["pillars"]) == 6
        assert len(data["sectors"]) == 30
        assert data["years"] == [2026, 2027, 2028, 2029, 2030]
        assert isinstance(data["owners"], list) and len(data["owners"]) > 0


# ---------- DASHBOARD ----------
class TestDashboard:
    def test_dashboard(self, client):
        r = client.get(f"{BASE_URL}/api/dashboard")
        assert r.status_code == 200
        data = r.json()
        for k in ("total_budget", "spent", "global_progress", "total_actions", "late_actions"):
            assert k in data["kpis"]
        assert data["kpis"]["total_actions"] == 720
        assert len(data["donut"]) == 6
        assert len(data["trajectory"]) == 5
        assert len(data["top_actions"]) == 10

    def test_dashboard_filter_pillar(self, client):
        r = client.get(f"{BASE_URL}/api/dashboard", params={"pillar": "1"})
        assert r.status_code == 200
        # 120 actions per pillar (5 sectors * 3 effects * 2 products * 4 actions)
        assert r.json()["kpis"]["total_actions"] == 120


# ---------- ACTIONS ----------
class TestActions:
    def test_list_actions_pagination(self, client):
        r = client.get(f"{BASE_URL}/api/actions", params={"page": 1, "page_size": 12})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 720
        assert len(data["items"]) == 12

    def test_list_actions_sort_progress_desc(self, client):
        r = client.get(f"{BASE_URL}/api/actions",
                       params={"sort": "progress", "order": "desc", "page_size": 5})
        assert r.status_code == 200
        items = r.json()["items"]
        progresses = [i["progress"] for i in items]
        assert progresses == sorted(progresses, reverse=True)

    def test_list_actions_filter_status(self, client):
        r = client.get(f"{BASE_URL}/api/actions", params={"status": "bloque", "page_size": 50})
        assert r.status_code == 200
        for it in r.json()["items"]:
            assert it["status"] == "bloque"

    def test_get_action(self, client):
        r = client.get(f"{BASE_URL}/api/actions/1.01.1.1.1")
        assert r.status_code == 200
        assert r.json()["code"] == "1.01.1.1.1"

    def test_get_action_404(self, client):
        r = client.get(f"{BASE_URL}/api/actions/9.99.9.9.9")
        assert r.status_code == 404

    def test_update_action_persists(self, client):
        code = "1.01.1.1.2"
        # save originals to restore
        orig = client.get(f"{BASE_URL}/api/actions/{code}").json()
        payload = {"progress": 77, "status": "en_cours", "title": "TEST_Title_Update"}
        r = client.put(f"{BASE_URL}/api/actions/{code}", json=payload)
        assert r.status_code == 200
        body = r.json()
        assert body["progress"] == 77
        assert body["status"] == "en_cours"
        assert body["title"] == "TEST_Title_Update"
        # verify GET
        g = client.get(f"{BASE_URL}/api/actions/{code}")
        assert g.json()["progress"] == 77
        assert g.json()["title"] == "TEST_Title_Update"
        # restore
        client.put(f"{BASE_URL}/api/actions/{code}",
                   json={"progress": orig["progress"], "status": orig["status"], "title": orig["title"]})

    def test_update_action_clamps_progress(self, client):
        code = "1.01.1.1.3"
        orig = client.get(f"{BASE_URL}/api/actions/{code}").json()
        r = client.put(f"{BASE_URL}/api/actions/{code}", json={"progress": 150})
        assert r.status_code == 200
        assert r.json()["progress"] == 100
        client.put(f"{BASE_URL}/api/actions/{code}", json={"progress": orig["progress"]})


# ---------- TREE ----------
class TestTree:
    def test_tree(self, client):
        r = client.get(f"{BASE_URL}/api/tree")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 6
        p0 = data[0]
        assert p0["level"] == "pillar"
        assert len(p0["children"]) == 5
        s0 = p0["children"][0]
        assert s0["level"] == "sector"
        assert len(s0["children"]) == 3
        e0 = s0["children"][0]
        assert e0["level"] == "effect"
        assert len(e0["children"]) == 2
        pr0 = e0["children"][0]
        assert pr0["level"] == "product"
        assert len(pr0["children"]) == 4
        a0 = pr0["children"][0]
        assert a0["level"] == "action"


# ---------- ANALYTICS ----------
class TestAnalytics:
    def test_analytics(self, client):
        r = client.get(f"{BASE_URL}/api/analytics")
        assert r.status_code == 200
        data = r.json()
        assert len(data["stacked"]) == 6
        assert len(data["waterfall"]) == 3
        assert len(data["execution"]) == 30
        for row in data["stacked"]:
            for y in ("2026", "2027", "2028", "2029", "2030"):
                assert y in row


# ---------- ALERTS ----------
class TestAlerts:
    def test_alerts(self, client):
        r = client.get(f"{BASE_URL}/api/alerts")
        assert r.status_code == 200
        data = r.json()
        for k in ("blocked", "overdue", "zero_budget", "counts"):
            assert k in data
        assert data["counts"]["blocked"] == len(data["blocked"])
        assert data["counts"]["overdue"] == len(data["overdue"])
        assert data["counts"]["zero_budget"] == len(data["zero_budget"])
