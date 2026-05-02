"""User management (admin only)."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from uuid import uuid4

from auth import hash_password, require_roles
from models import UserCreate, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


def _clean(u: dict) -> dict:
    u.pop("_id", None)
    u.pop("password_hash", None)
    return u


@router.get("")
async def list_users(_: dict = Depends(require_roles("admin"))):
    from server import db
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users


@router.post("")
async def create_user(data: UserCreate, _: dict = Depends(require_roles("admin"))):
    from server import db
    email = data.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    doc = {
        "id": str(uuid4()),
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "role": data.role,
        "active": True,
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(doc)
    return _clean(dict(doc))


@router.put("/{user_id}")
async def update_user(user_id: str, data: UserUpdate, _: dict = Depends(require_roles("admin"))):
    from server import db
    update = {}
    if data.name is not None:
        update["name"] = data.name
    if data.role is not None:
        update["role"] = data.role
    if data.active is not None:
        update["active"] = data.active
    if data.password:
        update["password_hash"] = hash_password(data.password)
    if not update:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour")
    res = await db.users.update_one({"id": user_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return user


@router.delete("/{user_id}")
async def delete_user(user_id: str, current: dict = Depends(require_roles("admin"))):
    from server import db
    if current["id"] == user_id:
        raise HTTPException(status_code=400, detail="Impossible de supprimer votre propre compte")
    res = await db.users.delete_one({"id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return {"ok": True}
