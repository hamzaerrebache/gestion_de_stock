"""Pydantic models for Parapharmacie management app."""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Literal
from datetime import datetime, timezone
from uuid import uuid4


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uid() -> str:
    return str(uuid4())


# ============== USERS ==============
UserRole = Literal["admin", "caissier", "gestionnaire"]


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: UserRole = "caissier"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None
    active: Optional[bool] = None


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    active: bool = True
    created_at: datetime


class LoginIn(BaseModel):
    email: EmailStr
    password: str


# ============== CATEGORIES ==============
class CategoryIn(BaseModel):
    name: str
    description: Optional[str] = ""


class Category(BaseModel):
    id: str = Field(default_factory=_uid)
    name: str
    description: str = ""
    created_at: datetime = Field(default_factory=_now)


# ============== PRODUCTS ==============
class ProductIn(BaseModel):
    name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = ""
    image_url: Optional[str] = None
    purchase_price: float = 0.0
    sale_price: float = 0.0
    vat_rate: float = 20.0
    stock: int = 0
    stock_min: int = 5
    expiry_date: Optional[datetime] = None
    supplier_id: Optional[str] = None


class Product(ProductIn):
    id: str = Field(default_factory=_uid)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# ============== STOCK MOVEMENTS ==============
MovementType = Literal["in", "out", "adjustment"]


class StockMovementIn(BaseModel):
    product_id: str
    type: MovementType
    quantity: int
    note: Optional[str] = ""
    reference: Optional[str] = None  # invoice/sale id


class StockMovement(StockMovementIn):
    id: str = Field(default_factory=_uid)
    user_id: Optional[str] = None
    product_name: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)


# ============== SUPPLIERS ==============
class SupplierIn(BaseModel):
    name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""
    notes: Optional[str] = ""


class Supplier(SupplierIn):
    id: str = Field(default_factory=_uid)
    debt: float = 0.0
    created_at: datetime = Field(default_factory=_now)


class SupplierPaymentIn(BaseModel):
    amount: float
    note: Optional[str] = ""


# ============== CLIENTS ==============
class ClientIn(BaseModel):
    name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""


class Client(ClientIn):
    id: str = Field(default_factory=_uid)
    loyalty_points: int = 0
    total_spent: float = 0.0
    created_at: datetime = Field(default_factory=_now)


# ============== SALES (POS) ==============
class SaleItemIn(BaseModel):
    product_id: str
    quantity: int
    unit_price: float
    vat_rate: float = 20.0


class SaleItem(SaleItemIn):
    product_name: str
    line_total: float  # HT
    line_total_ttc: float


class SaleIn(BaseModel):
    items: List[SaleItemIn]
    discount: float = 0.0  # absolute amount on TTC
    payment_method: Literal["cash", "card", "mixed"] = "cash"
    cash_amount: float = 0.0
    card_amount: float = 0.0
    client_id: Optional[str] = None


class Sale(BaseModel):
    id: str = Field(default_factory=_uid)
    receipt_number: str
    items: List[SaleItem]
    subtotal_ht: float
    vat_total: float
    discount: float = 0.0
    total_ttc: float
    payment_method: str
    cash_amount: float = 0.0
    card_amount: float = 0.0
    client_id: Optional[str] = None
    cashier_id: Optional[str] = None
    cashier_name: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)


# ============== INVOICES ==============
class InvoiceIn(BaseModel):
    sale_id: Optional[str] = None
    client_id: Optional[str] = None
    client_name: Optional[str] = "Client comptoir"
    items: List[SaleItemIn]
    discount: float = 0.0
    notes: Optional[str] = ""


class Invoice(BaseModel):
    id: str = Field(default_factory=_uid)
    number: str  # FAC-2026-0001
    sale_id: Optional[str] = None
    client_id: Optional[str] = None
    client_name: str = "Client comptoir"
    items: List[SaleItem]
    subtotal_ht: float
    vat_total: float
    discount: float = 0.0
    total_ttc: float
    notes: str = ""
    issuer_id: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)
