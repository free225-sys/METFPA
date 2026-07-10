"""Phase 2A-0 — Validation workflow test (RBAC promotion, audited, restorable).
Promotes the DIG framework with snapshot + full restore so no official framework
stays unintentionally promoted. Run: pytest -q backend/tests/metfpa_validation_test.py"""
import os
import asyncio
import httpx
import pytest
from motor.motor_asyncio import AsyncIOMotorClient

BASE = os.environ.get("REACT_APP_BACKEND_URL") or "http://localhost:8001"
API = f"{BASE}/api/metfpa"
PW = "Metfpa@2026Demo"
MONGO = os.environ["MONGO_URL"]
DBN = os.environ.get("METFPA_DB_NAME", "metfpa_dev")


async def _token(client, email):
    r = await client.post(f"{API}/auth/login", json={"email": email, "password": PW})
    r.raise_for_status()
    return r.json()["access_token"]


@pytest.mark.asyncio
async def test_validation_workflow_dig():
    mc = AsyncIOMotorClient(MONGO)
    db = mc[DBN]
    # snapshot DIG framework + nodes
    fw_before = await db.frameworks.find_one({"key": "DIG"}, {"_id": 0, "validation_status": 1, "data_origin": 1})
    nodes_before = await db.dig_nodes.find({}, {"_id": 0, "code": 1, "validation_status": 1, "data_origin": 1}).to_list(1000)
    audit_before = await db.audit_log.count_documents({"action": "promote_framework"})

    async with httpx.AsyncClient(timeout=30) as client:
        admin = await _token(client, "admin@metfpa.ci")
        validator = await _token(client, "validateur@metfpa.ci")
        dircab = await _token(client, "dircab@metfpa.ci")
        editor = await _token(client, "direction.daf@metfpa.ci")

        h = lambda t: {"Authorization": f"Bearer {t}"}
        body = {"framework": "DIG", "validated_by": "Test M&E", "validation_note": "validation test"}

        # unauthorized roles -> 403
        assert (await client.post(f"{API}/admin/validate", json=body, headers=h(dircab))).status_code == 403
        assert (await client.post(f"{API}/admin/validate", json=body, headers=h(editor))).status_code == 403
        # unauthenticated -> 401
        assert (await client.post(f"{API}/admin/validate", json=body)).status_code == 401

        # validator -> 200 + status validated
        r = await client.post(f"{API}/admin/validate", json=body, headers=h(validator))
        assert r.status_code == 200, r.text
        assert r.json()["validation_status"] == "validated"

        # admin -> 200 (idempotent re-promotion allowed)
        r2 = await client.post(f"{API}/admin/validate", json=body, headers=h(admin))
        assert r2.status_code == 200

    # audited
    audit_after = await db.audit_log.count_documents({"action": "promote_framework"})
    assert audit_after >= audit_before + 2

    # framework is now validated
    fw_now = await db.frameworks.find_one({"key": "DIG"}, {"_id": 0, "validation_status": 1})
    assert fw_now["validation_status"] == "validated"

    # ---- RESTORE snapshot (no official framework stays promoted) ----
    await db.frameworks.update_one({"key": "DIG"}, {"$set": {
        "validation_status": fw_before["validation_status"], "data_origin": fw_before["data_origin"]},
        "$unset": {"validated_by": "", "validated_at": "", "validation_note": ""}})
    for n in nodes_before:
        await db.dig_nodes.update_one({"code": n["code"]}, {"$set": {
            "validation_status": n.get("validation_status"), "data_origin": n.get("data_origin")},
            "$unset": {"validated_by": "", "validated_at": "", "validation_note": ""}})

    fw_restored = await db.frameworks.find_one({"key": "DIG"}, {"_id": 0, "validation_status": 1})
    assert fw_restored["validation_status"] == fw_before["validation_status"]
    mc.close()
