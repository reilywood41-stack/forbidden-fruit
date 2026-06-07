# Forbidden Fruit

An elite subscription content platform with tiered membership (Bronze/Silver/Gold), model profiles, video call bookings, direct messages, posts, referrals, and an admin dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/forbidden-fruit run dev` — run the frontend (port 23906)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7, Tailwind CSS v4, Wouter routing, TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (bcrypt passwords, 30-day tokens stored in localStorage)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle ORM schema (users, content, models, payments, bookings, dms, posts, notifications, referrals, settings)
- `artifacts/api-server/src/routes/` — Express route handlers (one file per domain)
- `artifacts/api-server/src/lib/auth.ts` — JWT auth middleware (requireAuth, requireAdmin, optionalAuth)
- `artifacts/forbidden-fruit/src/pages/` — all frontend pages
- `artifacts/forbidden-fruit/src/lib/auth.tsx` — React AuthProvider and useAuth hook

## Architecture decisions

- Token-based auth (JWT) stored in localStorage; `setAuthTokenGetter` wires token into every API call
- Manual payment flow (CashApp / gift card screenshot upload) reviewed by admin before membership is granted
- DB migrations run at server startup via raw SQL (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) to handle incremental schema changes
- `lib/object-storage-web` — Uppy-based file upload component for screenshot/media uploads
- Admin-only routes check `req.user?.isAdmin` via `requireAdmin` middleware

## Product

- **Landing** — public hero page, membership tier overview, CTA to register
- **Content Feed** — browse videos/images/galleries filtered by tier and type
- **Model Profiles** — individual model pages with booking CTA
- **Membership** — submit CashApp or gift card payment for tier upgrade
- **Bookings** — book 1-on-1 video calls via Telegram
- **DMs** — direct message models
- **Posts** — model posts (image/video) with likes
- **Referrals** — referral code sharing with goal tracking
- **Notifications** — system/payment/booking alerts
- **Admin Dashboard** — manage users, content, models, payments, bookings, analytics

## Gotchas

- After any `openapi.yaml` change, run `pnpm --filter @workspace/api-spec run codegen` before touching frontend code
- DB migrations in `artifacts/api-server/src/index.ts` run at startup — add new `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` there for incremental changes
- The `recharts` package has a deprecation warning (^2.15.x) — harmless, still works

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
