"""METFPA Sprint S4 — Deterministic executive alerts (server-side, rule-based).
No AI, no invented institutional alerts. Computed from existing metfpa_dev data."""
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends

from .db import mdb
from .auth import require_role

alerts_router = APIRouter(prefix="/api/metfpa")

SEV_RANK = {"critique": 0, "eleve": 1, "modere": 2, "faible": 3}
DEMO = {"data_origin": "demo_tracking", "validation_status": "to_validate"}
REF = {"data_origin": "html_reference", "validation_status": "pending_metfpa_validation"}


def _quarter_end(echeance):
    try:
        y, q = echeance.split("-T")
        m, d = {"1": (3, 31), "2": (6, 30), "3": (9, 30), "4": (12, 31)}[q]
        return datetime(int(y), m, d, tzinfo=timezone.utc)
    except Exception:
        return None


def _parse(dt):
    try:
        return datetime.fromisoformat(dt.replace("Z", "+00:00"))
    except Exception:
        return None


def _a(rule_id, category, severity, title, description, rtype, rid, evidence, origin=DEMO):
    return {"alert_id": uuid.uuid4().hex, "rule_id": rule_id, "category": category, "severity": severity,
            "title": title, "description": description, "related_resource_type": rtype,
            "related_resource_id": rid, "evidence": evidence,
            "generated_at": datetime.now(timezone.utc).isoformat(), **origin}


