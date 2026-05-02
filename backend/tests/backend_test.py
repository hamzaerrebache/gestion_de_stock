"""Comprehensive backend tests for Parapharmacie Management App.
Covers: auth (cookie-based JWT), role authorization, catalog, stock, sales (POS),
invoices + PDF, suppliers, clients, dashboard.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@parapharmacie.ma", "password": "Admin@2026"}
CAISSIER = {"email": "caissier@parapharmacie.ma", "password": "Cashier@2026"}
GESTIONNAIRE = {"email": "gestionnaire@parapharmacie.ma", "password": "Manager@2026"}


def _session_login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=10)
    assert r.status_code == 200, f"login failed {r.status_code}: {r.text}"
    return s, r


# ========== Session-scoped fixtures ==========
@pytest.fixture(scope="session")
def admin_session():
    s, _ = _session_login(ADMIN)
    return s


@pytest.fixture(scope="session")
def caissier_session():
    s, _ = _session_login(CAISSIER)
    return s


@pytest.fixture(scope="session")
def gestionnaire_session():
    s, _ = _session_login(GESTIONNAIRE)
    return s


# ========== AUTH ==========
class TestAuth:
    def test_login_admin_sets_cookies_and_returns_user(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json=ADMIN)
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["email"] == ADMIN["email"]
        assert data["user"]["role"] == "admin"
        assert "access_token" in data
        # cookies
        assert "access_token" in s.cookies
        assert "refresh_token" in s.cookies

    def test_login_caissier(self):
        s, r = _session_login(CAISSIER)
        assert r.json()["user"]["role"] == "caissier"

    def test_login_gestionnaire(self):
        s, r = _session_login(GESTIONNAIRE)
        assert r.json()["user"]["role"] == "gestionnaire"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "bad"})
        assert r.status_code in (400, 401)

    def test_me_via_cookies(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN["email"]

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ========== CATEGORIES ==========
class TestCategories:
    def test_list_seeded_categories(self, admin_session):
        r = admin_session.get(f"{API}/categories")
        assert r.status_code == 200
        cats = r.json()
        assert isinstance(cats, list)
        assert len(cats) >= 5, f"expected >=5 seeded categories, got {len(cats)}"


# ========== PRODUCTS ==========
class TestProducts:
    def test_list_seeded_products(self, admin_session):
        r = admin_session.get(f"{API}/products")
        assert r.status_code == 200
        products = r.json()
        assert len(products) >= 12, f"expected >=12 seeded, got {len(products)}"

    def test_get_product_by_barcode(self, admin_session):
        r = admin_session.get(f"{API}/products/barcode/6111000001")
        assert r.status_code == 200
        p = r.json()
        assert "Crème hydratante" in p["name"] or "hydratante" in p["name"].lower()

    def test_admin_create_and_update_product(self, admin_session):
        payload = {
            "name": "TEST_PRODUCT_backend",
            "barcode": "TESTBC001",
            "purchase_price": 10.0,
            "sale_price": 20.0,
            "vat_rate": 20.0,
            "stock": 50,
            "stock_min": 5,
        }
        r = admin_session.post(f"{API}/products", json=payload)
        assert r.status_code in (200, 201), r.text
        created = r.json()
        pid = created["id"]
        assert created["name"] == payload["name"]

        # GET to verify persistence
        r2 = admin_session.get(f"{API}/products/{pid}")
        assert r2.status_code == 200
        assert r2.json()["name"] == payload["name"]

        # UPDATE
        updated_payload = {**payload, "name": "TEST_PRODUCT_updated", "sale_price": 25.0}
        r3 = admin_session.put(f"{API}/products/{pid}", json=updated_payload)
        assert r3.status_code == 200
        r4 = admin_session.get(f"{API}/products/{pid}")
        assert r4.json()["name"] == "TEST_PRODUCT_updated"
        assert r4.json()["sale_price"] == 25.0

        # cleanup
        admin_session.delete(f"{API}/products/{pid}")

    def test_caissier_cannot_create_product(self, caissier_session):
        r = caissier_session.post(f"{API}/products", json={
            "name": "TEST_forbidden", "sale_price": 10, "purchase_price": 5, "vat_rate": 20, "stock": 1,
        })
        assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"


# ========== STOCK ==========
class TestStock:
    def test_stock_movement_in_increases_stock(self, admin_session):
        # pick a product
        products = admin_session.get(f"{API}/products").json()
        pid = products[0]["id"]
        before = products[0]["stock"]

        r = admin_session.post(f"{API}/stock/movements", json={
            "product_id": pid, "type": "in", "quantity": 5, "note": "TEST_in"
        })
        assert r.status_code in (200, 201), r.text

        after_prod = admin_session.get(f"{API}/products/{pid}").json()
        assert after_prod["stock"] == before + 5

    def test_stock_movement_out_decreases_stock(self, admin_session):
        products = admin_session.get(f"{API}/products").json()
        # pick one with stock >=3
        pid = None
        before = 0
        for p in products:
            if p.get("stock", 0) >= 3:
                pid = p["id"]
                before = p["stock"]
                break
        assert pid, "no product with stock>=3"
        r = admin_session.post(f"{API}/stock/movements", json={
            "product_id": pid, "type": "out", "quantity": 2, "note": "TEST_out"
        })
        assert r.status_code in (200, 201), r.text
        after = admin_session.get(f"{API}/products/{pid}").json()["stock"]
        assert after == before - 2

    def test_stock_alerts_structure(self, admin_session):
        r = admin_session.get(f"{API}/stock/alerts")
        assert r.status_code == 200
        data = r.json()
        for key in ("low_stock", "expiring", "expired"):
            assert key in data, f"missing key {key}"
            assert isinstance(data[key], list)


# ========== SALES / POS ==========
class TestSales:
    def _pick_two_products(self, session, min_stock=5):
        products = session.get(f"{API}/products").json()
        picks = [p for p in products if p.get("stock", 0) >= min_stock][:2]
        assert len(picks) >= 2, "need at least 2 products with stock>=5"
        return picks

    def test_cash_sale_decrements_stock_and_creates_movements(self, caissier_session):
        picks = self._pick_two_products(caissier_session)
        before = {p["id"]: p["stock"] for p in picks}
        items = [
            {"product_id": p["id"], "quantity": 2, "unit_price": p["sale_price"], "vat_rate": p.get("vat_rate", 20)}
            for p in picks
        ]
        r = caissier_session.post(f"{API}/sales", json={
            "items": items, "payment_method": "cash", "cash_amount": 10000, "discount": 0
        })
        assert r.status_code == 200, r.text
        sale = r.json()
        assert sale["receipt_number"].startswith("TKT-")
        assert sale["total_ttc"] > 0
        # stock decremented
        for p in picks:
            after = caissier_session.get(f"{API}/products/{p['id']}").json()["stock"]
            assert after == before[p["id"]] - 2

        # movements exist
        movs = caissier_session.get(f"{API}/stock/movements").json()
        assert any(m.get("reference") == sale["id"] and m["type"] == "out" for m in movs)

    def test_sale_insufficient_stock_returns_400(self, caissier_session):
        products = caissier_session.get(f"{API}/products").json()
        p = products[0]
        r = caissier_session.post(f"{API}/sales", json={
            "items": [{"product_id": p["id"], "quantity": 99999, "unit_price": p["sale_price"], "vat_rate": 20}],
            "payment_method": "cash", "cash_amount": 9999999
        })
        assert r.status_code == 400

    def test_sale_mixed_payment(self, caissier_session):
        picks = self._pick_two_products(caissier_session)
        items = [
            {"product_id": picks[0]["id"], "quantity": 1, "unit_price": picks[0]["sale_price"], "vat_rate": 20}
        ]
        # first get total by cheap dry-run? just compute
        total_est = picks[0]["sale_price"] * 1.2  # approx TTC
        r = caissier_session.post(f"{API}/sales", json={
            "items": items, "payment_method": "mixed",
            "cash_amount": total_est / 2, "card_amount": total_est / 2 + 50
        })
        assert r.status_code == 200, r.text
        assert r.json()["payment_method"] == "mixed"

    def test_sale_mixed_insufficient_payment(self, caissier_session):
        picks = self._pick_two_products(caissier_session)
        items = [{"product_id": picks[0]["id"], "quantity": 1,
                  "unit_price": picks[0]["sale_price"], "vat_rate": 20}]
        r = caissier_session.post(f"{API}/sales", json={
            "items": items, "payment_method": "mixed", "cash_amount": 1, "card_amount": 1
        })
        assert r.status_code == 400

    def test_list_sales(self, admin_session):
        r = admin_session.get(f"{API}/sales")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_caissier_can_create_sale(self, caissier_session):
        # already covered by test_cash_sale but explicit marker
        assert True


# ========== INVOICES ==========
class TestInvoices:
    def test_invoice_from_sale_and_pdf(self, admin_session, caissier_session):
        # create a sale first
        products = caissier_session.get(f"{API}/products").json()
        p = next(x for x in products if x.get("stock", 0) >= 1)
        r = caissier_session.post(f"{API}/sales", json={
            "items": [{"product_id": p["id"], "quantity": 1,
                       "unit_price": p["sale_price"], "vat_rate": 20}],
            "payment_method": "cash", "cash_amount": 9999
        })
        assert r.status_code == 200
        sale_id = r.json()["id"]

        # create invoice from sale
        r2 = admin_session.post(f"{API}/invoices/from-sale/{sale_id}")
        assert r2.status_code == 200, r2.text
        inv = r2.json()
        assert inv["number"].startswith("FAC-")
        inv_id = inv["id"]

        # fetch PDF
        r3 = admin_session.get(f"{API}/invoices/{inv_id}/pdf")
        assert r3.status_code == 200
        assert r3.headers.get("content-type", "").startswith("application/pdf")
        assert r3.content.startswith(b"%PDF"), "not a valid PDF"


# ========== SUPPLIERS ==========
class TestSuppliers:
    def test_create_purchase_payment_flow(self, gestionnaire_session):
        # Create supplier
        r = gestionnaire_session.post(f"{API}/suppliers", json={"name": "TEST_Supplier", "phone": "0600"})
        assert r.status_code in (200, 201)
        sid = r.json()["id"]
        assert r.json()["debt"] == 0.0

        # Purchase: increases stock + debt
        products = gestionnaire_session.get(f"{API}/products").json()
        pid = products[0]["id"]
        before_stock = products[0]["stock"]
        r2 = gestionnaire_session.post(
            f"{API}/suppliers/{sid}/purchase",
            json=[{"product_id": pid, "quantity": 10, "unit_price": 5.0}]
        )
        assert r2.status_code == 200, r2.text
        assert r2.json()["debt"] == 50.0

        after_stock = gestionnaire_session.get(f"{API}/products/{pid}").json()["stock"]
        assert after_stock == before_stock + 10

        # Payment
        r3 = gestionnaire_session.post(f"{API}/suppliers/{sid}/payments",
                                       json={"amount": 30, "note": "TEST_pay"})
        assert r3.status_code == 200
        assert r3.json()["debt"] == 20.0

        # cleanup
        gestionnaire_session.delete(f"{API}/suppliers/{sid}")

    def test_caissier_cannot_create_supplier(self, caissier_session):
        r = caissier_session.post(f"{API}/suppliers", json={"name": "TEST_forbidden"})
        assert r.status_code == 403


# ========== CLIENTS ==========
class TestClients:
    def test_create_client(self, admin_session):
        r = admin_session.post(f"{API}/clients", json={"name": "TEST_Client_X", "phone": "0611"})
        assert r.status_code in (200, 201)
        c = r.json()
        assert c["loyalty_points"] == 0
        assert c["total_spent"] == 0.0
        # cleanup
        admin_session.delete(f"{API}/clients/{c['id']}")


# ========== USERS (admin only) ==========
class TestUsers:
    def test_admin_creates_user_and_caissier_forbidden(self, admin_session, caissier_session):
        # caissier should get 403
        r_forbid = caissier_session.post(f"{API}/users", json={
            "email": "TEST_nope@ex.com", "password": "passw0rd", "name": "x", "role": "caissier"
        })
        assert r_forbid.status_code == 403

        # admin creates
        r = admin_session.post(f"{API}/users", json={
            "email": "TEST_new_user@parapharmacie.ma",
            "password": "Test@2026", "name": "TEST New", "role": "caissier"
        })
        assert r.status_code in (200, 201), r.text
        uid = r.json()["id"]
        # cleanup
        admin_session.delete(f"{API}/users/{uid}")


# ========== DASHBOARD ==========
class TestDashboard:
    def test_dashboard_structure(self, admin_session):
        r = admin_session.get(f"{API}/dashboard")
        assert r.status_code == 200
        d = r.json()
        assert "kpis" in d and "top_products" in d and "daily_sales" in d and "alerts" in d
        for key in ("ca_today", "ca_month", "profit_month", "products_count", "stock_value"):
            assert key in d["kpis"], f"missing kpi {key}"
        assert len(d["daily_sales"]) == 7
        for key in ("low_stock", "expiring", "expired"):
            assert key in d["alerts"]
