"""Focused tests for direction scoping and mission update persistence."""
from copy import deepcopy
import asyncio
import os
from pathlib import Path
import sys

import pytest
from fastapi import HTTPException


os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "metfpa_unit_test")
os.environ.setdefault("JWT_SECRET", "unit-test-only")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from metfpa import operations  # noqa: E402


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [deepcopy(x) for x in (docs or [])]

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return deepcopy(doc)
        return None

    async def update_one(self, query, update):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                doc.update(deepcopy(update.get("$set", {})))
                for key, value in update.get("$push", {}).items():
                    doc.setdefault(key, []).append(deepcopy(value))
                return

    async def insert_one(self, doc):
        self.docs.append(deepcopy(doc))


class FakeDB:
    def __init__(self):
        self.activities = FakeCollection([
            {"id": "DAF-1", "code_action": "1.1", "intitule": "Mission DAF", "direction": "DAF",
             "statut": "En cours", "avancement": 20, "echeance": "2026-T4", "comments": []},
            {"id": "DGE-1", "code_action": "2.1", "intitule": "Mission DGE", "direction": "DGE",
             "statut": "En cours", "avancement": 30, "echeance": "2026-T4", "comments": []},
        ])
        self.mission_updates = FakeCollection()


EDITOR = {"email": "daf@metfpa.ci", "role": "direction_editor", "direction": "DAF"}
COORDINATION = {"email": "coordination@metfpa.ci", "role": "coordination", "direction": None}


def test_direction_editor_cannot_read_another_direction(monkeypatch):
    async def scenario():
        monkeypatch.setattr(operations, "mdb", FakeDB())
        own = await operations._find_mission("DAF-1", EDITOR)
        assert own["direction"] == "DAF"
        with pytest.raises(HTTPException) as exc:
            await operations._find_mission("DGE-1", EDITOR)
        assert exc.value.status_code == 403
    asyncio.run(scenario())


def test_direction_update_is_submitted_logged_and_visible(monkeypatch):
    async def scenario():
        fake = FakeDB()
        audit_calls = []

        async def fake_audit(*args, **kwargs):
            audit_calls.append((args, kwargs))

        monkeypatch.setattr(operations, "mdb", fake)
        monkeypatch.setattr(operations, "audit", fake_audit)
        result = await operations._apply_patch(
            "DAF-1",
            operations.MissionPatch(progress=65, blocker="Validation budgétaire attendue", needs_arbitration=True,
                                    comment="Point hebdomadaire transmis"),
            EDITOR,
        )
        stored = await fake.activities.find_one({"id": "DAF-1"})
        assert result["progress"] == stored["avancement"] == 65
        assert stored["submission_status"] == "soumis"
        assert stored["validation_status"] == "to_validate"
        assert stored["comments"][0]["author"] == EDITOR["email"]
        assert fake.mission_updates.docs[0]["direction"] == "DAF"
        assert fake.mission_updates.docs[0]["after"]["needs_arbitration"] is True
        assert audit_calls
    asyncio.run(scenario())


def test_coordination_can_update_any_direction(monkeypatch):
    async def scenario():
        fake = FakeDB()

        async def fake_audit(*args, **kwargs):
            return None

        monkeypatch.setattr(operations, "mdb", fake)
        monkeypatch.setattr(operations, "audit", fake_audit)
        result = await operations._apply_patch(
            "DGE-1", operations.MissionPatch(submission_status="valide", comment="Mise à jour contrôlée"), COORDINATION)
        assert result["submission_status"] == "valide"
        assert result["direction"] == "DGE"
    asyncio.run(scenario())