async def build_alerts():
    now = datetime.now(timezone.utc)
    soon = now + timedelta(days=30)
    acts = await mdb.activities.find({}, {"_id": 0}).to_list(5000)
    decs = await mdb.decisions.find({}, {"_id": 0}).to_list(2000)
    risks = await mdb.risks.find({}, {"_id": 0}).to_list(2000)
    frameworks = await mdb.frameworks.find({}, {"_id": 0}).to_list(50)
    indicators = await mdb.indicators.find({}, {"_id": 0}).to_list(2000)
    out = []

    # ---- Decisions ----
    for d in decs:
        due = _parse(d.get("due_date") or "")
        closed = d.get("status") in ("implemented", "closed", "rejected")
        if due and due < now and not closed:
            out.append(_a("DEC_OVERDUE", "Décisions", "critique", "Décision en retard",
                          f"« {d['title']} » dépasse son échéance ({d['due_date'][:10]}).", "decision", d["id"],
                          {"due_date": d["due_date"], "status": d["status"]}))
        elif due and now <= due <= soon and d.get("priority") in ("haute", "critique") and not closed:
            out.append(_a("DEC_DUE_SOON", "Décisions", "eleve", "Décision prioritaire à échéance proche",
                          f"« {d['title']} » (priorité {d['priority']}) arrive à échéance le {d['due_date'][:10]}.", "decision", d["id"],
                          {"due_date": d["due_date"], "priority": d["priority"]}))
        if d.get("status") == "approved" and not d.get("decision_date"):
            out.append(_a("DEC_NOT_IMPLEMENTED", "Décisions", "modere", "Décision approuvée non mise en œuvre",
                          f"« {d['title']} » est approuvée mais sans date de mise en œuvre.", "decision", d["id"],
                          {"status": d["status"]}))

    # ---- Activities ----
    for x in acts:
        rid = x["id"]
        if x.get("statut") == "Bloqué":
            out.append(_a("ACT_BLOCKED", "Activités", "critique", "Activité bloquée",
                          f"{x.get('code_action')} — {x.get('intitule')}", "activity", rid,
                          {"statut": x["statut"], "alerte": x.get("alerte")}))
        qe = _quarter_end(x.get("echeance") or "")
        if qe and qe < now and x.get("statut") != "Achevé":
            out.append(_a("ACT_OVERDUE", "Activités", "eleve", "Activité en retard d'échéance",
                          f"{x.get('code_action')} — échéance {x.get('echeance')} dépassée.", "activity", rid,
                          {"echeance": x.get("echeance"), "statut": x.get("statut")}))
        if x.get("alerte"):
            out.append(_a("ACT_ALERT_TEXT", "Activités", "eleve", "Alerte signalée sur l'activité",
                          f"{x.get('code_action')} : {x.get('alerte')}", "activity", rid, {"alerte": x.get("alerte")}))
        if qe and now <= qe <= soon and (x.get("avancement") or 0) < 30 and x.get("statut") != "Achevé":
            out.append(_a("ACT_LOW_PROGRESS_NEAR_DEADLINE", "Activités", "modere", "Avancement faible près de l'échéance",
                          f"{x.get('code_action')} : {x.get('avancement', 0)}% à l'approche de {x.get('echeance')}.", "activity", rid,
                          {"avancement": x.get("avancement"), "echeance": x.get("echeance")}))
        # progress vs financial inconsistency (demo): high execution but low progress
        bp, be, av = x.get("budget_prevu"), x.get("budget_execute"), (x.get("avancement") or 0)
        if bp and be and bp > 0 and (be / bp) > 0.5 and av < 25:
            out.append(_a("ACT_PROGRESS_FINANCE_MISMATCH", "Activités", "modere", "Incohérence avancement / exécution",
                          f"{x.get('code_action')} : exécution {round(be/bp*100)}% mais avancement physique {av}%.", "activity", rid,
                          {"budget_execute": be, "budget_prevu": bp, "avancement": av}))

    # ---- Risks ----
    for r in risks:
        rid = r["id"]
        if r.get("status") == "closed":
            continue
        if r.get("severity") == "critique":
            out.append(_a("RISK_CRITICAL", "Risques", "critique", "Risque critique",
                          f"« {r['title']} » (score {r.get('risk_score')}).", "risk", rid,
                          {"risk_score": r.get("risk_score"), "severity": r.get("severity")}))
        if r.get("severity") in ("critique", "eleve") and not (r.get("mitigation_plan") or "").strip():
            out.append(_a("RISK_NO_MITIGATION", "Risques", "eleve", "Risque élevé sans plan de mitigation",
                          f"« {r['title']} » n'a pas de plan de mitigation.", "risk", rid, {"severity": r.get("severity")}))
        md = _parse(r.get("mitigation_deadline") or "")
        if md and md < now:
            out.append(_a("RISK_MITIGATION_OVERDUE", "Risques", "eleve", "Échéance de mitigation dépassée",
                          f"« {r['title']} » : mitigation en retard ({r['mitigation_deadline'][:10]}).", "risk", rid,
                          {"mitigation_deadline": r["mitigation_deadline"]}))
        if r.get("residual_severity") in ("critique", "eleve"):
            out.append(_a("RISK_RESIDUAL_HIGH", "Risques", "modere", "Risque résiduel encore élevé",
                          f"« {r['title']} » conserve un risque résiduel {r.get('residual_severity')}.", "risk", rid,
                          {"residual_severity": r.get("residual_severity")}))

    # ---- Data quality ----
    miss_engage = sum(1 for x in acts if x.get("budget_engage") is None)
    miss_source = sum(1 for x in acts if x.get("source_financement") is None)
    miss_dir = sum(1 for x in acts if x.get("direction_status") == "to_validate")
    if miss_engage:
        out.append(_a("DQ_BUDGET_ENGAGE_MISSING", "Qualité des données", "modere", "Budget engagé manquant",
                      f"{miss_engage} activités sans budget engagé officiel.", "dataset", "activities",
                      {"count": miss_engage}, origin=DEMO))
    if miss_source:
        out.append(_a("DQ_SOURCE_MISSING", "Qualité des données", "modere", "Source de financement manquante",
                      f"{miss_source} activités sans source de financement.", "dataset", "activities",
                      {"count": miss_source}, origin=DEMO))
    if miss_dir:
        out.append(_a("DQ_DIRECTION_TO_VALIDATE", "Qualité des données", "faible", "Directions à valider",
                      f"{miss_dir} activités rattachées à une direction non validée.", "dataset", "activities",
                      {"count": miss_dir}, origin=DEMO))
    for f in frameworks:
        if f.get("validation_status") == "pending_metfpa_validation":
            out.append(_a("DQ_FRAMEWORK_PENDING", "Qualité des données", "faible", "Cadre en attente de validation",
                          f"{f.get('label')} reste provisoire (en attente METFPA).", "framework", f.get("key"),
                          {"validation_status": f.get("validation_status")}, origin=REF))
    miss_kpi = sum(1 for k in indicators if k.get("valeur_actuelle") is None)
    if miss_kpi:
        out.append(_a("DQ_INDICATOR_VALUE_MISSING", "Qualité des données", "faible", "Valeurs d'indicateurs manquantes",
                      f"{miss_kpi} indicateurs sans valeur actuelle renseignée.", "dataset", "indicators",
                      {"count": miss_kpi}, origin=REF))

    out.sort(key=lambda a: SEV_RANK.get(a["severity"], 9))
    return out


@alerts_router.get("/cabinet/alerts")
async def cabinet_alerts(identity: dict = Depends(require_role("dircab", "admin"))):
    alerts = await build_alerts()
    by_cat = {}
    counts = {"critique": 0, "eleve": 0, "modere": 0, "faible": 0}
    for a in alerts:
        by_cat.setdefault(a["category"], []).append(a)
        counts[a["severity"]] = counts.get(a["severity"], 0) + 1
    return {"alerts": alerts, "by_category": by_cat, "counts": counts, "total": len(alerts),
            "rules_note": "Alertes déterministes calculées par règles documentées (aucune recommandation IA).",
            "data_notice": "Alertes dérivées de données de démonstration / provisoires — non officielles."}
