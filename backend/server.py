from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import logging
import random
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from typing import Optional, List

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Cockpit PND 2026-2030")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

JWT_ALGORITHM = "HS256"
YEARS = [2026, 2027, 2028, 2029, 2030]
TODAY = datetime(2026, 6, 15, tzinfo=timezone.utc)

FIELD_LABELS = {
    "title": "Intitulé", "owner": "Ministère responsable", "progress": "Avancement",
    "status": "Statut", "start_date": "Date de début", "end_date": "Date de fin prévue",
    "date_fin_reelle": "Date de fin réelle", "description": "Description", "budget": "Budget",
    "blocked_reason": "Motif de blocage",
}

# ----------------------------------------------------------------------------
# Auth helpers
# ----------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(hours=12), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur introuvable")
        user["id"] = str(user["_id"])
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expirée")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Jeton invalide")


class LoginInput(BaseModel):
    email: EmailStr
    password: str


@api_router.post("/auth/login")
async def login(payload: LoginInput, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    uid = str(user["_id"])
    token = create_access_token(uid, email)
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    return {"access_token": token,
            "user": {"id": uid, "email": email, "name": user.get("name", "Admin"),
                     "role": user.get("role", "admin"), "title": user.get("title", "")}}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


# ----------------------------------------------------------------------------
# Demo data
# ----------------------------------------------------------------------------
PILLARS = [
    ("Gouvernance, État de droit et modernisation de l'administration",
     ["Administration publique et services", "Justice et état de droit", "Décentralisation et collectivités",
      "Sécurité et défense", "Diplomatie et coopération"]),
    ("Transformation structurelle de l'économie",
     ["Agriculture et agro-industrie", "Industrie et manufacture", "Commerce et services",
      "Mines et ressources naturelles", "Tourisme et artisanat"]),
    ("Développement des infrastructures et aménagement du territoire",
     ["Transport et mobilité", "Énergie et électricité", "Eau et assainissement",
      "Télécommunications et numérique", "Habitat et urbanisme"]),
    ("Développement du capital humain",
     ["Éducation et formation", "Santé et nutrition", "Enseignement supérieur et recherche",
      "Emploi et insertion professionnelle", "Culture, jeunesse et sports"]),
    ("Développement durable et préservation de l'environnement",
     ["Gestion des forêts", "Lutte contre le changement climatique", "Biodiversité et écosystèmes",
      "Gestion des déchets", "Économie verte et circulaire"]),
    ("Cohésion sociale, solidarité et équité",
     ["Protection sociale et solidarité", "Genre et autonomisation des femmes", "Protection de l'enfance",
      "Inclusion des populations vulnérables", "Réconciliation nationale et paix"]),
]

MINISTRIES = [
    "Ministère de l'Économie et des Finances",
    "Ministère du Plan et du Développement",
    "Ministère de l'Éducation Nationale",
    "Ministère de la Santé et de l'Hygiène Publique",
    "Ministère de l'Agriculture et du Développement Rural",
    "Ministère des Infrastructures Économiques",
    "Ministère de l'Énergie et du Pétrole",
    "Ministère de l'Emploi et de la Protection Sociale",
    "Ministère de l'Environnement et du Développement Durable",
    "Ministère du Numérique et de la Transformation Digitale",
    "Ministère de la Femme, de la Famille et de l'Enfant",
    "Ministère des Eaux et Forêts",
]

DEMO_USERS = [
    {"email": "koffi.kouassi@pnd.ci", "name": "Koffi Kouassi", "title": "Directeur Général du Plan", "role": "directeur"},
    {"email": "awa.traore@pnd.ci", "name": "Awa Traoré", "title": "Directrice Suivi-Évaluation", "role": "directeur"},
    {"email": "yao.brou@pnd.ci", "name": "Yao Brou", "title": "Directeur du Budget", "role": "directeur"},
]
DIRECTOR_NAMES = [u["name"] for u in DEMO_USERS]

EFFECT_TPL = ["Amélioration de l'accès aux services de {s}", "Renforcement de la gouvernance du secteur {s}",
              "Modernisation des infrastructures de {s}", "Développement des capacités humaines en {s}"]
PRODUCT_TPL = ["Programme national de {s}", "Dispositif intégré de {s}", "Plan d'investissement pour {s}",
               "Cadre opérationnel de {s}"]
ACTION_TPL = ["Construction et équipement de {n} infrastructures de {s}", "Réhabilitation de {n} sites existants",
              "Formation et renforcement de capacités de {n} agents", "Déploiement d'une plateforme numérique de gestion",
              "Acquisition d'équipements et de matériels spécialisés", "Mise en œuvre d'un programme de subventions ciblées",
              "Élaboration et adoption d'un cadre réglementaire", "Campagne nationale de sensibilisation et d'inclusion"]
KPI_TPL = ["Taux de couverture (%)", "Nombre de bénéficiaires directs", "Délai moyen de traitement (jours)",
           "Taux de satisfaction des usagers (%)", "Nombre d'infrastructures opérationnelles"]
BLOCK_REASONS = ["Retard dans la mobilisation des financements extérieurs", "Procédure de passation de marché suspendue",
                 "Indisponibilité du foncier requis", "Contraintes techniques sur le site",
                 "Réaffectation budgétaire en cours d'arbitrage"]
COMMENT_TPL = ["Point de situation transmis au cabinet, en attente d'arbitrage.",
               "Les financements sont sécurisés, démarrage des travaux imminent.",
               "Nécessite une coordination interministérielle renforcée.",
               "Retard lié aux délais de passation, plan de rattrapage en cours.",
               "Indicateurs en nette amélioration ce trimestre."]
STATUSES = ["non_demarre", "en_cours", "termine", "bloque"]


async def seed_admin():
    email = os.environ["ADMIN_EMAIL"].lower()
    password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({"email": email, "password_hash": hash_password(password),
                                   "name": "Cabinet du Premier Ministre", "title": "Administrateur",
                                   "role": "admin", "created_at": datetime.now(timezone.utc)})
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})
    for u in DEMO_USERS:
        if await db.users.find_one({"email": u["email"]}) is None:
            await db.users.insert_one({**u, "password_hash": hash_password("Directeur2030!"),
                                       "created_at": datetime.now(timezone.utc)})


