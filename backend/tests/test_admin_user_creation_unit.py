import asyncio
from copy import deepcopy
import os
from pathlib import Path
import sys

import pytest
from fastapi import HTTPException


os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "metfpa_unit_test")
os.environ.setdefault("JWT_SECRET", "unit-test-only")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from metfpa import auth  # noqa: E402


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [deepcopy(doc) for doc in (docs or [])]

    async def distinct(self, key):
        return list({doc.get(key) for doc in self.docs if doc.get(key) is not None})

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                return deepcopy(doc)
        return None

    async def insert_one(self, doc):
        self.docs.append(deepcopy(doc))


class FakeDB:
    def __init__(self):
        self.users = FakeCollection([
            {"id": "admin-1", "email": "admin@metfpa.ci", "name": "Admin", "role": "admin", "active": True},
        ])
        self.activities = FakeCollection([
            {"id": "mission-1", "direction": "DAF"},
            {"id": "mission-2", "direction": "AGEFOP"},
        ])


ADMIN = {"email": "admin@metfpa.ci", "role": "admin"}


def test_admin_creates_scoped_agency_account(monkeypatch):
    async def scenario():
        fake = FakeDB()
        audits = []

        async def fake_audit(*args, **kwargs):
            audits.append((args, kwargs))

        monkeypatch.setattr(auth, "mdb", fake)
        monkeypatch.setattr(auth, "audit", fake_audit)
        result = await auth.create_user(auth.UserCreate(
            email="direction.agefop@metfpa.ci",
            name="Direction AGEFOP",
            role="agency_director",
            direction="AGEFOP",
            password="MotDePasse!2026",
        ), ADMIN)

        assert result["direction"] == "AGEFOP"
        assert result["active"] is True
        assert "password_hash" not in result
        assert auth._verify("MotDePasse!2026", fake.users.docs[-1]["password_hash"])
        assert audits[0][0][0] == "admin_create_user"
        assert "password_hash" not in audits[0][1]["apres"]

    asyncio.run(scenario())


def test_create_user_rejects_duplicate_and_unknown_direction(monkeypatch):
    async def scenario():
        fake = FakeDB()
        monkeypatch.setattr(auth, "mdb", fake)

        duplicate = auth.UserCreate(
            email="admin@metfpa.ci", name="Autre admin", role="admin", password="MotDePasse!2026")
        with pytest.raises(HTTPException) as duplicate_error:
            await auth.create_user(duplicate, ADMIN)
        assert duplicate_error.value.status_code == 409

        unknown = auth.UserCreate(
            email="direction.inconnue@metfpa.ci", name="Direction inconnue",
            role="agency_director", direction="D.A.F", password="MotDePasse!2026")
        with pytest.raises(HTTPException) as direction_error:
            await auth.create_user(unknown, ADMIN)
        assert direction_error.value.status_code == 422
        assert "Direction inconnue" in direction_error.value.detail

    asyncio.run(scenario())


def test_non_admin_role_is_rejected_by_admin_dependency():
    dependency = auth.require_role("admin")

    with pytest.raises(HTTPException) as error:
        asyncio.run(dependency({"email": "dircab@metfpa.ci", "role": "dircab"}))

    assert error.value.status_code == 403
