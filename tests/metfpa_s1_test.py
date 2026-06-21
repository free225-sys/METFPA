import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / "backend" / ".env")
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from metfpa.seed_loader import import_seed
from metfpa.db import mdb


async def main():
    results = {}

    # 1. Idempotency
    s1 = await import_seed()
    s2 = await import_seed()
    results["idempotent_referentials"] = (
        s1["frameworks"] == s2["frameworks"] == 3 and
        s1["pnd_nodes"] == s2["pnd_nodes"] == 20 and
        s1["pol_nodes"] == s2["pol_nodes"] == 130 and
        s1["activities_total"] == s2["activities_total"] == 62 and
        s2["activities_inserted"] == 0
    )

    # 2. All referential data has data_origin + validation_status
    bad = await mdb.pnd_nodes.count_documents({"$or": [{"data_origin": {"$exists": False}},
                                                       {"validation_status": {"$exists": False}}]})
    results["all_have_origin_and_status"] = (bad == 0)

    # 3. Demo activities classified
    demo = await mdb.activities.count_documents({"data_origin": "demo_tracking"})
    results["activities_demo_classified"] = (demo == 62)

    # 4. Missing budget fields explicitly missing (None) + listed
    a = await mdb.activities.find_one({}, {"_id": 0})
    results["missing_budget_fields_explicit"] = (
        a["budget_engage"] is None and a["source_financement"] is None
        and "budget_engage" in a["missing_fields"]
    )

    # 5. Frameworks period-normalized fields
    fr = await mdb.frameworks.find_one({"key": "POL"}, {"_id": 0})
    results["framework_normalized_fields"] = all(k in fr for k in
        ["period_start", "period_end", "period_years", "budget_scope", "total",
         "annual_average", "source_document", "validation_status"]) and fr["annual_average"] == 293772.6

    # 6. Nothing auto-promoted (everything still pending)
    promoted = await mdb.frameworks.count_documents({"validation_status": "validated"})
    results["nothing_auto_promoted"] = (promoted == 0)

    # 7. Audit log captured the import
    imports = await mdb.audit_log.count_documents({"action": "import_seed"})
    results["audit_captured_import"] = (imports >= 1)

    # 8. Directions to_validate, no invented official
    dirs_official = await mdb.directions.count_documents({"data_origin": "official_reference"})
    results["no_official_directions_invented"] = (dirs_official == 0)

    print("METFPA S1 TEST RESULTS")
    for k, v in results.items():
        print(f"  [{'PASS' if v else 'FAIL'}] {k}")
    print("ALL PASS" if all(results.values()) else "SOME FAILED")


asyncio.run(main())
