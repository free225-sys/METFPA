import os
from pathlib import Path
import sys

import pytest
from fastapi import HTTPException

os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "metfpa_unit_test")
os.environ.setdefault("JWT_SECRET", "unit-test-only")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from metfpa.registers import _assert_arbitration_role


def test_coordination_can_prepare_relance_but_not_final_arbitration():
    coordination = {"role": "coordination"}

    _assert_arbitration_role(coordination, {"relance_direction": "DAF"})

    with pytest.raises(HTTPException) as exc:
        _assert_arbitration_role(coordination, {"arbitrage": "arbitre"})

    assert exc.value.status_code == 403
    assert "Directeur de cabinet" in exc.value.detail


def test_only_dircab_can_set_final_arbitration():
    _assert_arbitration_role({"role": "dircab"}, {"arbitrage": "arbitre"})

    with pytest.raises(HTTPException):
        _assert_arbitration_role({"role": "admin"}, {"arbitrage": "arbitre"})
