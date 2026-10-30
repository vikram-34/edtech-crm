# EdTech CRM & Inquiry System

A full-stack CRM for an education organisation. Parents, students and schools submit inquiries through a public form, and admins manage them from a protected dashboard. The admin login is **custom-built** with bcrypt + JWT; Supabase is used **only** as the PostgreSQL database.

---

## 1. Overview and features

**Public inquiry form** (`/`, no login)
- User Type (Parent / Student / School) and Category (Scholarship / Concert / Admission / General Query) dropdowns with `Select...` placeholders
- Name, Email, Phone Number and Message / Query fields
- Inline field errors using the same rules as the server, a loading state while submitting, a success message with form reset, and server errors displayed
- Saves directly into the Supabase PostgreSQL `inquiries` table

**Custom admin authentication**
- Passwords hashed with **bcrypt** (12 rounds), never stored in plain text
- **JWT** issued on login (`{ sub, email, role: 'admin' }`, signed with `JWT_SECRET`, default 1-day expiry)
- Express **middleware** protects every admin route, returning `401` for a missing, invalid or expired token
- Login is rate-limited (10 requests / 15 min per IP); the same `401 Invalid email or password` is returned for an unknown email and for a wrong password

**Admin dashboard** (`/admin/dashboard`, authenticated admins only)
- Table of all inquiries: Name, Phone, Email, User Type, Category, Date (`30 Oct 2026, 6:47 PM`), Status, Message
- Filter by **Category** and **User Type**, plus a **search** box matching name or phone (debounced 400 ms). All filtering happens server-side through query parameters
- Inline status dropdown (New / In Progress / Resolved) saved immediately with `PATCH`
- Message preview with a **View** modal for the full text
- Result count, summary cards, loading / empty / error states, Clear filters, Refresh, Logout

**Design**: clean card-based UI built on CSS variables, colour-coded badges for categories and statuses, fully responsive (the form stacks to one column and the table scrolls horizontally on mobile).

---

## 2. Tech stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18, Vite 5, react-router-dom 6, plain CSS (no UI library) |
| Backend  | Node.js 20+, Express 4 (ES modules), `pg` Pool, `bcrypt`, `jsonwebtoken`, `helmet`, `cors`, `express-rate-limit`, `dotenv` |
| Database | Supabase PostgreSQL, accessed directly with `pg` (no `@supabase/supabase-js`, no ORM) |
| Tooling  | `concurrently` to run both apps from the root |

---

## 3. Folder structure

```
.
├── schema.sql                 # admins + inquiries tables, indexes, RLS (idempotent)
├── README.md
├── .gitignore
├── .env.example               # all env vars in one place (copy into backend/ and frontend/)
├── package.json               # root scripts: install:all, dev (concurrently)
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── scripts/
│   │   ├── setupDb.js         # npm run db:setup   -> applies ../schema.sql
│   │   ├── seedAdmin.js       # npm run seed:admin -> bcrypt-hashes ADMIN_PASSWORD, upserts admin
│   │   └── seedDemo.js        # npm run seed:demo  -> 8 sample inquiries (only if table is empty)
│   └── src/
│       ├── server.js          # Express app: helmet, CORS, JSON limit, routes, 404, error handler
│       ├── config/db.js       # pg Pool (SSL, max 5), loads backend/.env
│       ├── middleware/
│       │   ├── auth.js        # requireAuth: verifies Bearer JWT, sets req.admin
│       │   └── errorHandler.js# asyncHandler, 404 handler, central error handler
│       ├── routes/
│       │   ├── auth.routes.js
│       │   └── inquiry.routes.js
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   └── inquiry.controller.js
│       └── utils/validators.js
└── frontend/
    ├── .env.example
    ├── vercel.json            # SPA rewrite for deployment
    ├── package.json, vite.config.js, index.html
    └── src/
        ├── main.jsx, App.jsx, index.css
        ├── constants.js       # option lists + client-side validation (mirrors the server)
        ├── api/client.js      # fetch wrapper, Bearer token, 401 -> logout + redirect
        ├── components/
        │   ├── Navbar.jsx
        │   └── ProtectedRoute.jsx
        └── pages/
            ├── InquiryForm.jsx
            ├── AdminLogin.jsx
            └── AdminDashboard.jsx
```

