# Donation Matching Portal

Built for the Mastercard India "Code for Change" Hackathon 2024 (sponsor: Seva Sahayog Foundation).
Connects donors (individuals/corporates/institutions) with receivers (NGOs, schools, old-age homes) — replacing manual coordinator matching with an automated, moderated, explainable matching pipeline.

## Architecture

```
donation-portal/
├── server/     Node.js + Express API, Prisma ORM, PostgreSQL
└── client/     React 18 + Vite + Tailwind + React Query + i18next
```

**Tech stack**
| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, React Query, react-i18next |
| Backend | Node.js, Express |
| DB | PostgreSQL + Prisma ORM |
| Auth | JWT (access + rotating refresh tokens), bcrypt, role-based middleware |
| File storage | Cloudinary (signed client uploads) |
| Moderation | Keyword blocklist + heuristic check (text), pluggable stub (images) |
| Notifications | Nodemailer (email); stubbed Twilio interface for SMS |
| Deployment | Vercel (frontend) · Render/Railway (backend + Postgres) |

## Quickstart (local dev)

### 1. Database + backend

```bash
cd server
cp .env.example .env        # fill in DATABASE_URL, JWT secrets at minimum
npm install
npx prisma migrate dev --name init
npm run seed                # populates realistic demo data
npm run dev                 # http://localhost:4000
```

Demo login after seeding: `admin@sevasahayog.org` / `Password123!` (all seeded users share this password — donors: aarav.donor@example.com, priya.donor@example.com; receivers: contact@ashahome.example.org, etc.)

### 2. Frontend

```bash
cd client
cp .env.example .env        # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev                 # http://localhost:5173
```

### 3. Tests

```bash
cd server
npm test                    # Jest + Supertest — set DATABASE_URL to a disposable test DB first
```

## Deployment

- **Frontend → Vercel**: import the `client/` directory as the project root (see `client/vercel.json`); set `VITE_API_URL` to your deployed API URL.
- **Backend + DB → Render**: `render.yaml` at the repo root defines a web service (`rootDir: server`) plus a free Postgres instance. Push to a connected repo and Render provisions both; fill in the `sync: false` env vars (SMTP, Cloudinary) in the dashboard. Railway works identically if preferred — just point its Node service at `server/` with the same env vars.
- Run `npx prisma migrate deploy && npm run seed` once against the production DB to get a populated demo.

## Feature checklist (mapped to the brief)

**Must-haves — implemented:**
- **A** Transparent connect/list/complete lifecycle (`pending_review → approved/rejected → matched → completed`)
- **B** Three roles (Donor / Receiver / Admin), enforced via JWT claims + Express middleware — not just hidden UI
- **D** Donor quick listing flow (guided form → validation → moderation → status)
- **E** Donation + photos + receiver requests persisted (Prisma models: `Donation`, `Request`)
- **H** Receiver quick request flow (mirrors donor flow)
- **I** Search/filter/paginate on donations & requests from day one
- **L** Admin match review & approval screen (`/admin`, moderation queue + suggested-match review)

**Good-to-haves — implemented:**
- **C** Multilingual UI (English + Hindi via i18next, language switcher in navbar)
- **F** Auto content/image moderation on listings (`utils/moderation.js` — keyword blocklist + heuristic + image-check stub)
- **G / K** Donor & receiver notified on match approval (email via Nodemailer, both parties, one admin click)
- **J** Same automated moderation pipeline applied to receiver requests, not just donations
- **M** Admin export to CSV and PDF (`/api/admin/export.csv`, `/api/admin/export.pdf`)

## Key design decisions (the differentiators)

- **Explainable matching, not a black box** — `server/src/utils/matching.js` scores each donation/request pair on category (hard filter), quantity fit, location, urgency, and recency, and returns the per-factor contribution alongside the total score. The admin UI renders that breakdown next to every suggested match.
- **Moderation before anything goes live** — every donation and request submission runs through `runModerationPipeline()` synchronously: clear violations auto-reject, clean low-risk listings auto-approve, everything else queues for admin review. Same pipeline, same code path, for both donors and receivers.
- **Security defaults, not afterthoughts** — Zod validation shared in shape between client and server (server is the enforced copy), `express-rate-limit` on auth and submission routes, `sanitize-html` on every free-text field before storage, parameterized queries via Prisma, short-lived access tokens with rotating refresh tokens, soft deletes everywhere (`deletedAt`) so audit history survives.
- **Audit trail** — every automated or admin moderation decision writes a `ModerationLog` row (`reviewedBy: null` = automated); every match decision records `approvedBy`. `/api/admin/audit-log` surfaces it.
- **Production-shaped, not demo-shaped** — pagination, empty/loading/error states, graceful degradation (mailer/SMS fall back to console-log stubs when unconfigured so the app never crashes without secrets configured), `.env.example` for both apps, a seed script so the judges see a populated app on first run, and a handful of Jest/Supertest tests covering auth, RBAC, moderation auto-decisions, and the matching engine's scoring logic.

## What's stubbed / left for extension

- **Image moderation** (`utils/moderation.js → moderateImages`) is a pass-through stub — wire up Cloudinary's AWS Rekognition add-on or any NSFW-detection API.
- **SMS** (`utils/mailer.js → sendSms`) has the interface shape ready but throws unless `TWILIO_ENABLED=true` and a real client is wired in — the brief notes judges rarely need live SMS.
- **Photo upload UI**: the signed-upload endpoint (`utils/cloudinary.js`) and env vars are wired server-side; the client form currently accepts photo URLs directly rather than including a full drag-and-drop uploader widget — swap in Cloudinary's upload widget or a simple `<input type=file>` + signed POST for a complete flow.
- A third regional language locale file (beyond English + Hindi) is a one-file addition in `client/src/i18n/locales/`.
