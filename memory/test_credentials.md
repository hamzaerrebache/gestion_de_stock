# Test Credentials — Parapharmacie

## Admin
- **Email**: `admin@parapharmacie.ma`
- **Password**: `Admin@2026`
- **Role**: `admin`

## Cashier (Caissier)
- **Email**: `caissier@parapharmacie.ma`
- **Password**: `Cashier@2026`
- **Role**: `caissier`

## Manager (Gestionnaire)
- **Email**: `gestionnaire@parapharmacie.ma`
- **Password**: `Manager@2026`
- **Role**: `gestionnaire`

## Auth Endpoints
- `POST /api/auth/login` — body: `{ email, password }` → sets `access_token` + `refresh_token` httpOnly cookies, returns `{ user, access_token }`
- `POST /api/auth/logout` — clears cookies (auth required)
- `GET /api/auth/me` — returns current user (auth required)

## Role Permissions (server-enforced)
- **admin**: full access (users management, all CRUD, all data)
- **gestionnaire**: products/categories/stock CRUD, suppliers CRUD, sales, invoices, reports, clients CRUD
- **caissier**: POS sales, view stock alerts, view products, manage clients (no delete)

## Frontend
- `/login` — login page
- All other routes are protected; some require specific roles (Products, Suppliers → admin+gestionnaire; Reports → admin+gestionnaire; Users → admin only)
