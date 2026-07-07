# Claude Code Agent Lang
Español, siempre.

# AGENTS.md — moti (Next.js PWA)

## Project Overview
Mobile-first ride-hailing PWA for Colombia. React 19, Next.js 16 (App Router), Supabase Auth + Realtime, Prisma/PostgreSQL (shared with backend), Leaflet/Mapbox maps. Deployed on Vercel (no WebSockets; realtime via Supabase channels).

## Commands (run from `moti/`)

```bash
npm run dev       # next dev -H 0.0.0.0
npm run build     # next build
npm start         # next start
npm run lint      # ESLint (flat config)

docker compose up -d              # PostgreSQL (port 5432, db: moti_dev)
npx prisma migrate dev            # requires env vars
npx prisma generate               # client → ./generated/prisma/client
npx tsx prisma/seed.ts            # seed (file not yet created)
```

## Architecture

### Route Groups (`src/app/`)
| Group | Routes | Access |
|---|---|---|
| `(auth)` | `/login`, `/signup`, `/driver/onboarding` | Public (redirects if authed) |
| `(client)` | `/client/dashboard` | CLIENT, ADMIN |
| *(none)* | `/api/*` | Not yet implemented — must create under `src/app/api/` |

Middleware (`src/lib/supabase/middleware.ts`) enforces `PROTECTED_ROUTES`:
- `/client` → CLIENT, ADMIN
- `/driver` → DRIVER, ADMIN
- `/admin` → ADMIN only

### Source Layers
| Path | Purpose |
|---|---|
| `src/components/MapView.tsx` | Leaflet map; always `dynamic(..., { ssr: false })` |
| `src/components/GoogleMapView.tsx` | Mapbox Search JS + Google Maps (alternative) |
| `src/components/ui/` | `Button`, `Card`, `BottomNav`, `StatusBadge`, `Toast` |
| `src/lib/prisma.ts` | Singleton PrismaClient (shared with backend via path alias) |
| `src/lib/access-control.ts` | `canDriverOperate()` — monetization gate |
| `src/lib/whatsapp.ts` | `buildWhatsAppUrl()`, `formatCOP()` (COP = Int) |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server Supabase client + `createAdminClient()` |
| `src/proxy.ts` | Runs on all non-static routes (Next.js middleware) |

### Data Model (shared Prisma in `../backend-moti/prisma/schema.prisma`)
Models: `User`, `DriverProfile`, `RideRequest`, `Rides`, `RideOffer`, `AppConfig`, `RefreshToken`
- Prices = `BigInt` (COP). **Always** use `formatCOP()` to display. Min price: 4000 COP.
- Enums: `UserRole` (CLIENT\|DRIVER\|ADMIN), `RideStatus`, `VerificationStatus`

## Design System
Dark-mode-first, plain CSS (Tailwind v4 as PostCSS plugin only — no utility classes in JSX).

- CSS variables + component classes in `src/app/globals.css`
- Layout: `max-width: 480px` centered container, mobile-first
- Component classes: `.btn`, `.btn-primary`, `.btn-accent`, `.card`, `.card-glass`, `.badge`, `.bottom-nav`, `.screen-header`, `.page`, `.page-content`, `.container`
- Animations: `animate-fade-in`, `animate-slide-up`, `animate-slide-down`, `animate-pulse-glow`, `.stagger`

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      # createAdminClient()
DATABASE_URL                   # Prisma runtime
DIRECT_URL                     # Prisma migrations (bypasses pgbouncer)
NEXT_PUBLIC_ADMIN_WHATSAPP     # default: 573000000000
```

## What Is NOT Implemented
- All API routes (`/api/rides`, `/api/user/me`, `/api/user/create`, `/api/driver/onboarding`, `/api/admin/activate-pass`)
- Driver dashboard & ride screen
- Client negotiation & ride tracking
- Admin panels (`/admin/verify`, `/admin/config`, `/admin/dashboard`)
- Supabase Realtime subscriptions
- Geocoding (hardcoded Bogotá coords in client dashboard)
- PWA manifest (`/manifest.json` referenced in layout metadata)
- Any tests

## Toolchain Notes
- Next.js 16, React 19, TypeScript strict
- `@/*` → `./src/*`, `@prisma/client` → `./generated/prisma/client`
- ESLint 9 flat config (`eslint.config.mjs`)
- PostCSS + Tailwind v4 plugin only for tooling
- Leaflet + React-Leaflet for maps (SSR-disabled)
- Mapbox Search JS React for geocoding (not yet used)