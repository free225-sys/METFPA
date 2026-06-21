"""METFPA Sprint S4 — Authentication hardening + RBAC (isolated in metfpa_dev).
Server-side enforcement. Role and direction are read from the authenticated
identity (DB lookup), never trusted from the client. No dev bypass."""
import os
import uuid
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt
from fastapi import APIRouter, HTTPException, Request, Depends, Header
from pydantic import BaseModel, EmailStr

from .db import mdb, audit

auth_router = APIRouter(prefix="/api/metfpa/auth")
admin_router = APIRouter(prefix="/api/metfpa/admin")

JWT_ALGORITHM = "HS256"
TOKEN_TYPE = "metfpa_access"
TOKEN_TTL_HOURS = 8

ROLES = ["cabinet_reader", "direction_editor", "me_validator", "admin"]
EDIT_ROLES = {"direction_editor", "me_validator", "admin"}
VALIDATE_ROLES = {"me_validator", "admin"}


def _hash(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def _make_token(user) -> str:
    payload = {"sub": user["id"], "email": user["email"], "role": user["role"],
               "direction": user.get("direction"), "type": TOKEN_TYPE,
               "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS)}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


async def seed_users():
    """Idempotent: create the 4 demo role accounts in metfpa_dev from env password."""
    pw = os.environ.get("METFPA_SEED_PASSWORD")
    if not pw:
        return {"seeded": 0, "note": "METFPA_SEED_PASSWORD absent"}
    demo = [
        {"email": "admin@metfpa.ci", "name": "Administrateur METFPA", "role": "admin", "direction": None},
        {"email": "validateur@metfpa.ci", "name": "Validateur M&E", "role": "me_validator", "direction": None},
        {"email": "direction.daf@metfpa.ci", "name": "Éditeur DAF", "role": "direction_editor", "direction": "DAF"},
        {"email": "cabinet@metfpa.ci", "name": "Lecteur Cabinet", "role": "cabinet_reader", "direction": None},
    ]
    n = 0
    for u in demo:
        existing = await mdb.users.find_one({"email": u["email"]})
        if existing is None:
            await mdb.users.insert_one({"id": uuid.uuid4().hex, **u, "active": True,
                                        "password_hash": _hash(pw), "created_at": datetime.now(timezone.utc).isoformat()})
            n += 1
        elif not _verify(pw, existing.get("password_hash", "")):
            await mdb.users.update_one({"email": u["email"]}, {"$set": {"password_hash": _hash(pw)}})
    await mdb.users.create_index("email", unique=True)
    await mdb.users.create_index("id", unique=True)
    return {"seeded": n, "total": await mdb.users.count_documents({})}


async def get_identity(request: Request) -> dict:
    """Authoritative identity. Validates signature+expiry+type, re-reads role/direction from DB."""
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expirée")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Jeton invalide")
    if payload.get("type") != TOKEN_TYPE:
        raise HTTPException(status_code=401, detail="Type de jeton invalide")
    user = await mdb.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
    if not user or not user.get("active", False):
        raise HTTPException(status_code=401, detail="Utilisateur introuvable ou désactivé")
    if user.get("role") not in ROLES:
        raise HTTPException(status_code=401, detail="Rôle invalide")
    return user


def require_role(*roles):
    async def dep(identity: dict = Depends(get_identity)) -> dict:
        if identity["role"] not in roles:
            raise HTTPException(status_code=403, detail="Accès refusé pour ce rôle")
        return identity
    return dep


def assert_direction_scope(identity: dict, resource_direction):
    """direction_editor may only mutate resources of their own direction."""
    if identity["role"] == "direction_editor":
        if not resource_direction or resource_direction != identity.get("direction"):
            raise HTTPException(status_code=403, detail="Accès limité à votre direction")


# ---------------- Login / me / logout ----------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


@auth_router.post("/login")
async def login(payload: LoginIn):
    email = payload.email.lower()
    user = await mdb.users.find_one({"email": email})
    if not user or not user.get("active", False) or not _verify(payload.password, user.get("password_hash", "")):
        await audit("login_failed", "auth", email, apres={"ok": False}, user=email)
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    token = _make_token(user)
    await audit("login_success", "auth", user["id"], apres={"role": user["role"]}, user=email)
    return {"access_token": token, "token_type": "bearer",
            "user": {"id": user["id"], "email": user["email"], "name": user.get("name"),
                     "role": user["role"], "direction": user.get("direction")}}


@auth_router.get("/me")
async def me(identity: dict = Depends(get_identity)):
    return identity


@auth_router.post("/logout")
async def logout(identity: dict = Depends(get_identity)):
    return {"ok": True}


# ---------------- Admin user management (admin only) ----------------
class UserPatch(BaseModel):
    role: str | None = None
    direction: str | None = None
    active: bool | None = None


@admin_router.get("/users")
async def list_users(identity: dict = Depends(require_role("admin"))):
    return await mdb.users.find({}, {"_id": 0, "password_hash": 0}).sort("email", 1).to_list(500)


@admin_router.put("/users/{uid}")
async def patch_user(uid: str, payload: UserPatch, identity: dict = Depends(require_role("admin"))):
    user = await mdb.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "role" in data and data["role"] not in ROLES:
        raise HTTPException(status_code=400, detail=f"Rôle invalide (attendu {ROLES})")

    # Safeguard: never remove the last active admin (by demotion or deactivation)
    removing_admin = (user["role"] == "admin") and (
        (data.get("role") and data["role"] != "admin") or (data.get("active") is False))
    if removing_admin:
        active_admins = await mdb.users.count_documents({"role": "admin", "active": True})
        if active_admins <= 1:
            raise HTTPException(status_code=409, detail="Impossible de retirer le dernier administrateur actif")

    await mdb.users.update_one({"id": uid}, {"$set": data})
    await audit("admin_update_user", "user", uid,
                avant={k: user.get(k) for k in data}, apres=data, user=identity["email"])
    return await mdb.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
