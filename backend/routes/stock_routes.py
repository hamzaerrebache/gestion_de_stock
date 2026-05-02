"""Stock movements + alerts."""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from typing import Optional

from auth import get_current_user, require_roles
from models import StockMovementIn

router = APIRouter(prefix="/api/stock", tags=["stock"])


@router.get("/movements")
async def list_movements(
    product_id: Optional[str] = Query(None),
    limit: int = Query(200),
    _: dict = Depends(get_current_user),
):
    from server import db
    flt = {}
    if product_id:
        flt["product_id"] = product_id
    return await db.stock_movements.find(flt, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)


@router.post("/movements")
async def create_movement(data: StockMovementIn, user: dict = Depends(require_roles("admin", "gestionnaire"))):
    from server import db
    product = await db.products.find_one({"id": data.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")

    qty = abs(int(data.quantity))
    new_stock = product.get("stock", 0)
    if data.type == "in":
        new_stock += qty
        delta = qty
    elif data.type == "out":
        if qty > new_stock:
            raise HTTPException(status_code=400, detail="Stock insuffisant")
        new_stock -= qty
        delta = -qty
    else:  # adjustment: quantity = absolute new stock
        delta = qty - new_stock
        new_stock = qty

    await db.products.update_one(
        {"id": data.product_id},
        {"$set": {"stock": new_stock, "updated_at": datetime.now(timezone.utc)}},
    )
    mv = {
        "id": str(uuid4()),
        "product_id": data.product_id,
        "product_name": product["name"],
        "type": data.type,
        "quantity": delta,
        "note": data.note or "",
        "reference": data.reference,
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc),
    }
    await db.stock_movements.insert_one(mv)
    mv.pop("_id", None)
    return mv


@router.get("/alerts")
async def stock_alerts(_: dict = Depends(get_current_user)):
    from server import db
    products = await db.products.find({}, {"_id": 0}).to_list(2000)
    low = [p for p in products if p.get("stock", 0) <= p.get("stock_min", 0)]
    now = datetime.now(timezone.utc)
    soon = now + timedelta(days=60)
    expiring = []
    expired = []
    for p in products:
        exp = p.get("expiry_date")
        if not exp:
            continue
        if isinstance(exp, str):
            try:
                exp = datetime.fromisoformat(exp.replace("Z", "+00:00"))
            except Exception:
                continue
        if exp < now:
            expired.append(p)
        elif exp <= soon:
            expiring.append(p)
    return {"low_stock": low, "expiring": expiring, "expired": expired}
