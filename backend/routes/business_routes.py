"""POS / Sales endpoints + invoices + suppliers + clients + dashboard."""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
import io
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from typing import Optional

from auth import get_current_user, require_roles
from models import (
    SaleIn, InvoiceIn, SupplierIn, SupplierPaymentIn, ClientIn,
)
from pdf_utils import generate_invoice_pdf

router = APIRouter(prefix="/api", tags=["business"])


# ============== POS / SALES ==============
async def _next_receipt_number(db) -> str:
    year = datetime.now(timezone.utc).year
    res = await db.counters.find_one_and_update(
        {"_id": f"receipt_{year}"},
        {"$inc": {"value": 1}},
        upsert=True,
        return_document=True,
    )
    n = res["value"] if res else 1
    return f"TKT-{year}-{n:05d}"


async def _next_invoice_number(db) -> str:
    year = datetime.now(timezone.utc).year
    res = await db.counters.find_one_and_update(
        {"_id": f"invoice_{year}"},
        {"$inc": {"value": 1}},
        upsert=True,
        return_document=True,
    )
    n = res["value"] if res else 1
    return f"FAC-{year}-{n:05d}"


def _compute_totals(items_in: list, discount: float) -> dict:
    items = []
    subtotal_ht = 0.0
    vat_total = 0.0
    for it in items_in:
        line_ht = round(it["unit_price"] * it["quantity"], 2)
        line_vat = round(line_ht * (it["vat_rate"] / 100.0), 2)
        items.append({
            **it,
            "line_total": line_ht,
            "line_total_ttc": round(line_ht + line_vat, 2),
        })
        subtotal_ht += line_ht
        vat_total += line_vat
    total_ttc = round(subtotal_ht + vat_total - discount, 2)
    return {
        "items": items,
        "subtotal_ht": round(subtotal_ht, 2),
        "vat_total": round(vat_total, 2),
        "total_ttc": max(total_ttc, 0.0),
    }