async def seed_data():
    if await db.actions.count_documents({}) > 0:
        return
    rng = random.Random(2030)
    actions = []
    for pi, (pname, sectors) in enumerate(PILLARS, start=1):
        for si, sname in enumerate(sectors, start=1):
            scode = f"{pi}.{si:02d}"
            short = sname.split(" et ")[0].split(",")[0].lower()
            for ei in range(1, 4):
                ecode = f"{scode}.{ei}"
                for pri in range(1, 3):
                    pcode = f"{ecode}.{pri}"
                    for ai in range(1, 5):
                        acode = f"{pcode}.{ai}"
                        status = rng.choices(STATUSES, weights=[18, 50, 22, 10])[0]
                        if status == "termine":
                            progress = rng.randint(96, 100)
                        elif status == "en_cours":
                            progress = rng.randint(20, 90)
                        elif status == "bloque":
                            progress = rng.randint(5, 45)
                        else:
                            progress = rng.choice([0, 0, 0, 5, 10])
                        zero_budget = rng.random() < 0.03
                        budget = {str(y): (0 if zero_budget else rng.randint(150, 4500)) for y in YEARS}
                        total_planned = sum(budget.values())
                        actual_2026 = round(budget["2026"] * (progress / 100) * rng.uniform(0.7, 1.05))
                        start = datetime(2026, rng.randint(1, 6), 1)
                        end = datetime(rng.choice([2026, 2027, 2028, 2029, 2030]), rng.randint(1, 12), 28)
                        if rng.random() < 0.08 and status != "termine":
                            end = datetime(2026, rng.randint(1, 5), 28)
                            progress = min(progress, 45)
                        n = rng.randint(3, 40)
                        title = rng.choice(ACTION_TPL).format(n=n, s=short)
                        date_fin_reelle = end.isoformat() if status == "termine" else None
                        # history
                        history = [{"date": datetime(2025, 11, rng.randint(1, 28)).isoformat(),
                                    "user": "Système", "field": "Création", "old": "", "new": "Action initialisée"}]
                        if status in ("en_cours", "termine", "bloque") and rng.random() < 0.7:
                            old_p = max(0, progress - rng.randint(10, 30))
                            history.append({"date": datetime(2026, rng.randint(1, 5), rng.randint(1, 28)).isoformat(),
                                            "user": rng.choice(DIRECTOR_NAMES), "field": "Avancement",
                                            "old": f"{old_p}%", "new": f"{progress}%"})
                        comments = []
                        if rng.random() < 0.18:
                            comments.append({"date": datetime(2026, rng.randint(1, 5), rng.randint(1, 28)).isoformat(),
                                             "author": rng.choice(DIRECTOR_NAMES), "text": rng.choice(COMMENT_TPL)})
                        actions.append({
                            "id": acode, "code": acode, "title": title,
                            "description": f"Cette action s'inscrit dans le secteur « {sname} » du pilier {pi}. "
                                           f"Elle vise à {title[0].lower()}{title[1:]} afin d'accélérer la mise en œuvre du PND 2026-2030.",
                            "owner": rng.choice(MINISTRIES),
                            "pillar_code": str(pi), "pillar_name": pname,
                            "sector_code": scode, "sector_name": sname,
                            "effect_code": ecode, "effect_name": rng.choice(EFFECT_TPL).format(s=short),
                            "product_code": pcode, "product_name": rng.choice(PRODUCT_TPL).format(s=short),
                            "budget": budget, "actual_2026": actual_2026, "total_budget": total_planned,
                            "progress": progress, "status": status,
                            "start_date": start.isoformat(), "end_date": end.isoformat(),
                            "date_fin_reelle": date_fin_reelle,
                            "kpis": rng.sample(KPI_TPL, k=rng.randint(1, 3)),
                            "blocked_reason": rng.choice(BLOCK_REASONS) if status == "bloque" else None,
                            "history": history, "comments": comments, "priority": rng.randint(1, 5),
                        })
    await db.actions.insert_many(actions)
    logger.info(f"Seeded {len(actions)} actions")


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.actions.create_index("code")
    await seed_admin()
    await seed_data()
    try:
        Path("/app/memory/test_credentials.md").write_text(
            "# Test Credentials\n\n## Admin (Cockpit PND)\n"
            f"- Email: {os.environ['ADMIN_EMAIL']}\n- Mot de passe: {os.environ['ADMIN_PASSWORD']}\n- Role: admin\n\n"
            "## Comptes directeurs (démo) — mot de passe: Directeur2030!\n"
            "- koffi.kouassi@pnd.ci (Koffi Kouassi, Directeur Général du Plan)\n"
            "- awa.traore@pnd.ci (Awa Traoré, Directrice Suivi-Évaluation)\n"
            "- yao.brou@pnd.ci (Yao Brou, Directeur du Budget)\n\n"
            "## Endpoints\n- POST /api/auth/login\n- GET /api/auth/me\n- POST /api/auth/logout\n")
    except Exception:
        pass


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
def parse_dt(iso):
    try:
        d = datetime.fromisoformat(iso)
        return d.replace(tzinfo=timezone.utc) if d.tzinfo is None else d
    except Exception:
        return None


