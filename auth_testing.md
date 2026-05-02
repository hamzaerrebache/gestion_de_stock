# Auth Testing Playbook

## MongoDB Verification
```
mongosh
use parapharmacie_db
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
```
Verify:
- bcrypt hash starts with `$2b$`
- Indexes exist on users.email (unique), login_attempts.identifier, password_reset_tokens.expires_at (TTL)

## API Testing
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@parapharmacie.ma","password":"Admin@2026"}'
cat cookies.txt
curl -b cookies.txt http://localhost:8001/api/auth/me
```

Expected:
- Login returns user object with `role: "admin"` and sets `access_token` + `refresh_token` cookies
- `/me` returns same user via cookies

## Test Roles
- Admin: `admin@parapharmacie.ma` / `Admin@2026`
- Caissier (test): created via `/api/users` by admin
- Gestionnaire (test): created via `/api/users` by admin