@router.post("/sales")
async def create_sale(data: SaleIn, user: dict = Depends(require_roles("admin", "caissier", "gestionnaire"))):
    from server import db

    if not data.items:
        raise HTTPException(status_code=400, detail="Aucun article")

    # Validate stock & enrich items with name
    items_in = []
    for it in data.items:
        product = await db.products.find_one({"id": it.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Produit introuvable: {it.product_id}")
        if it.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantité invalide")
        if product.get("stock", 0) < it.quantity:
            raise HTTPException(status_code=400, detail=f"Stock insuffisant pour {product['name']}")
        items_in.append({
            "product_id": it.product_id,
            "product_name": product["name"],
            "quantity": it.quantity,
            "unit_price": float(it.unit_price),
            "vat_rate": float(it.vat_rate),
        })

    totals = _compute_totals(items_in, float(data.discount or 0))

    # Validate payment
    if data.payment_method == "mixed":
        paid = (data.cash_amount or 0) + (data.card_amount or 0)
        if round(paid, 2) < round(totals["total_ttc"], 2):
            raise HTTPException(status_code=400, detail="Paiement insuffisant")

    receipt = await _next_receipt_number(db)
    sale_doc = {
        "id": str(uuid4()),
        "receipt_number": receipt,
        **totals,
        "discount": float(data.discount or 0),
        "payment_method": data.payment_method,
        "cash_amount": float(data.cash_amount or 0),
        "card_amount": float(data.card_amount or 0),
        "client_id": data.client_id,
        "cashier_id": user["id"],
        "cashier_name": user["name"],
        "created_at": datetime.now(timezone.utc),
    }
    await db.sales.insert_one(sale_doc)

    # Decrement stock + record movements
    now = datetime.now(timezone.utc)
    for it in items_in:
        await db.products.update_one(
            {"id": it["product_id"]},
            {"$inc": {"stock": -it["quantity"]}, "$set": {"updated_at": now}},
        )
        await db.stock_movements.insert_one({
            "id": str(uuid4()),
            "product_id": it["product_id"],
            "product_name": it["product_name"],
            "type": "out",
            "quantity": -it["quantity"],
            "note": f"Vente {receipt}",
            "reference": sale_doc["id"],
            "user_id": user["id"],
            "created_at": now,
        })

    # Update client loyalty
    if data.client_id:
        pts = int(totals["total_ttc"] // 10)  # 1 pt / 10 DH
        await db.clients.update_one(
            {"id": data.client_id},
            {"$inc": {"loyalty_points": pts, "total_spent": totals["total_ttc"]}},
        )

    sale_doc.pop("_id", None)
    return sale_doc


@router.get("/sales")
async def list_sales(
    limit: int = Query(100),
    date_from: Optional[str] = Query(None),
    _: dict = Depends(get_current_user),
):
    from server import db
    flt = {}
    if date_from:
        try:
            d = datetime.fromisoformat(date_from)
            flt["created_at"] = {"$gte": d}
        except Exception:
            pass
    return await db.sales.find(flt, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)


@router.get("/sales/{sale_id}")
async def get_sale(sale_id: str, _: dict = Depends(get_current_user)):
    from server import db
    s = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Vente introuvable")
    return s


# ============== INVOICES ==============
@router.post("/invoices")
async def create_invoice(data: InvoiceIn, user: dict = Depends(require_roles("admin", "gestionnaire", "caissier"))):
    from server import db
    items_in = []
    for it in data.items:
        product = await db.products.find_one({"id": it.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Produit introuvable: {it.product_id}")
        items_in.append({
            "product_id": it.product_id,
            "product_name": product["name"],
            "quantity": it.quantity,
            "unit_price": float(it.unit_price),
            "vat_rate": float(it.vat_rate),
        })
    totals = _compute_totals(items_in, float(data.discount or 0))
    number = await _next_invoice_number(db)

    client_name = data.client_name or "Client comptoir"
    if data.client_id:
        c = await db.clients.find_one({"id": data.client_id}, {"_id": 0})
        if c:
            client_name = c["name"]

    doc = {
        "id": str(uuid4()),
        "number": number,
        "sale_id": data.sale_id,
        "client_id": data.client_id,
        "client_name": client_name,
        **totals,
        "discount": float(data.discount or 0),
        "notes": data.notes or "",
        "issuer_id": user["id"],
        "created_at": datetime.now(timezone.utc),
    }
    await db.invoices.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.post("/invoices/from-sale/{sale_id}")
async def invoice_from_sale(sale_id: str, user: dict = Depends(require_roles("admin", "gestionnaire", "caissier"))):
    from server import db
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Vente introuvable")
    existing = await db.invoices.find_one({"sale_id": sale_id}, {"_id": 0})
    if existing:
        return existing
    number = await _next_invoice_number(db)
    client_name = "Client comptoir"
    if sale.get("client_id"):
        c = await db.clients.find_one({"id": sale["client_id"]}, {"_id": 0})
        if c:
            client_name = c["name"]
    doc = {
        "id": str(uuid4()),
        "number": number,
        "sale_id": sale["id"],
        "client_id": sale.get("client_id"),
        "client_name": client_name,
        "items": sale["items"],
        "subtotal_ht": sale["subtotal_ht"],
        "vat_total": sale["vat_total"],
        "discount": sale.get("discount", 0),
        "total_ttc": sale["total_ttc"],
        "notes": "",
        "issuer_id": user["id"],
        "created_at": datetime.now(timezone.utc),
    }
    await db.invoices.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/invoices")
async def list_invoices(_: dict = Depends(get_current_user)):
    from server import db
    return await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)


@router.get("/invoices/{inv_id}")
async def get_invoice(inv_id: str, _: dict = Depends(get_current_user)):
    from server import db
    inv = await db.invoices.find_one({"id": inv_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    return inv


@router.get("/invoices/{inv_id}/pdf")
async def invoice_pdf(inv_id: str, _: dict = Depends(get_current_user)):
    import os as _os
    from server import db
    inv = await db.invoices.find_one({"id": inv_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    pdf_bytes = generate_invoice_pdf(inv, currency=_os.environ.get("CURRENCY", "MAD"))
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{inv["number"]}.pdf"'},
    )


# ============== SUPPLIERS ==============
@router.get("/suppliers")
async def list_suppliers(_: dict = Depends(get_current_user)):
    from server import db
    return await db.suppliers.find({}, {"_id": 0}).sort("name", 1).to_list(500)


@router.post("/suppliers")
async def create_supplier(data: SupplierIn, _: dict = Depends(require_roles("admin", "gestionnaire"))):
    from server import db
    doc = {
        "id": str(uuid4()),
        **data.model_dump(),
        "debt": 0.0,
        "created_at": datetime.now(timezone.utc),
    }
    await db.suppliers.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/suppliers/{sid}")
async def update_supplier(sid: str, data: SupplierIn, _: dict = Depends(require_roles("admin", "gestionnaire"))):
    from server import db
    res = await db.suppliers.update_one({"id": sid}, {"$set": data.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fournisseur introuvable")
    return await db.suppliers.find_one({"id": sid}, {"_id": 0})


@router.delete("/suppliers/{sid}")
async def delete_supplier(sid: str, _: dict = Depends(require_roles("admin", "gestionnaire"))):
    from server import db
    await db.suppliers.delete_one({"id": sid})
    return {"ok": True}


@router.post("/suppliers/{sid}/payments")
async def pay_supplier(sid: str, data: SupplierPaymentIn, user: dict = Depends(require_roles("admin", "gestionnaire"))):
    from server import db
    s = await db.suppliers.find_one({"id": sid})
    if not s:
        raise HTTPException(status_code=404, detail="Fournisseur introuvable")
    new_debt = max(0.0, float(s.get("debt", 0)) - float(data.amount))
    await db.suppliers.update_one({"id": sid}, {"$set": {"debt": new_debt}})
    await db.supplier_payments.insert_one({
        "id": str(uuid4()),
        "supplier_id": sid,
        "amount": float(data.amount),
        "note": data.note or "",
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc),
    })
    return {"ok": True, "debt": new_debt}


@router.post("/suppliers/{sid}/purchase")
async def supplier_purchase(sid: str, items: list, user: dict = Depends(require_roles("admin", "gestionnaire"))):
    """Record a purchase order: increases supplier debt, increases stock.
    Body: list of {product_id, quantity, unit_price}
    """
    from server import db
    s = await db.suppliers.find_one({"id": sid})
    if not s:
        raise HTTPException(status_code=404, detail="Fournisseur introuvable")
    total = 0.0
    now = datetime.now(timezone.utc)
    for it in items:
        product = await db.products.find_one({"id": it["product_id"]})
        if not product:
            continue
        qty = int(it["quantity"])
        price = float(it["unit_price"])
        total += qty * price
        await db.products.update_one(
            {"id": it["product_id"]},
            {"$inc": {"stock": qty}, "$set": {"updated_at": now, "purchase_price": price, "supplier_id": sid}},
        )
        await db.stock_movements.insert_one({
            "id": str(uuid4()),
            "product_id": it["product_id"],
            "product_name": product["name"],
            "type": "in",
            "quantity": qty,
            "note": f"Achat fournisseur {s['name']}",
            "reference": sid,
            "user_id": user["id"],
            "created_at": now,
        })
    new_debt = float(s.get("debt", 0)) + total
    await db.suppliers.update_one({"id": sid}, {"$set": {"debt": new_debt}})
    await db.supplier_purchases.insert_one({
        "id": str(uuid4()),
        "supplier_id": sid,
        "items": items,
        "total": total,
        "user_id": user["id"],
        "created_at": now,
    })
    return {"ok": True, "total": total, "debt": new_debt}


# ============== CLIENTS ==============
@router.get("/clients")
async def list_clients(_: dict = Depends(get_current_user)):
    from server import db
    return await db.clients.find({}, {"_id": 0}).sort("name", 1).to_list(1000)


@router.post("/clients")
async def create_client(data: ClientIn, _: dict = Depends(get_current_user)):
    from server import db
    doc = {
        "id": str(uuid4()),
        **data.model_dump(),
        "loyalty_points": 0,
        "total_spent": 0.0,
        "created_at": datetime.now(timezone.utc),
    }
    await db.clients.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/clients/{cid}")
async def update_client(cid: str, data: ClientIn, _: dict = Depends(get_current_user)):
    from server import db
    res = await db.clients.update_one({"id": cid}, {"$set": data.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client introuvable")
    return await db.clients.find_one({"id": cid}, {"_id": 0})


@router.delete("/clients/{cid}")
async def delete_client(cid: str, _: dict = Depends(require_roles("admin", "gestionnaire"))):
    from server import db
    await db.clients.delete_one({"id": cid})
    return {"ok": True}


# ============== DASHBOARD ==============
@router.get("/dashboard")
async def dashboard(_: dict = Depends(get_current_user)):
    from server import db
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today_start.replace(day=1)
    week_start = today_start - timedelta(days=today_start.weekday())

    sales_today = await db.sales.find({"created_at": {"$gte": today_start}}, {"_id": 0}).to_list(5000)
    sales_month = await db.sales.find({"created_at": {"$gte": month_start}}, {"_id": 0}).to_list(50000)
    sales_week = await db.sales.find({"created_at": {"$gte": week_start}}, {"_id": 0}).to_list(20000)

    ca_today = sum(s["total_ttc"] for s in sales_today)
    ca_month = sum(s["total_ttc"] for s in sales_month)
    count_today = len(sales_today)

    # Profit estimate = sum((sale_price - purchase_price) * qty) for month
    products = {p["id"]: p for p in await db.products.find({}, {"_id": 0}).to_list(5000)}
    profit_month = 0.0
    top_products: dict = {}
    for s in sales_month:
        for it in s["items"]:
            prod = products.get(it["product_id"])
            if prod:
                profit_month += (it["unit_price"] - prod.get("purchase_price", 0)) * it["quantity"]
            key = it["product_id"]
            if key not in top_products:
                top_products[key] = {"product_id": key, "name": it["product_name"], "qty": 0, "revenue": 0.0}
            top_products[key]["qty"] += it["quantity"]
            top_products[key]["revenue"] += it["line_total_ttc"]
    top = sorted(top_products.values(), key=lambda x: x["qty"], reverse=True)[:5]

    # Sales over last 7 days
    daily = []
    for i in range(6, -1, -1):
        day = today_start - timedelta(days=i)
        next_day = day + timedelta(days=1)
        total = 0.0
        for s in sales_week:
            ca_dt = s["created_at"]
            if hasattr(ca_dt, "tzinfo") and ca_dt.tzinfo is None:
                ca_dt = ca_dt.replace(tzinfo=timezone.utc)
            if day <= ca_dt < next_day:
                total += s["total_ttc"]
        daily.append({"date": day.strftime("%Y-%m-%d"), "label": day.strftime("%d/%m"), "total": round(total, 2)})

    # Alerts
    low = [p for p in products.values() if p.get("stock", 0) <= p.get("stock_min", 0)]
    expiring = []
    expired = []
    soon = now + timedelta(days=60)
    for p in products.values():
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

    total_stock_value = sum(p.get("stock", 0) * p.get("purchase_price", 0) for p in products.values())

    return {
        "kpis": {
            "ca_today": round(ca_today, 2),
            "ca_month": round(ca_month, 2),
            "count_today": count_today,
            "profit_month": round(profit_month, 2),
            "products_count": len(products),
            "stock_value": round(total_stock_value, 2),
            "low_stock_count": len(low),
            "expiring_count": len(expiring),
            "expired_count": len(expired),
        },
        "top_products": top,
        "daily_sales": daily,
        "alerts": {
            "low_stock": low[:10],
            "expiring": expiring[:10],
            "expired": expired[:10],
        },
    }
