# Vercel Deployment & Production Setup Guide
## Smart Equipment Care System (SECS) — PERN Stack

This guide details how to deploy SECS to **Vercel** as a full-stack PERN application (PostgreSQL + Express.js Serverless + React 19 + Node.js) with real HTTP API connections.

---

## 1. Architecture on Vercel

```mermaid
flowchart TD
    Client["Browser / Users"]
    Vercel["Vercel Edge Network"]
    SPA["React 19 Frontend (Vite Build in /dist)"]
    API["Serverless Express API (api/index.js)"]
    DB[("PostgreSQL Database\n(Neon / Supabase / Vercel Postgres)")]

    Client -->|HTTPS| Vercel
    Vercel -->|/* routes| SPA
    Vercel -->|/api/* routes| API
    API -->|DATABASE_URL / SQL Pool| DB
```

- **Frontend:** React 19 + Tailwind CSS compiled via Vite into static assets (`dist/`).
- **Backend:** Express REST API running as a native Vercel Serverless Function via [`api/index.js`](./api/index.js) and configured via [`vercel.json`](./vercel.json).
- **Database:** PostgreSQL (Neon, Supabase, Vercel Postgres, or Railway).
- **API Connection:** Real HTTP requests from [`src/services/secsApi.ts`](./src/services/secsApi.ts) to `/api/v1/...` with automatic JWT Bearer token authentication.

---

## 2. Deployment Steps (Step-by-Step)

### Step 1: Push Repository to GitHub
1. Initialize Git in the project root (if not already done):
   ```bash
   git init
   git add .
   git commit -m "feat: complete PERN stack with Vercel serverless integration"
   ```
2. Create a repository on [GitHub](https://github.com/new) and push your code:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```
   *(Note: `.figma/` and `.figaro/` are automatically excluded via `.gitignore`)*

---

### Step 2: Set up a Free Cloud PostgreSQL Database
Choose any free cloud PostgreSQL provider:
- **[Neon](https://neon.tech/)** (Recommended — instant setup, serverless, free tier)
- **[Supabase](https://supabase.com/)**
- **[Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)**

Copy your PostgreSQL connection string (`DATABASE_URL`). Example:
```text
postgres://alex:secretpass@ep-cool-butterfly-123456.us-east-1.aws.neon.tech/secs_db?sslmode=require
```

---

### Step 3: Run Database Migrations & Seeds
Run the automated initialization script locally pointing to your cloud database:
```bash
DATABASE_URL="your-postgresql-connection-string" node server/db/init.js
```
This automatically runs:
- [`server/db/schema.sql`](./server/db/schema.sql) — creates all 7 relational tables, foreign keys, and indexes.
- [`server/db/seeds.sql`](./server/db/seeds.sql) — inserts campus labs, staff roles, and initial equipment records.

---

### Step 4: Import into Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New Project"**.
2. Select your GitHub repository.
3. Vercel will automatically detect **Vite**:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./`
   - **Build Command:** `vite build`
   - **Output Directory:** `dist`
4. Expand **Environment Variables** and add:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `postgres://user:pass@host/secs_db?sslmode=require` | Your PostgreSQL connection string |
   | `JWT_SECRET` | `your-secure-random-jwt-string-here` | Secret for signing auth tokens |
   | `NODE_ENV` | `production` | Production mode |
5. Click **Deploy**.

---

## 3. Verification & Live Endpoints

Once deployment completes, Vercel gives you a live URL (e.g., `https://secs-university.vercel.app`):

| Target | URL | Expected Behavior |
| :--- | :--- | :--- |
| **Landing Page** | `https://your-domain.vercel.app/` | Loads React 19 UI with dynamic metrics and ticket submission |
| **Public Issues API** | `https://your-domain.vercel.app/api/v1/issues/public` | Returns JSON of active issues with masked reporter emails |
| **Stats API** | `https://your-domain.vercel.app/api/v1/dashboard/stats` | Returns real-time issue count and budget totals |
| **Staff Portals** | `https://your-domain.vercel.app/` (Sign in button) | Admin, Higher Authority, Accounts, and Technician dashboards |

---

## 4. Default Seed Staff Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **System Admin** | `mahmud.kabir@uitc.edu` | `Admin@123` |
| **Higher Authority** | `samina.haque@uitc.edu` | `Auth@123` *(or `Admin@123`)* |
| **Accounts Officer** | `nusrat.islam@uitc.edu` | `Acct@123` *(or `Admin@123`)* |
| **Lab Technician** | `ashik.rahman@uitc.edu` | `Tech@123` *(or `Admin@123`)* |

