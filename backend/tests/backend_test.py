"""Backend API tests for Cockpit PND 2026-2030 — Iteration 2"""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://etat-progression.preview.emergentagent.com"
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "ministre@pnd.ci")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "PND2030!")
DIRECTOR_EMAIL = os.getenv("PND_DIRECTOR_EMAIL", "koffi.kouassi@pnd.ci")
DIRECTOR_PASSWORD = os.getenv("PND_DIRECTOR_PASSWORD", "Directeur2030!")


def _login(email, pw):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw}, timeout=20)
    return r


@pytest.fixture(scope="session")
def auth_token():
    r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
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
        r = _login(ADMIN_EMAIL, "WRONG_PWD")
        assert r.status_code == 401

    def test_login_director(self):
        r = _login(DIRECTOR_EMAIL, DIRECTOR_PASSWORD)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user"]["email"] == DIRECTOR_EMAIL
        assert body["user"]["role"] == "directeur"
        assert body["user"]["name"] == "Koffi Kouassi"

    def test_me(self, client):
        r = client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_unauth(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401


# ---------- FILTERS ----------
class TestFilters:
    def test_filters(self, client):
        r = client.get(f"{BASE_URL}/api/filters")
        assert r.status_code == 200
        data = r.json()
        assert len(data["pillars"]) == 6
        assert len(data["sectors"]) == 30
        assert data["years"] == [2026, 2027, 2028, 2029, 2030]
        assert isinstance(data["owners"], list) and len(data["owners"]) == 12


# ---------- DASHBOARD ----------
class TestDashboard:
    def test_dashboard(self, client):
        r = client.get(f"{BASE_URL}/api/dashboard")
        assert r.status_code == 200
        data = r.json()
        for k in ("total_budget", "spent", "global_progress", "total_actions", "late_actions", "execution_rate"):
            assert k in data["kpis"]
        assert data["kpis"]["total_actions"] == 720
        assert len(data["donut"]) == 6
        # donut entries have code (pillar) for color mapping
        for d in data["donut"]:
            assert d["code"] in ("1", "2", "3", "4", "5", "6")
        assert len(data["trajectory"]) == 5
        # trajectory year 2026 should have actual filled, others None
        assert data["trajectory"][0]["actual"] is not None
        assert data["trajectory"][1]["actual"] is None
        assert len(data["top_actions"]) == 10

    def test_dashboard_filter_pillar(self, client):
        r = client.get(f"{BASE_URL}/api/dashboard", params={"pillar": "1"})
        assert r.status_code == 200
        assert r.json()["kpis"]["total_actions"] == 120


# ---------- ACTIONS ----------
class TestActions:
    def test_list_actions_pagination(self, client):
        r = client.get(f"{BASE_URL}/api/actions", params={"page": 1, "page_size": 12})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 720
        assert len(data["items"]) == 12

    def test_get_action(self, client):
        r = client.get(f"{BASE_URL}/api/actions/1.01.1.1.1")
        assert r.status_code == 200
        a = r.json()
        assert a["code"] == "1.01.1.1.1"
        # iteration 2 fields
        assert "description" in a
        assert "history" in a and isinstance(a["history"], list)
        assert "comments" in a and isinstance(a["comments"], list)

    def test_get_action_404(self, client):
        r = client.get(f"{BASE_URL}/api/actions/9.99.9.9.9")
        assert r.status_code == 404

    def test_update_action_creates_history_entry(self, client):
        code = "1.01.1.1.2"
        orig = client.get(f"{BASE_URL}/api/actions/{code}").json()
        hist_count_before = len(orig.get("history", []))
        new_progress = (orig["progress"] + 7) % 100
        payload = {"progress": new_progress, "status": "en_cours"}
        r = client.put(f"{BASE_URL}/api/actions/{code}", json=payload)
        assert r.status_code == 200
        body = r.json()
        assert body["progress"] == new_progress
        # history should grow with the diff entries
        assert len(body["history"]) > hist_count_before
        # last entry should reference admin name and avancement field
        last = body["history"][-1]
        assert last["user"] == "Cabinet du Premier Ministre"
        assert "Avancement" in last["field"] or "Statut" in last["field"]
        assert "old" in last and "new" in last
        # restore
        client.put(f"{BASE_URL}/api/actions/{code}",
                   json={"progress": orig["progress"], "status": orig["status"]})

    def test_update_action_clamps_progress(self, client):
        code = "1.01.1.1.3"
        orig = client.get(f"{BASE_URL}/api/actions/{code}").json()
        r = client.put(f"{BASE_URL}/api/actions/{code}", json={"progress": 150})
        assert r.status_code == 200
        assert r.json()["progress"] == 100
        client.put(f"{BASE_URL}/api/actions/{code}", json={"progress": orig["progress"]})

    def test_add_comment_persists(self, client):
        code = "1.01.1.1.4"
        before = client.get(f"{BASE_URL}/api/actions/{code}").json()
        before_count = len(before.get("comments", []))
        r = client.post(f"{BASE_URL}/api/actions/{code}/comments",
                        json={"text": "TEST_Commentaire automatisé"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["text"] == "TEST_Commentaire automatisé"
        assert body["author"] == "Cabinet du Premier Ministre"
        assert "date" in body
        # verify persistence
        after = client.get(f"{BASE_URL}/api/actions/{code}").json()
        assert len(after["comments"]) == before_count + 1
        assert after["comments"][-1]["text"] == "TEST_Commentaire automatisé"


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


# ---------- ANALYTICS (iteration 2 contract) ----------
class TestAnalytics:
    def test_analytics(self, client):
        r = client.get(f"{BASE_URL}/api/analytics")
        assert r.status_code == 200
        data = r.json()
        assert len(data["stacked"]) == 6
        assert "variance" in data and "planned" in data["variance"] and "actual" in data["variance"]
        assert len(data["execution"]) == 30
        for row in data["stacked"]:
            for y in ("2026", "2027", "2028", "2029", "2030"):
                assert y in row


# ---------- ALERTS (new flat items+counts contract) ----------
class TestAlerts:
    def test_alerts(self, client):
        r = client.get(f"{BASE_URL}/api/alerts")
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and isinstance(data["items"], list)
        assert "counts" in data
        for k in ("bloque", "retard", "budget_nul", "critique", "majeur", "mineur"):
            assert k in data["counts"]
        # totals: type counts sum to total items
        c = data["counts"]
        assert c["bloque"] + c["retard"] + c["budget_nul"] == data["total"] == len(data["items"])
        # each item carries required fields
        if data["items"]:
            it = data["items"][0]
            for k in ("code", "title", "owner", "pillar_code", "type", "severity", "days_late", "detail", "end_date"):
                assert k in it
            assert it["severity"] in ("critique", "majeur", "mineur")
            assert it["type"] in ("bloque", "retard", "budget_nul")


# ---------- MINISTRIES ----------
class TestMinistries:
    def test_ministries(self, client):
        r = client.get(f"{BASE_URL}/api/ministries")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 12
        # sorted by total_budget desc
        budgets = [m["total_budget"] for m in data]
        assert budgets == sorted(budgets, reverse=True)
        for m in data:
            for k in ("owner", "count", "total_budget", "exec_rate", "progress", "alerts"):
                assert k in m


# ---------- NOTIFICATIONS ----------
class TestNotifications:
    def test_notifications(self, client):
        r = client.get(f"{BASE_URL}/api/notifications")
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "total" in data
        assert len(data["items"]) <= 5
        if data["items"]:
            n = data["items"][0]
            for k in ("code", "title", "type", "severity", "date", "owner"):
                assert k in n