---

## 4. Prerequisites

- **Node.js 20 or newer** (uses `node --watch`) and npm
- A free **Supabase** account (https://supabase.com)
- `curl` for the API tests (built into macOS, Linux and Windows 10+; in PowerShell type `curl.exe`)

---

## 5. Supabase setup

1. Sign in to Supabase and click **New project**. Pick a name, a strong **database password** (save it) and a region close to you.
2. When the project is ready, click **Connect** in the top bar.
3. Under **Connection string**, choose the **Session pooler** tab (works on IPv4 networks) and copy the URI. It looks like:
   ```
   postgresql://postgres.<project-ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with your database password. **URL-encode** special characters (`@` -> `%40`, `#` -> `%23`, `/` -> `%2F`, `:` -> `%3A`).
5. Paste it as `DATABASE_URL` in `backend/.env` (see below). You do **not** need the Supabase API keys, and Supabase Auth is not used.

The tables are created by `npm run db:setup`. You can also paste `schema.sql` into the Supabase **SQL Editor** and run it; it is idempotent.

---

## 6. Environment variables

Copy the examples and fill in your values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

(On Windows PowerShell: `Copy-Item backend/.env.example backend/.env`, and the same for the frontend.)

A combined template with every variable for both apps is also available at the root [`.env.example`](.env.example).

### Backend (`backend/.env`)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `PORT` | no | `4000` | API port (default 4000; avoid 5000, used by macOS AirPlay) |
| `DATABASE_URL` | **yes** | `postgresql://postgres.<ref>:<pass>@aws-0-<region>.pooler.supabase.com:5432/postgres` | Supabase Session pooler connection string |
| `JWT_SECRET` | **yes** | 64-char random hex | Secret used to sign and verify JWTs |
| `JWT_EXPIRES_IN` | no | `1d` | Token lifetime (`15m`, `12h`, `1d`, ...) |
| `CLIENT_URL` | no | `http://localhost:5173` | Allowed CORS origin(s), comma-separated |
| `ADMIN_EMAIL` | for seeding | `admin@example.com` | Email of the admin created by `seed:admin` |
| `ADMIN_PASSWORD` | for seeding | a strong password | Password hashed with bcrypt by `seed:admin` |
| `TRUST_PROXY` | no | `1` | Set to `1` behind a reverse proxy (Render) so rate limits see the real client IP |

Generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend (`frontend/.env`)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | no | `http://localhost:4000/api` | Backend base URL including `/api` (defaults to `http://localhost:4000/api`) |

---

## 7. Run locally

```bash
# 1. Install root, backend and frontend dependencies
npm run install:all

# 2. Create the tables, the admin account and some demo data
cd backend
npm run db:setup     # applies ../schema.sql
npm run seed:admin   # creates/updates the admin from ADMIN_EMAIL / ADMIN_PASSWORD
npm run seed:demo    # 8 sample inquiries (skipped if the table already has rows)
cd ..

# 3. Start backend + frontend together
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api (health check: http://localhost:4000/api/health)

Run them separately with `npm run dev:backend` / `npm run dev:frontend` from the root, or `npm run dev` inside each folder.

---

## 8. Default admin login

The admin account is created by `npm run seed:admin` from the values in **`backend/.env`**:

- Email: the value of `ADMIN_EMAIL`
- Password: the value of `ADMIN_PASSWORD`

Re-running `seed:admin` after changing `ADMIN_PASSWORD` resets that admin's password. Credentials are never hard-coded in the source.

### Demo credentials (for evaluators)

- Email: `admin@edtechcrm.com`
- Password: `Admin@2026`

These are demo-only credentials seeded by `npm run seed:admin`. They work on the live demo and locally if you use the same values in backend/.env.

Live demo: <ADD DEPLOYED URL HERE>

---

## 9. How to test the custom JWT auth

Make sure the backend is running (`npm run dev`). Replace the email/password below with your `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### macOS / Linux / Git Bash

```bash
# 1. Log in and copy the "token" value from the response
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-admin-password"}'

# 2. Store it in a variable
TOKEN="paste-the-token-here"

# 3. With the token -> 200 OK and { "total": ..., "data": [...] }
curl -i http://localhost:4000/api/inquiries -H "Authorization: Bearer $TOKEN"

# 4. Without the token -> 401 {"error":"Authentication required: missing Authorization header"}
curl -i http://localhost:4000/api/inquiries

# 5. With a tampered token (signature no longer matches) -> 401 {"error":"Invalid token: please log in again"}
curl -i http://localhost:4000/api/inquiries -H "Authorization: Bearer ${TOKEN}tampered"

# Bonus: filters, the profile endpoint and a wrong password
curl -s "http://localhost:4000/api/inquiries?category=Scholarship&userType=Student&search=arjun" -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:4000/api/auth/me -H "Authorization: Bearer $TOKEN"
curl -i -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"wrong-password"}'   # -> 401 Invalid email or password
```

You can also tamper with the **payload** instead: paste the token into https://jwt.io, change `"role"` or `"email"`, and use the edited token. The signature check fails, so the API still returns `401`.

### Windows PowerShell

In PowerShell, `curl` can be an alias for `Invoke-WebRequest`, so call **`curl.exe`** explicitly. Logging in is easiest with `Invoke-RestMethod`:

```powershell
# 1. Log in and keep the token
$login = Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/auth/login `
  -ContentType 'application/json' `
  -Body '{"email":"admin@example.com","password":"your-admin-password"}'
$TOKEN = $login.token

# 2. With the token -> 200
curl.exe -i http://localhost:4000/api/inquiries -H "Authorization: Bearer $TOKEN"

# 3. Without the token -> 401
curl.exe -i http://localhost:4000/api/inquiries

# 4. Tampered token -> 401
curl.exe -i http://localhost:4000/api/inquiries -H "Authorization: Bearer $($TOKEN)tampered"
```

### Browser flow

1. Open http://localhost:5173/admin/dashboard while logged out: you are redirected to `/admin/login`.
2. Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`: the JWT is stored in `localStorage` (`edtech_crm_token`) and you land on the dashboard.
3. In DevTools -> Network, each `/api/inquiries` request carries `Authorization: Bearer <token>`.
4. In DevTools -> Application -> Local Storage, edit one character of `edtech_crm_token` and click **Refresh** on the dashboard. The API answers `401`, the app clears the token and sends you back to the login page with a "session expired" notice.
5. Visiting `/admin/login` while logged in sends you straight to the dashboard; **Logout** clears the token.

---

## 10. API reference

Base URL: `http://localhost:4000/api`. Errors always use `{ "error": "message" }`; validation errors return `400` with `{ "error": "Validation failed", "errors": { "field": "message" } }`.

| Method | Endpoint | Auth | Body / Query | Success response |
|--------|----------|------|--------------|------------------|
| GET | `/health` | Public | – | `200 { status, database, uptime, timestamp }` (`503` if the DB is unreachable) |
| POST | `/inquiries` | Public | `{ userType, category, name, email, phone, message }` | `201 { message, data: { id, createdAt } }` |
| POST | `/auth/login` | Public (10 req / 15 min) | `{ email, password }` | `200 { token, admin: { id, email } }` |
| GET | `/auth/me` | Bearer JWT | – | `200 { admin: { id, email, createdAt } }` |
| GET | `/inquiries` | Bearer JWT | Query: `category`, `userType`, `search` (all optional) | `200 { total, data: [inquiry] }`, newest first |
| PATCH | `/inquiries/:id/status` | Bearer JWT | `{ status: "New" \| "In Progress" \| "Resolved" }` | `200 { message, data: inquiry }` |

Inquiry object: `{ id, userType, category, name, email, phone, message, status, createdAt, updatedAt }`.

**Validation rules** (all inputs are trimmed): `userType` and `category` must be one of the allowed values; `name` 2–100 chars; `email` valid format; `phone` optional leading `+` then 10–15 digits after removing spaces and dashes; `message` 10–2000 chars.

---

## 11. Security notes

- **bcrypt**: admin passwords are hashed with bcrypt (12 salt rounds). Login lowercases the email and uses `bcrypt.compare`; for unknown emails it still compares against a dummy hash so response timing doesn't reveal which accounts exist, and it returns the same `401 Invalid email or password`.
- **JWT**: tokens are signed with HS256 using `JWT_SECRET` and expire after `JWT_EXPIRES_IN`. The payload is `{ sub, email, role: 'admin' }`; no secrets are put in it.
- **Middleware**: `requireAuth` requires `Authorization: Bearer <token>`, verifies signature, algorithm and expiry, checks the admin role, and returns a clear `401` otherwise. It guards `GET /inquiries`, `PATCH /inquiries/:id/status` and `GET /auth/me`.
- **No Supabase Auth**: authentication lives entirely in this Express backend. Supabase is only the Postgres host; the backend connects with `pg` over TLS.
- **Row Level Security**: RLS is enabled on `admins` and `inquiries` with **no policies**, so Supabase's auto-generated public REST/GraphQL APIs (anon key) cannot read or write them. The backend connects as the table owner, which RLS does not restrict.
- **SQL injection**: every query is parameterized (`$1, $2, ...`); filter clauses are built from a fixed whitelist, and `%`, `_` and `\` in search terms are escaped.
- **Hardening**: `helmet` security headers, CORS restricted to `CLIENT_URL`, 10 kb JSON body limit, rate limiting on login (and a looser one on the public form), 404 handler, and a central error handler that never sends stack traces.
- **Secrets**: `.env` files are git-ignored; only `.env.example` files with placeholders are committed.
- **Token storage**: the JWT is kept in `localStorage` for simplicity. For higher-security deployments, consider an `httpOnly` cookie plus CSRF protection.

---

## 12. Deployment notes

**Backend -> Render** (Web Service)
- Root directory: `backend`, Build command: `npm install`, Start command: `npm start`
- Environment variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL=https://<your-app>.vercel.app`, `TRUST_PROXY=1` (Render sets `PORT` itself)
- Run `npm run db:setup` and `npm run seed:admin` once (from the Render shell, or locally with the production `DATABASE_URL`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`)

**Frontend -> Vercel**
- Root directory: `frontend`, Framework preset: Vite (build `npm run build`, output `dist`)
- Environment variable: `VITE_API_URL=https://<your-api>.onrender.com/api`
- `vercel.json` rewrites every path to `index.html` so deep links like `/admin/dashboard` work

After both are live, make sure the backend's `CLIENT_URL` exactly matches the Vercel URL (no trailing slash).

---

## Design decisions and notes

- **bcrypt v6** is used: it ships prebuilt binaries, so no C++ build tools are needed on Windows/macOS/Linux.
- **Express 4** with a small `asyncHandler` wrapper forwards async errors to the central error handler.
- **Phone numbers are stored normalized** (spaces and dashes removed, e.g. `+919876543210`) and **emails lowercased**, so search and de-duplication behave predictably.
- Search ignores spaces and dashes when matching phone numbers, so `98765 43210` finds `+919876543210`.
- The API uses **camelCase JSON** (`userType`, `createdAt`), mapped from snake_case columns in SQL.
- `frontend/src/constants.js` (not in the original outline) holds the option lists and the client-side copy of the validation rules, shared by the form and the dashboard.
- The public `POST /inquiries` endpoint has a light rate limit (30 / 15 min per IP) as basic spam protection.
- `GET /api/health` also pings the database, so it reports `503` if Supabase is unreachable.
- `GET /inquiries` returns all matching rows without pagination; that suits the expected volume. Add `LIMIT/OFFSET` if it grows large.
- Vite runs with `strictPort` on 5173 so the dev server never silently moves to a port that CORS would reject.
- The database `pg` pool uses `ssl: { rejectUnauthorized: false }` (Supabase's pooler certificate isn't in Node's CA bundle), a maximum of 5 connections, and strips any `sslmode` URL parameter so it can't override that setting.