def days_late(a: dict) -> int:
    if a["status"] == "termine":
        return 0
    end = parse_dt(a["end_date"])
    if not end or end >= TODAY:
        return 0
    return (TODAY - end).days


def is_overdue(a: dict) -> bool:
    return days_late(a) > 0 and a["progress"] < 50


async def all_actions() -> List[dict]:
    return await db.actions.find({}, {"_id": 0}).to_list(5000)


# ----------------------------------------------------------------------------
# Filters / dashboard
# ----------------------------------------------------------------------------
@api_router.get("/filters")
async def filters(user: dict = Depends(get_current_user)):
    acts = await all_actions()
    pillars, sectors, owners = {}, {}, set()
    for a in acts:
        pillars[a["pillar_code"]] = a["pillar_name"]
        sectors.setdefault(a["pillar_code"], {})[a["sector_code"]] = a["sector_name"]
        owners.add(a["owner"])
    return {"pillars": [{"code": k, "name": v} for k, v in sorted(pillars.items())],
            "sectors": [{"code": c, "name": n, "pillar_code": pc} for pc, d in sectors.items() for c, n in sorted(d.items())],
            "owners": sorted(owners), "years": YEARS}


def apply_filters(acts, pillar=None, sector=None, status=None, owner=None, search=None, year=None):
    out = []
    for a in acts:
        if pillar and a["pillar_code"] != pillar: continue
        if sector and a["sector_code"] != sector: continue
        if status and a["status"] != status: continue
        if owner and a["owner"] != owner: continue
        if year and a["budget"].get(str(year), 0) == 0: continue
        if search:
            s = search.lower()
            if s not in a["title"].lower() and s not in a["code"].lower() and s not in a["owner"].lower(): continue
        out.append(a)
    return out


