# Implementation Plan: Part 4.1 — First-Time Super Admin Setup

## Codebase Context

| Aspect | Current State |
|--------|---------------|
| Backend | Fastify 5, Drizzle ORM (PostgreSQL), Bcrypt, JWT, Redis |
| Frontend | React 18, Zustand 5, React Router 7, TailwindCSS 3, i18next |
| Infra | Docker Compose (postgres, redis, app), pnpm monorepo |
| DB Schema | `admins` table with `id`, `username`, `password_hash`, `is_super_admin` |
| Auth | JWT-based; `AdminLayout` guards on `token` presence; login at `/admin/login` |
| Hash | `backend/src/utils/hash.ts` exports `hashPassword()` and `verifyPassword()` |
| API client | `frontend/src/lib/api.ts` — axios instance with baseURL `VITE_API_URL`, JWT interceptor |

---

## Phase 1: Local Data Persistence & Developer Reset Script

### Step 1.1 — Local volume mount for PostgreSQL

**File:** `docker-compose.yml:24-25`

Replace the named volume with a local bind mount:

```yaml
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
```

Also remove `pgdata` and `redisdata` from the top-level `volumes:` block (lines 38-39) since they're no longer needed. Keep the named `redisdata` volume for Redis.

### Step 1.2 — Add `./data` to `.gitignore`

**File:** `.gitignore:7`

Append line:
```
data/
```

### Step 1.3 — Create `scripts/reset-dev.sh`

**New file:** `scripts/reset-dev.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "[reset-dev] Tearing down containers and volumes..."
docker compose down -v

echo "[reset-dev] Wiping local PostgreSQL data..."
rm -rf ./data

echo "[reset-dev] Wiping local uploads..."
rm -rf ./backend/uploads/*
touch ./backend/uploads/.gitkeep

echo "[reset-dev] Starting fresh containers..."
docker compose up -d

echo "[reset-dev] Waiting for Postgres to be ready..."
sleep 3

echo "[reset-dev] Pushing Drizzle schema..."
pnpm --filter @lectureflow/backend db:push

echo "[reset-dev] Done. Fresh environment ready."
```

### Step 1.4 — Make script executable

```bash
chmod +x scripts/reset-dev.sh
```

---

## Phase 2: Backend Setup Routes (Security Layers 1 & 3)

### Step 2.1 — Delete the seed script

**Delete file:** `backend/src/db/seed.ts`

### Step 2.2 — Create `GET /api/setup/status` route

**New file:** `backend/src/api/setup.routes.ts`

Register a Fastify plugin with two routes:

**GET `/api/setup/status`** — Query `admins` for any row where `is_super_admin = true`. Return `{ hasSuperAdmin: boolean }`.

**POST `/api/setup/init`** — Accept `{ username, password }`. First query if any super admin exists (Security Layer 3). If yes, return `403 Forbidden`. If no, hash password via `hashPassword()` from `../utils/hash.js`, insert into `admins` with `is_super_admin: true`, return `201 Created`.

Route pattern follows existing conventions (same style as `auth.routes.ts`):
- Import `FastifyInstance` from `fastify`
- Import `db` from `../db/index.js`
- Import `admins` from `../db/schema.js`
- Import `hashPassword` from `../utils/hash.js`
- Use `eq` from `drizzle-orm`
- Export `async function setupRoutes(fastify: FastifyInstance)`

### Step 2.3 — Register setup routes in the app

**File:** `backend/src/index.ts`

Add import:
```typescript
import { setupRoutes } from "./api/setup.routes.js";
```

Add registration (before the `app.get("/health"...)` line):
```typescript
app.register(setupRoutes, { prefix: "/api/setup" });
```

This exposes:
- `GET /api/setup/status`
- `POST /api/setup/init`

---

## Phase 3: Frontend Setup Store & Routing Guard (Security Layer 2)

### Step 3.1 — Create Zustand setup store

**New file:** `frontend/src/store/useSetupStore.ts`

```typescript
import { create } from 'zustand'
import api from '../lib/api'

interface SetupState {
  hasSuperAdmin: boolean | null
  checkStatus: () => Promise<void>
}

export const useSetupStore = create<SetupState>((set) => ({
  hasSuperAdmin: null,
  checkStatus: async () => {
    const { data } = await api.get('/setup/status')
    set({ hasSuperAdmin: data.hasSuperAdmin })
  },
}))
```

Note: The baseURL is `VITE_API_URL` (set in the axios instance), so `/setup/status` resolves to `/api/setup/status`.

### Step 3.2 — Add `/admin/setup` route

**File:** `frontend/src/router/index.tsx`

Add import:
```typescript
import { AdminSetupPage } from '../pages/AdminSetupPage'
```

