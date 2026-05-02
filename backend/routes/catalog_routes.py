"""Categories + Products."""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional

from auth import get_current_user, require_roles
from models import CategoryIn, ProductIn

router = APIRouter(prefix="/api", tags=["catalog"])


# ---------- Categories ----------
@router.get("/categories")
async def list_categories(_: dict = Depends(get_current_user)):
    from server import db
    return await db.categories.find({}, {"_id": 0}).sort("name", 1).to_list(500)


@router.post("/categories")
async def create_category(data: CategoryIn, _: dict = Depends(require_roles("admin", "gestionnaire"))):
    from server import db
    doc = {
        "id": str(uuid4()),
        "name": data.name,
        "description": data.description or "",
        "created_at": datetime.now(timezone.utc),
    }
    await db.categories.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, _: dict = Depends(require_roles("admin", "gestionnaire"))):
    from server import db
    res = await db.categories.delete_one({"id": cat_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Catégorie introuvable")
    return {"ok": True}


# ---------- Products ----------
@router.get("/products")
async def list_products(
    q: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    low_stock: Optional[bool] = Query(None),
    _: dict = Depends(get_current_user),
):
    from server import db
    flt = {}
    if q:
        flt["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"barcode": {"$regex": q, "$options": "i"}},
            {"sku": {"$regex": q, "$options": "i"}},
        ]
    if category_id:
        flt["category_id"] = category_id
    products = await db.products.find(flt, {"_id": 0}).sort("name", 1).to_list(2000)
    if low_stock:
        products = [p for p in products if p.get("stock", 0) <= p.get("stock_min", 0)]
    return products


@router.get("/products/barcode/{barcode}")
async def get_by_barcode(barcode: str, _: dict = Depends(get_current_user)):
    from server import db
    p = await db.products.find_one({"barcode": barcode}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    return p


@router.get("/products/{pid}")
async def get_product(pid: str, _: dict = Depends(get_current_user)):
    from server import db
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    return p


@router.post("/products")
async def create_product(data: ProductIn, _: dict = Depends(require_roles("admin", "gestionnaire"))):
    from server import db
    if data.barcode and await db.products.find_one({"barcode": data.barcode}):
        raise HTTPException(status_code=400, detail="Code-barres déjà utilisé")
    now = datetime.now(timezone.utc)
    doc = data.model_dump()
    doc["id"] = str(uuid4())
    doc["created_at"] = now
    doc["updated_at"] = now
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/products/{pid}")
async def update_product(pid: str, data: ProductIn, _: dict = Depends(require_roles("admin", "gestionnaire"))):
    from server import db
    update = data.model_dump()
    update["updated_at"] = datetime.now(timezone.utc)
    res = await db.products.update_one({"id": pid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    return p


@router.delete("/products/{pid}")
async def delete_product(pid: str, _: dict = Depends(require_roles("admin", "gestionnaire"))):
    from server import db
    res = await db.products.delete_one({"id": pid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    return {"ok": True}
