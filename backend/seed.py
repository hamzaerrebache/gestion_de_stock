"""Seed initial admin user and sample categories."""
import os
from datetime import datetime, timezone
from uuid import uuid4
from auth import hash_password, verify_password


async def seed_admin(db):
    email = os.environ.get("ADMIN_EMAIL", "admin@parapharmacie.ma")
    password = os.environ.get("ADMIN_PASSWORD", "Admin@2026")
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid4()),
            "email": email,
            "password_hash": hash_password(password),
            "name": "Admin",
            "role": "admin",
            "active": True,
            "created_at": datetime.now(timezone.utc),
        })
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one(
            {"email": email},
            {"$set": {"password_hash": hash_password(password)}},
        )


async def seed_demo_users(db):
    """Create demo cashier + manager users for testing roles."""
    demo = [
        {"email": "caissier@parapharmacie.ma", "name": "Caissier Démo", "role": "caissier", "password": "Cashier@2026"},
        {"email": "gestionnaire@parapharmacie.ma", "name": "Gestionnaire Démo", "role": "gestionnaire", "password": "Manager@2026"},
    ]
    for u in demo:
        if not await db.users.find_one({"email": u["email"]}):
            await db.users.insert_one({
                "id": str(uuid4()),
                "email": u["email"],
                "password_hash": hash_password(u["password"]),
                "name": u["name"],
                "role": u["role"],
                "active": True,
                "created_at": datetime.now(timezone.utc),
            })


async def seed_sample_data(db):
    """Seed categories + a few products for demo (idempotent)."""
    if await db.categories.count_documents({}) > 0:
        return
    cats = [
        {"id": str(uuid4()), "name": "Cosmétique", "description": "Soins visage et corps", "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid4()), "name": "Bébé", "description": "Articles pour bébés", "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid4()), "name": "Santé", "description": "Produits de santé", "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid4()), "name": "Hygiène", "description": "Hygiène et soin", "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid4()), "name": "Compléments", "description": "Compléments alimentaires", "created_at": datetime.now(timezone.utc)},
    ]
    await db.categories.insert_many(cats)
    cat_map = {c["name"]: c["id"] for c in cats}

    products = [
        {"name": "Crème hydratante visage 50ml", "category": "Cosmétique", "barcode": "6111000001", "purchase_price": 45.00, "sale_price": 89.00, "stock": 32, "stock_min": 5},
        {"name": "Sérum vitamine C 30ml", "category": "Cosmétique", "barcode": "6111000002", "purchase_price": 80.00, "sale_price": 159.00, "stock": 18, "stock_min": 5},
        {"name": "Lait corporel 250ml", "category": "Cosmétique", "barcode": "6111000003", "purchase_price": 35.00, "sale_price": 69.00, "stock": 24, "stock_min": 5},
        {"name": "Lingettes bébé x80", "category": "Bébé", "barcode": "6111000010", "purchase_price": 18.00, "sale_price": 35.00, "stock": 60, "stock_min": 10},
        {"name": "Couches T3 x40", "category": "Bébé", "barcode": "6111000011", "purchase_price": 120.00, "sale_price": 199.00, "stock": 14, "stock_min": 4},
        {"name": "Crème change bébé", "category": "Bébé", "barcode": "6111000012", "purchase_price": 28.00, "sale_price": 55.00, "stock": 3, "stock_min": 5},  # low stock
        {"name": "Paracétamol 500mg x16", "category": "Santé", "barcode": "6111000020", "purchase_price": 8.00, "sale_price": 19.00, "stock": 120, "stock_min": 20},
        {"name": "Vitamine D3 60 caps", "category": "Compléments", "barcode": "6111000030", "purchase_price": 60.00, "sale_price": 119.00, "stock": 22, "stock_min": 5},
        {"name": "Magnésium marin 60 caps", "category": "Compléments", "barcode": "6111000031", "purchase_price": 55.00, "sale_price": 105.00, "stock": 16, "stock_min": 5},
        {"name": "Gel douche 500ml", "category": "Hygiène", "barcode": "6111000040", "purchase_price": 22.00, "sale_price": 39.00, "stock": 45, "stock_min": 8},
        {"name": "Shampoing antipelliculaire", "category": "Hygiène", "barcode": "6111000041", "purchase_price": 30.00, "sale_price": 59.00, "stock": 28, "stock_min": 5},
        {"name": "Brosse à dents souple", "category": "Hygiène", "barcode": "6111000042", "purchase_price": 6.00, "sale_price": 15.00, "stock": 90, "stock_min": 15},
    ]
    docs = []
    now = datetime.now(timezone.utc)
    for p in products:
        docs.append({
            "id": str(uuid4()),
            "name": p["name"],
            "sku": p["barcode"],
            "barcode": p["barcode"],
            "category_id": cat_map.get(p["category"]),
            "description": "",
            "image_url": None,
            "purchase_price": p["purchase_price"],
            "sale_price": p["sale_price"],
            "vat_rate": 20.0,
            "stock": p["stock"],
            "stock_min": p["stock_min"],
            "expiry_date": None,
            "supplier_id": None,
            "created_at": now,
            "updated_at": now,
        })
    await db.products.insert_many(docs)
