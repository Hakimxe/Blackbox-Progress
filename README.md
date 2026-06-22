# Progress BBX

Internal daily-progress tracker for the BlackBox team. Each member gets a
personal link (`/u/<slug>`) with their priority, daily check-in questions
and recurring task checklist. The manager (`/manager`) sees a live snapshot
of everyone's progress and can override any check-in.

Built with **Next.js 14 (App Router) + TypeScript + Tailwind + libSQL**.

---

## Local development

```bash
npm install
cp .env.example .env.local        # then edit .env.local
npm run dev                       # http://localhost:3000
```

With no `TURSO_*` env vars set, the app writes to `./data/app.db`
(local SQLite). The DB auto-creates and seeds 6 members on first request.

Manager login: `admin` / `progress2026` (override via env).

---

## Deploy to Vercel

### 1. Create a Turso DB (free)

```bash
brew install tursodatabase/tap/turso
turso auth signup                 # or: turso auth login
turso db create progress-bbx --location cdg
turso db show progress-bbx --url
turso db tokens create progress-bbx
```

Save the URL and token — you'll paste them into Vercel.

### 2. Push to GitHub

```bash
git init && git add -A && git commit -m "Initial commit"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### 3. Import on Vercel

1. https://vercel.com/new → pick the repo
2. Framework preset: **Next.js** (auto-detected)
3. Add environment variables:

   | Name | Value |
   |---|---|
   | `TURSO_DATABASE_URL` | `libsql://progress-bbx-xxxx.turso.io` |
   | `TURSO_AUTH_TOKEN`   | (the long token) |
   | `SESSION_SECRET`     | `openssl rand -hex 32` |
   | `AUTH_USERNAME`      | your manager username |
   | `AUTH_PASSWORD`      | a strong password |

4. **Deploy**. The first request creates the schema and seeds the team.
5. Health check: `https://<deploy>.vercel.app/api/health`

### 4. Day-to-day

- Manager: `https://<deploy>.vercel.app/manager`
- Personal links are listed on the manager dashboard (Copy link button)
- Every `git push` to `main` re-deploys automatically

---

## Routes

| Path | Auth | Purpose |
|---|---|---|
| `/login`                          | public  | manager sign-in            |
| `/manager`                        | private | team overview              |
| `/manager/members/[id]`           | private | edit member, see answers   |
| `/u/[slug]`                       | public  | personal check-in page     |
| `/api/login`, `/api/logout`       | public  | auth                       |
| `/api/members[...]`               | private | CRUD members/tasks/questions |
| `/api/checkins`                   | public  | submit daily check-in      |
| `/api/checkins/[id]`              | private | manager override           |
| `/api/public/[slug]`              | public  | personal page data         |
| `/api/public/[slug]/tasks/[id]`   | public  | tick personal tasks        |

---

## Tech notes

- Auth is a tiny signed-cookie session (HMAC SHA-256) — no DB roundtrip on
  every request. Middleware enforces it on private routes.
- Tasks update **optimistically** on the personal page — no scroll jump
  when ticking items at the bottom.
- The check-in form **auto-saves a draft** to `localStorage` per day, so
  closing the tab doesn't lose progress.
