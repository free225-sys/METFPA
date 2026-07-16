"""Seed cohérent pour la formation DIRCAB (démo).

S'exécute contre une instance EN MARCHE, via l'API (donc RBAC + audit respectés) :
    REACT_APP_BACKEND_URL=http://127.0.0.1:8001 python seed_demo_dircab.py

Idempotent : les décisions/risques déjà créés (préfixe [DEMO]) ne sont pas
dupliqués ; les activités sont re-typées à chaque exécution (statuts variés).
Ne touche ni aux utilisateurs, ni aux référentiels, ni à la configuration.
"""
import os
import sys

import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "http://127.0.0.1:8001").rstrip("/")
PWD = os.environ.get("METFPA_SEED_PASSWORD", "Metfpa@2026Demo")


def login(email):
    r = requests.post(f"{BASE}/api/metfpa/auth/login", json={"email": email, "password": PWD}, timeout=20)
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def main():
    admin = login("admin@metfpa.ci")
    dircab = login("dircab@metfpa.ci")

    # ---- Activités : statuts variés (démo formation) ----
    acts = requests.get(f"{BASE}/api/metfpa/activities", headers=admin).json()
    plan = []
    for i, a in enumerate(acts):
        if i % 10 == 0:
            plan.append((a, {"statut": "Bloqué", "avancement": 25, "alerte": "Marché non attribué — arbitrage requis"}))
        elif i % 10 in (1, 2):
            plan.append((a, {"statut": "En retard", "avancement": 35, "alerte": "Échéance trimestrielle dépassée"}))
        elif i % 10 == 3:
            plan.append((a, {"statut": "Suspendu", "avancement": 10, "alerte": "En attente de financement bailleur"}))
        elif i % 10 in (4, 5):
            plan.append((a, {"statut": "Achevé", "avancement": 100, "alerte": ""}))
        elif i % 10 in (6, 7):
            plan.append((a, {"statut": "En cours", "avancement": 40 + (i % 5) * 10, "alerte": ""}))
        elif i % 10 == 8:
            plan.append((a, {"statut": "À l'heure", "avancement": 60, "alerte": ""}))
        else:
            plan.append((a, {"statut": "Non démarré", "avancement": 0, "alerte": ""}))
    ok = 0
    for a, body in plan:
        r = requests.put(f"{BASE}/api/metfpa/activities/{a['id']}", json=body, headers=admin)
        ok += r.status_code == 200
    print(f"activites re-typees: {ok}/{len(plan)}")

    # ---- Décisions (mix statuts + arbitrage + relances) ----
    existing = {d["title"] for d in requests.get(f"{BASE}/api/metfpa/decisions", headers=dircab).json()}
    directions = sorted({a.get("direction") for a in acts if a.get("direction")})
    d1, d2 = (directions + ["DAF", "DGE"])[:2]
    DECISIONS = [
        {"title": "[DEMO] Arbitrage budgétaire — équipements ateliers", "decision_type": "arbitrage",
         "priority": "critique", "status": "pending", "requested_by": d1, "due_date": "2026-06-30T00:00:00+00:00",
         "arbitrage": "a_arbitrer", "description": "Réallocation de 350 M FCFA vers les ateliers prioritaires."},
        {"title": "[DEMO] Validation du plan de formation des formateurs", "decision_type": "validation",
         "priority": "haute", "status": "pending", "requested_by": d2, "due_date": "2026-07-25T00:00:00+00:00",
         "arbitrage": "a_arbitrer"},
        {"title": "[DEMO] Relance convention bailleur — digitalisation", "decision_type": "ressource",
         "priority": "haute", "status": "approved", "arbitrage": "a_relancer", "relance_direction": d1,
         "decision_date": "2026-07-01T00:00:00+00:00"},
        {"title": "[DEMO] Orientation carte de la formation 2027", "decision_type": "orientation",
         "priority": "moyenne", "status": "draft"},
        {"title": "[DEMO] Création du comité de suivi hebdomadaire", "decision_type": "autre",
         "priority": "moyenne", "status": "implemented", "arbitrage": "arbitre",
         "decision_date": "2026-06-20T00:00:00+00:00", "resolution": "Comité installé, réunion chaque lundi."},
        {"title": "[DEMO] Suspension provisoire du site de Bouaké 2", "decision_type": "arbitrage",
         "priority": "haute", "status": "approved", "arbitrage": "arbitre", "decision_date": "2026-06-28T00:00:00+00:00"},
    ]
    created = 0
    for d in DECISIONS:
        if d["title"] in existing:
            continue
        r = requests.post(f"{BASE}/api/metfpa/decisions", json=d, headers=dircab)
        created += r.status_code == 200
    print(f"decisions creees: {created} (existantes conservees: {len(existing & {d['title'] for d in DECISIONS})})")

    # ---- Risques ----
    existing_r = {r_["title"] for r_ in requests.get(f"{BASE}/api/metfpa/risks", headers=admin).json()}
    RISKS = [
        {"title": "[DEMO] Rupture de financement bailleur digitalisation", "category": "financier",
         "probability": 5, "impact": 5, "status": "open", "owner": d1},
        {"title": "[DEMO] Indisponibilité des formateurs certifiés", "category": "operationnel",
         "probability": 4, "impact": 4, "status": "open", "owner": d2},
        {"title": "[DEMO] Retard de passation — équipements ateliers", "category": "operationnel",
         "probability": 4, "impact": 3, "status": "mitigating", "owner": d1,
         "mitigation_plan": "Procédure d'urgence DGMP", "mitigation_deadline": "2026-06-15T00:00:00+00:00"},
        {"title": "[DEMO] Faible remontée des données directions", "category": "gouvernance",
         "probability": 3, "impact": 3, "status": "monitored", "owner": "DIRCAB",
         "mitigation_plan": "Relances hebdomadaires + points focaux"},
        {"title": "[DEMO] Obsolescence du SI de suivi", "category": "technique",
         "probability": 2, "impact": 4, "status": "open", "owner": d2},
    ]
    created_r = 0
    for r_ in RISKS:
        if r_["title"] in existing_r:
            continue
        rr = requests.post(f"{BASE}/api/metfpa/risks", json=r_, headers=admin)
        created_r += rr.status_code == 200
    print(f"risques crees: {created_r}")

    # ---- KPI critiques (marquage via workflow de validation réel) ----
    indics = requests.get(f"{BASE}/api/metfpa/indicators", headers=admin).json()
    flagged = 0
    for k in [i for i in indics if i.get("valeur_actuelle") is None][:2]:
        if any(c.get("text", "").startswith("[DEMO] KPI critique") for c in k.get("validation_comments", [])):
            continue
        r = requests.post(f"{BASE}/api/metfpa/validation/indicators/{k['id']}",
                          json={"action": "comment", "comment": "[DEMO] KPI critique : aucune donnée remontée, cible en danger."},
                          headers=dircab)
        flagged += r.status_code == 200
    print(f"KPI marques critiques (commentaire): {flagged}")
    print("SEED DEMO DIRCAB: OK")


if __name__ == "__main__":
    try:
        main()
    except requests.RequestException as e:
        print(f"ERREUR: {e}")
        sys.exit(1)
