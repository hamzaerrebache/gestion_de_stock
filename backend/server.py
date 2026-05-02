"""FastAPI server entry — Parapharmacie Management."""
from dotenv import load_dotenv
load_dotenv()

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

# Mongo client (module-level so routes can `from server import db`)
_mongo_url = os.environ["MONGO_URL"]
_db_name = os.environ["DB_NAME"]
mongo_client = AsyncIOMotorClient(_mongo_url)
db = mongo_client[_db_name]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.products.create_index("barcode")
    await db.products.create_index("name")
    await db.sales.create_index("created_at")
    await db.invoices.create_index("number", unique=True)
    await db.stock_movements.create_index("created_at")
    await db.login_attempts.create_index("identifier")

    # Seed
    from seed import seed_admin, seed_demo_users, seed_sample_data
    await seed_admin(db)
    await seed_demo_users(db)
    await seed_sample_data(db)
    yield
    mongo_client.close()


app = FastAPI(title="Parapharmacie API", lifespan=lifespan)

# CORS — explicit origins required when allow_credentials=True
cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
from routes.auth_routes import router as auth_router
from routes.users_routes import router as users_router
from routes.catalog_routes import router as catalog_router
from routes.stock_routes import router as stock_router
from routes.business_routes import router as business_router

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(catalog_router)
app.include_router(stock_router)
app.include_router(business_router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "currency": os.environ.get("CURRENCY", "MAD")}


@app.get("/api/config")
async def config():
    return {
        "currency": os.environ.get("CURRENCY", "MAD"),
        "default_vat": float(os.environ.get("DEFAULT_VAT", "20")),
    }
