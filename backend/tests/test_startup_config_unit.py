import asyncio
import os
from pathlib import Path
import sys


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "metfpa_unit_test")
os.environ.setdefault("JWT_SECRET", "unit-test-only")

import server  # noqa: E402


class _DatabaseMustNotBeUsed:
    def __getattr__(self, name):
        raise AssertionError(f"legacy database accessed while disabled: {name}")


def test_disabled_legacy_startup_needs_no_legacy_admin_credentials(monkeypatch):
    monkeypatch.setattr(server, "LEGACY_PND_ENABLED", False)
    monkeypatch.setattr(server, "db", _DatabaseMustNotBeUsed())
    monkeypatch.delenv("ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)

    asyncio.run(server.on_startup())
