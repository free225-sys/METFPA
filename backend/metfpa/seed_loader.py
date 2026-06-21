"""Idempotent loader: imports the provisional METFPA seed (seed_metfpa.json)
into the dedicated METFPA database. No random data. Referentials are
delete+insert (read-only, pending validation); demo activities are
insert-if-absent so operational edits are preserved across re-runs."""
import os
import json
from datetime import datetime, timezone

from .db import mdb, audit, FRAMEWORK_META

ACTIVITY_MISSING = ["budget_engage", "source_financement", "baseline", "cible",
                    "valeur_actuelle", "niveau_risque", "decision_requise",
                    "frequence_reporting", "source_verification", "responsable"]

REF = {"data_origin": "html_reference", "validation_status": "pending_metfpa_validation",
       "source_document": "HTML reference + cross-check Politique EFTP (.docx) & Stratégie digitale (.pdf)"}


def _load_seed():
    path = os.environ.get("SEED_METFPA_PATH", "/app/memory/seed_metfpa.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


async def import_seed(reset_activities: bool = False, user: str = "système") -> dict:
    seed = _load_seed()
    pnd, pol, dig = seed["pnd"], seed["politique"], seed["digital"]
    summary = {}

    # ---- frameworks (period-normalized) ----
    frameworks = []
    totals = {"PND": pnd["secteur"]["total"], "POL": pol["total"], "DIG": dig["total"]}
    visions = {"PND": pnd["secteur"].get("resultat", ""), "POL": pol.get("vision", ""), "DIG": dig.get("vision", "")}
    for k, m in FRAMEWORK_META.items():
        total = totals[k]
        frameworks.append({**m, "vision": visions[k], "total": total,
                           "annual_average": round(total / m["period_years"], 1),
                           "requires_client_validation": True, **REF})
    await mdb.frameworks.delete_many({})
    await mdb.frameworks.insert_many(frameworks)
    summary["frameworks"] = len(frameworks)

    # ---- PND nodes ----
    pnd_nodes = [
        {"code": pnd["pilier"]["code"], "niveau": "pilier", "parent_code": None,
         "nom": pnd["pilier"]["nom"], "budget_total": pnd["pilier"]["total"], "framework": "PND", **REF},
        {"code": pnd["secteur"]["code"], "niveau": "secteur", "parent_code": pnd["pilier"]["code"],
         "nom": pnd["secteur"]["nom"], "resultat": pnd["secteur"].get("resultat"),
         "budget_total": pnd["secteur"]["total"], "framework": "PND", **REF},
    ]
    pnd_effet_index = {}
    for e in pnd["secteur"]["effets"]:
        pnd_effet_index[e["code"]] = e
        pnd_nodes.append({"code": e["code"], "niveau": "effet", "parent_code": pnd["secteur"]["code"],
                          "nom": e["nom"], "budget_total": e["total"], "framework": "PND", **REF})
        for p in e["produits"]:
            pnd_nodes.append({"code": p["code"], "niveau": "produit", "parent_code": e["code"],
                              "nom": p["nom"], "budget_total": p["total"],
                              "ancre_digital": p.get("ancre_digital", False), "framework": "PND", **REF})
    await mdb.pnd_nodes.delete_many({})
    await mdb.pnd_nodes.insert_many(pnd_nodes)
    summary["pnd_nodes"] = len(pnd_nodes)

    # ---- Politique nodes ----
    pol_nodes = []
    for ax in pol["axes"]:
        pol_nodes.append({"code": ax["code"], "niveau": "axe", "parent_code": None, "nom": ax["nom"],
                          "effet": ax.get("effet"), "budget_total": ax.get("total"),
                          "pnd_effet": ax.get("pnd_effet"), "framework": "POL", **REF})
        for p in ax.get("produits", []):
            pol_nodes.append({"code": p["code"], "niveau": "produit", "parent_code": ax["code"], "nom": p["nom"],
                              "budget_total": p.get("total"), "ancre_digital": p.get("ancre_digital", False),
                              "framework": "POL", **REF})
            for a in p.get("actions", []):
                pol_nodes.append({"code": a["code"], "niveau": "action", "parent_code": p["code"],
                                  "nom": a["nom"], "budget_total": None, "framework": "POL", **REF})
    await mdb.pol_nodes.delete_many({})
    await mdb.pol_nodes.insert_many(pol_nodes)
    summary["pol_nodes"] = len(pol_nodes)

    # ---- Digital nodes + profile ----
    dig_nodes = []
    for ax in dig["axes"]:
        dig_nodes.append({"code": ax["code"], "niveau": "axe", "parent_code": None, "nom": ax["nom"],
                          "budget_total": ax.get("total"), "pct": ax.get("pct"), "etat": ax.get("etat"),
                          "bailleur": ax.get("bailleur"), "framework": "DIG", **REF})
        for o in ax.get("objectifs", []):
            dig_nodes.append({"code": f"{ax['code']}.{o['code']}", "niveau": "objectif", "parent_code": ax["code"],
                              "nom": o["nom"], "orientations": o.get("orientations", []), "framework": "DIG", **REF})
    await mdb.dig_nodes.delete_many({})
    await mdb.dig_nodes.insert_many(dig_nodes)
    summary["dig_nodes"] = len(dig_nodes)

    await mdb.dig_profile.delete_many({})
    await mdb.dig_profile.insert_one({"annuel": dig.get("annuel"), "financement": dig.get("financement"),
                                      "priorites": dig.get("priorites"), "pnd_ancre": dig.get("pnd_ancre"),
                                      "pol_ancre": dig.get("pol_ancre"), **REF})

    # ---- Indicators (cascade + digital KPI) ----
    indicators = []
    for k in seed.get("kpi_cascade", []):
        indicators.append({"niveau": k["niveau"], "libelle": k["libelle"], "base": k.get("base"),
                           "cible": k.get("cible"), "valeur_actuelle": None, "source": k.get("src"),
                           "axe": None, **REF})
    for k in dig.get("kpi", []):
        indicators.append({"niveau": "Stratégie digitale", "libelle": k["n"], "base": k.get("base"),
                           "cible": k.get("cible"), "valeur_actuelle": None, "source": "Stratégie digitale",
                           "axe": k.get("axe"), **REF})
    await mdb.indicators.delete_many({})
    await mdb.indicators.insert_many(indicators)
    summary["indicators"] = len(indicators)

    # ---- Alignments (POL axis -> PND effet, with digital anchor) ----
    alignments = []
    for ax in pol["axes"]:
        pe = pnd_effet_index.get(ax.get("pnd_effet"))
        alignments.append({"pol_axe": ax["code"], "pol_axe_nom": ax["nom"], "pol_total": ax.get("total"),
                           "pnd_effet": ax.get("pnd_effet"), "pnd_effet_nom": pe["nom"] if pe else None,
                           "pnd_total": pe["total"] if pe else None, "nb_produits": len(ax.get("produits", [])),
                           "dig_ancrage": {"pnd_ancre": dig.get("pnd_ancre"), "pol_ancre": dig.get("pol_ancre")},
                           **REF})
    await mdb.alignments.delete_many({})
    await mdb.alignments.insert_many(alignments)
    summary["alignments"] = len(alignments)

    # ---- Activities (DEMO tracking) ----
    acts = seed.get("operational_demo", {}).get("activites", [])
    if reset_activities:
        await mdb.activities.delete_many({})
    inserted = 0
    directions = set()
    for a in acts:
        directions.add(a.get("direction"))
        if await mdb.activities.find_one({"id": a["id"]}):
            continue
        doc = {**a, "data_origin": "demo_tracking", "validation_status": "demo",
               "direction_status": "to_validate", "evidence": [], "history": [], "comments": [],
               "missing_fields": list(ACTIVITY_MISSING)}
        for f in ACTIVITY_MISSING:
            doc.setdefault(f, None)
        await mdb.activities.insert_one(doc)
        inserted += 1
    summary["activities_inserted"] = inserted
    summary["activities_total"] = await mdb.activities.count_documents({})

    # ---- Directions referential (to_validate) ----
    await mdb.directions.delete_many({})
    dir_docs = [{"code": d, "nom": d, "data_origin": "to_validate",
                 "validation_status": "pending_metfpa_validation",
                 "note": "Issu du seed HTML — liste officielle non fournie"} for d in sorted(directions) if d]
    if dir_docs:
        await mdb.directions.insert_many(dir_docs)
    summary["directions"] = len(dir_docs)

    # ---- Indexes ----
    await mdb.pnd_nodes.create_index("code")
    await mdb.pol_nodes.create_index("code")
    await mdb.pol_nodes.create_index("pnd_effet")
    await mdb.dig_nodes.create_index("code")
    await mdb.indicators.create_index("niveau")
    await mdb.activities.create_index("id", unique=True)
    await mdb.activities.create_index("axe_pol")
    await mdb.activities.create_index("direction")
    await mdb.frameworks.create_index("key", unique=True)

    # ---- Logs ----
    log = {"fichier": os.environ.get("SEED_METFPA_PATH"), "date": datetime.now(timezone.utc).isoformat(),
           "summary": summary, "validation_status": "pending_metfpa_validation", "valide_par": None}
    await mdb.import_log.insert_one(dict(log))
    await audit("import_seed", "seed_metfpa", apres=summary, user=user)
    return summary
