"""Auth endpoints."""
import os
from fastapi import APIRouter, HTTPException, Response, Depends, Request
from datetime import datetime, timezone
from uuid import uuid4

from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    set_auth_cookies, clear_auth_cookies, get_current_user,
)
from models import LoginIn, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_out(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "role": u["role"],
        "active": u.get("active", True),
        "created_at": u["created_at"],
    }


@router.post("/login")
async def login(data: LoginIn, response: Response, request: Request):
    from server import db
    email = data.email.lower().strip()

    # Brute force protection
    ip = request.client.host if request.client else "unknown"
    ident = f"{ip}:{email}"
    rec = await db.login_attempts.find_one({"identifier": ident})
    now = datetime.now(timezone.utc)
    if rec and rec.get("locked_until") and rec["locked_until"] > now:
        raise HTTPException(status_code=429, detail="Trop de tentatives. Réessayez dans 15 minutes.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        # increment failed attempts
        attempts = (rec["count"] if rec else 0) + 1
        update = {"count": attempts, "last_attempt": now}
        if attempts >= 5:
            update["locked_until"] = now.replace(microsecond=0).replace(tzinfo=timezone.utc).fromtimestamp(now.timestamp() + 15 * 60, tz=timezone.utc)
        await db.login_attempts.update_one(
            {"identifier": ident},
            {"$set": update},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Compte désactivé")

    # success → clear attempts
    await db.login_attempts.delete_one({"identifier": ident})

    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return {"user": _user_out(user), "access_token": access}


@router.post("/logout")
async def logout(response: Response, _: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return _user_out(user)