@api_router.get("/dashboard")
async def dashboard(pillar: Optional[str] = None, sector: Optional[str] = None,
                    owner: Optional[str] = None, year: Optional[int] = None,
                    user: dict = Depends(get_current_user)):
    acts = apply_filters(await all_actions(), pillar=pillar, sector=sector, owner=owner, year=year)
    total_budget = sum(a["total_budget"] for a in acts)
    spent = sum(a["actual_2026"] for a in acts)
    weighted = sum(a["total_budget"] * a["progress"] for a in acts)
    global_progress = round(weighted / total_budget, 1) if total_budget else 0
    late = [a for a in acts if is_overdue(a)]
    by_pillar = {}
    for a in acts:
        by_pillar.setdefault(a["pillar_code"], {"name": a["pillar_name"], "value": 0})
        by_pillar[a["pillar_code"]]["value"] += a["total_budget"]
    donut = [{"code": k, "name": v["name"], "value": v["value"]} for k, v in sorted(by_pillar.items())]
    trajectory, cum_planned, cum_actual = [], 0, 0
    for y in YEARS:
        cum_planned += sum(a["budget"].get(str(y), 0) for a in acts)
        if y == 2026:
            cum_actual += sum(a["actual_2026"] for a in acts)
            actual_val = cum_actual
        else:
            actual_val = None
        trajectory.append({"year": str(y), "planned": cum_planned, "actual": actual_val})
    top = sorted(acts, key=lambda a: a["total_budget"], reverse=True)[:10]
    top_actions = [{"code": a["code"], "title": a["title"], "owner": a["owner"], "pillar_code": a["pillar_code"],
                    "total_budget": a["total_budget"], "progress": a["progress"], "status": a["status"]} for a in top]
    counts = {s: sum(1 for a in acts if a["status"] == s) for s in STATUSES}
    p2026 = sum(a["budget"]["2026"] for a in acts)
    return {"kpis": {"total_budget": total_budget, "spent": spent, "global_progress": global_progress,
                     "total_actions": len(acts), "late_actions": len(late),
                     "execution_rate": round(spent / p2026 * 100, 1) if p2026 else 0},
            "status_counts": counts, "donut": donut, "trajectory": trajectory, "top_actions": top_actions}


@api_router.get("/actions")
async def list_actions(pillar: Optional[str] = None, sector: Optional[str] = None, status: Optional[str] = None,
                       owner: Optional[str] = None, search: Optional[str] = None, sort: str = "code",
                       order: str = "asc", page: int = 1, page_size: int = 12,
                       user: dict = Depends(get_current_user)):
    acts = apply_filters(await all_actions(), pillar=pillar, sector=sector, status=status, owner=owner, search=search)
    keyf = {"code": lambda a: a["code"], "title": lambda a: a["title"].lower(), "owner": lambda a: a["owner"],
            "total_budget": lambda a: a["total_budget"], "progress": lambda a: a["progress"],
            "status": lambda a: a["status"], "end_date": lambda a: a["end_date"]}.get(sort, lambda a: a["code"])
    acts.sort(key=keyf, reverse=(order == "desc"))
    total = len(acts)
    start = (page - 1) * page_size
    return {"total": total, "page": page, "page_size": page_size, "items": acts[start:start + page_size]}