Add route (at a peer level to `/admin/login`):
```typescript
  {
    path: '/admin/setup',
    element: <AdminSetupPage />,
  },
```

### Step 3.3 — Create AdminGuard wrapper

**New file:** `frontend/src/components/AdminGuard.tsx`

A wrapper component that:
1. On mount (and on route change), calls `useSetupStore.getState().checkStatus()`
2. While `hasSuperAdmin === null`, shows a loading spinner
3. If `hasSuperAdmin === false` and current path is not `/admin/setup`, redirects to `/admin/setup`
4. If `hasSuperAdmin === true` and current path is `/admin/setup`, redirects to `/admin/login`
5. Otherwise renders children via `<Outlet />`

### Step 3.4 — Wrap admin routes with AdminGuard

**File:** `frontend/src/router/index.tsx`

Wrap the `/admin` layout route (and its children) inside a parent route that uses `AdminGuard`:

```typescript
{
  element: <AdminGuard />,
  children: [
    {
      path: '/admin/login',
      element: <AdminLoginPage />,
    },
    {
      path: '/admin/setup',
      element: <AdminSetupPage />,
    },
    {
      path: '/admin',
      element: <AdminLayout />,
      children: [
        { index: true, element: <AdminDashboardPage /> },
      ],
    },
  ],
},
```

And move the `/admin/login` and `/admin/setup` routes inside the guard as well (since we want `AdminGuard` to handle the redirection logic for both).

---

## Phase 4: Frontend Setup UI

### Step 4.1 — Create AdminSetupPage

**New file:** `frontend/src/pages/AdminSetupPage.tsx`

A Tailwind-styled form with:
- Title: "Ersteinrichtung" / "First-Time Setup" (use i18n; existing locales at `frontend/src/i18n/locales/en.json` and `de.json`)
- Input: "Super Admin Username"
- Input: "Password" (type password)
- Input: "Confirm Password" (type password)
- Client-side validation: password === confirmPassword, minimum length 8
- Submit button calling `POST /api/setup/init` via the axios instance
- On 201: call `checkStatus()` then `navigate('/admin/login', { replace: true })`
- Error display for 403 ("Super Admin already exists") or other errors
- Style matches `AdminLoginPage` pattern (centered card, gradient bg, rounded-2xl, shadow-xl)

### Step 4.2 — Add i18n translation keys

**File:** `frontend/src/i18n/locales/en.json`

Add under a `admin.setup` namespace:
```json
{
  "admin": {
    "setup": {
      "title": "First-Time Setup",
      "subtitle": "Create your Super Admin account",
      "username": "Super Admin Username",
      "password": "Password",
      "confirmPassword": "Confirm Password",
      "submit": "Create Super Admin",
      "passwordMismatch": "Passwords do not match",
      "passwordTooShort": "Password must be at least 8 characters",
      "alreadyExists": "Super Admin already exists",
      "setupFailed": "Setup failed. Please try again."
    }
  }
}
```

**File:** `frontend/src/i18n/locales/de.json`

Add corresponding German translations.

---

## 5. Verification Checklist

| # | Test | Expected Result |
|---|------|-----------------|
| 1 | `./scripts/reset-dev.sh` | `./data` deleted & recreated, `docker ps` shows DB running |
| 2 | `curl localhost:3000/api/setup/status` on fresh DB | `{"hasSuperAdmin": false}` |
| 3 | POST to `/api/setup/init` with valid payload | `201 Created` |
| 4 | POST to `/api/setup/init` again | `403 Forbidden` "Super Admin already exists" |
| 5 | Open `localhost:5173/admin/login` on fresh DB | Redirected to `/admin/setup` |
| 6 | Fill form and submit | Redirected to `/admin/login` |
| 7 | Navigate to `/admin/setup` via URL bar after setup | Redirected to `/admin/login` |
| 8 | Double-click submit button rapidly | Only first request returns 201, rest 403 |

---

## Files Changed Summary

| Action | File |
|--------|------|
| **DELETE** | `backend/src/db/seed.ts` |
| **CREATE** | `scripts/reset-dev.sh` |
| **CREATE** | `backend/src/api/setup.routes.ts` |
| **CREATE** | `frontend/src/store/useSetupStore.ts` |
| **CREATE** | `frontend/src/components/AdminGuard.tsx` |
| **CREATE** | `frontend/src/pages/AdminSetupPage.tsx` |
| **EDIT** | `docker-compose.yml` (volumes: local bind mount) |
| **EDIT** | `.gitignore` (add `data/`) |
| **EDIT** | `backend/src/index.ts` (register setup routes) |
| **EDIT** | `frontend/src/router/index.tsx` (add guard + setup route) |
| **EDIT** | `frontend/src/i18n/locales/en.json` (setup translations) |
| **EDIT** | `frontend/src/i18n/locales/de.json` (setup translations) |