@api_router.get("/actions/{code}")
async def get_action(code: str, user: dict = Depends(get_current_user)):
    a = await db.actions.find_one({"code": code}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Action introuvable")
    return a


class ActionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    owner: Optional[str] = None
    progress: Optional[int] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    date_fin_reelle: Optional[str] = None
    budget: Optional[dict] = None
    blocked_reason: Optional[str] = None


@api_router.put("/actions/{code}")
async def update_action(code: str, payload: ActionUpdate, user: dict = Depends(get_current_user)):
    a = await db.actions.find_one({"code": code})
    if not a:
        raise HTTPException(status_code=404, detail="Action introuvable")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "progress" in data:
        data["progress"] = max(0, min(100, int(data["progress"])))
    if "budget" in data:
        data["budget"] = {str(y): int(data["budget"].get(str(y), a["budget"].get(str(y), 0))) for y in YEARS}
        data["total_budget"] = sum(data["budget"].values())
    # build history entries
    now = datetime.now(timezone.utc).isoformat()
    entries = []
    for k, new in data.items():
        if k == "total_budget":
            continue
        old = a.get(k)
        if k == "budget":
            old_s = " / ".join(str(old.get(str(y), 0)) for y in YEARS)
            new_s = " / ".join(str(new.get(str(y), 0)) for y in YEARS)
            if old_s != new_s:
                entries.append({"date": now, "user": user.get("name", "—"), "field": FIELD_LABELS["budget"],
                                "old": old_s, "new": new_s})
        elif str(old) != str(new):
            entries.append({"date": now, "user": user.get("name", "—"), "field": FIELD_LABELS.get(k, k),
                            "old": str(old) if old not in (None, "") else "—", "new": str(new)})
    update = {"$set": data}
    if entries:
        update["$push"] = {"history": {"$each": entries}}
    await db.actions.update_one({"code": code}, update)
    return await db.actions.find_one({"code": code}, {"_id": 0})


class CommentInput(BaseModel):
    text: str


@api_router.post("/actions/{code}/comments")
async def add_comment(code: str, payload: CommentInput, user: dict = Depends(get_current_user)):
    a = await db.actions.find_one({"code": code})
    if not a:
        raise HTTPException(status_code=404, detail="Action introuvable")
    comment = {"date": datetime.now(timezone.utc).isoformat(), "author": user.get("name", "—"), "text": payload.text}
    await db.actions.update_one({"code": code}, {"$push": {"comments": comment}})
    return comment


@api_router.get("/tree")
async def tree(user: dict = Depends(get_current_user)):
    acts = await all_actions()
    root = {}
    for a in acts:
        p = root.setdefault(a["pillar_code"], {"code": a["pillar_code"], "name": a["pillar_name"], "level": "pillar", "children": {}})
        s = p["children"].setdefault(a["sector_code"], {"code": a["sector_code"], "name": a["sector_name"], "level": "sector", "children": {}})
        e = s["children"].setdefault(a["effect_code"], {"code": a["effect_code"], "name": a["effect_name"], "level": "effect", "children": {}})
        pr = e["children"].setdefault(a["product_code"], {"code": a["product_code"], "name": a["product_name"], "level": "product", "children": {}})
        pr["children"][a["code"]] = {"code": a["code"], "name": a["title"], "level": "action", "status": a["status"],
                                     "progress": a["progress"], "budget": a["total_budget"], "owner": a["owner"], "children": {}}

    def collect_leaves(node):
        if node["level"] == "action":
            return [node]
        res = []
        for k in node["children"]:
            res += collect_leaves(k)
        return res

    def finalize(node):
        kids = list(node["children"].values())
        for k in kids:
            finalize(k)
        node["children"] = sorted(kids, key=lambda x: x["code"])
        if node["level"] != "action":
            leaves = collect_leaves(node)
            node["budget"] = sum(l["budget"] for l in leaves)
            node["progress"] = round(sum(l["progress"] for l in leaves) / len(leaves), 1) if leaves else 0
            node["action_count"] = len(leaves)
        return node

    return [finalize(p) for p in sorted(root.values(), key=lambda x: x["code"])]


@api_router.get("/analytics")
async def analytics(user: dict = Depends(get_current_user)):
    acts = await all_actions()
    pillar_names = {a["pillar_code"]: a["pillar_name"] for a in acts}
    stacked = []
    for pc in sorted(pillar_names):
        row = {"code": pc, "pillar": f"P{pc}", "name": pillar_names[pc]}
        for y in YEARS:
            row[str(y)] = sum(a["budget"].get(str(y), 0) for a in acts if a["pillar_code"] == pc)
        stacked.append(row)
    planned_2026 = sum(a["budget"]["2026"] for a in acts)
    actual_2026 = sum(a["actual_2026"] for a in acts)
    sec = {}
    for a in acts:
        s = sec.setdefault(a["sector_code"], {"name": a["sector_name"], "pillar_code": a["pillar_code"], "planned": 0, "actual": 0})
        s["planned"] += a["budget"]["2026"]
        s["actual"] += a["actual_2026"]
    execution = sorted([{"sector": v["name"], "pillar_code": v["pillar_code"],
                         "rate": round(v["actual"] / v["planned"] * 100, 1) if v["planned"] else 0,
                         "planned": v["planned"], "actual": v["actual"]} for v in sec.values()],
                       key=lambda x: x["rate"])
    return {"stacked": stacked, "variance": {"planned": planned_2026, "actual": actual_2026},
            "execution": execution, "pillar_names": pillar_names}


@api_router.get("/ministries")
async def ministries(user: dict = Depends(get_current_user)):
    acts = await all_actions()
    grp = {}
    for a in acts:
        g = grp.setdefault(a["owner"], {"owner": a["owner"], "count": 0, "total_budget": 0, "planned_2026": 0,
                                        "actual_2026": 0, "weighted": 0, "status": {s: 0 for s in STATUSES},
                                        "alerts": 0, "pillars": set()})
        g["count"] += 1
        g["total_budget"] += a["total_budget"]
        g["planned_2026"] += a["budget"]["2026"]
        g["actual_2026"] += a["actual_2026"]
        g["weighted"] += a["total_budget"] * a["progress"]
        g["status"][a["status"]] += 1
        g["pillars"].add(a["pillar_code"])
        if a["status"] == "bloque" or is_overdue(a):
            g["alerts"] += 1
    out = []
    for g in grp.values():
        out.append({"owner": g["owner"], "count": g["count"], "total_budget": g["total_budget"],
                    "exec_rate": round(g["actual_2026"] / g["planned_2026"] * 100, 1) if g["planned_2026"] else 0,
                    "progress": round(g["weighted"] / g["total_budget"], 1) if g["total_budget"] else 0,
                    "status": g["status"], "alerts": g["alerts"], "pillar_count": len(g["pillars"])})
    return sorted(out, key=lambda x: x["total_budget"], reverse=True)


def severity_for(kind, dl):
    if kind == "bloque":
        return "critique"
    if kind == "retard":
        return "critique" if dl > 90 else "majeur"
    return "mineur"


@api_router.get("/alerts")
async def alerts(user: dict = Depends(get_current_user)):
    acts = await all_actions()
    items = []
    for a in acts:
        base = {"code": a["code"], "title": a["title"], "owner": a["owner"], "pillar_code": a["pillar_code"],
                "pillar_name": a["pillar_name"], "sector_name": a["sector_name"], "end_date": a["end_date"],
                "progress": a["progress"], "status": a["status"], "total_budget": a["total_budget"]}
        dl = days_late(a)
        if a["status"] == "bloque":
            items.append({**base, "type": "bloque", "severity": severity_for("bloque", dl),
                          "days_late": dl, "detail": a.get("blocked_reason") or "Action bloquée"})
        if is_overdue(a):
            items.append({**base, "type": "retard", "severity": severity_for("retard", dl), "days_late": dl,
                          "detail": f"En retard de {dl} jours · avancement {a['progress']}%"})
        if a["total_budget"] == 0:
            items.append({**base, "type": "budget_nul", "severity": "mineur", "days_late": 0,
                          "detail": "Aucune dotation budgétaire programmée"})
    counts = {"bloque": sum(1 for i in items if i["type"] == "bloque"),
              "retard": sum(1 for i in items if i["type"] == "retard"),
              "budget_nul": sum(1 for i in items if i["type"] == "budget_nul"),
              "critique": sum(1 for i in items if i["severity"] == "critique"),
              "majeur": sum(1 for i in items if i["severity"] == "majeur"),
              "mineur": sum(1 for i in items if i["severity"] == "mineur")}
    sev_order = {"critique": 0, "majeur": 1, "mineur": 2}
    items.sort(key=lambda i: (sev_order[i["severity"]], -i["days_late"]))
    return {"items": items, "counts": counts, "total": len(items)}


@api_router.get("/notifications")
async def notifications(user: dict = Depends(get_current_user)):
    acts = await all_actions()
    notes = []
    for a in acts:
        dl = days_late(a)
        if a["status"] == "bloque":
            notes.append({"code": a["code"], "title": a["title"], "type": "bloque", "severity": "critique",
                          "date": a["end_date"], "owner": a["owner"]})
        elif is_overdue(a):
            notes.append({"code": a["code"], "title": a["title"], "type": "retard",
                          "severity": "critique" if dl > 90 else "majeur", "date": a["end_date"], "owner": a["owner"]})
    notes.sort(key=lambda n: n["date"], reverse=True)
    return {"items": notes[:5], "total": len(notes)}


@api_router.get("/")
async def root():
    return {"message": "Cockpit PND 2026-2030 API"}


app.include_router(api_router)

app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"])
