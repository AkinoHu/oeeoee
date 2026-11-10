<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# oeeoee — conventions for coding agents

Product: a smart plant pot with an AI companion face. This repo is the website
(storefront + world map), the account system and the web platform ("中台")
that hosts the companion's brain. See `docs/PLAN.md` and `docs/TASKS.md`.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Turbopack. **Cache Components are OFF**
  (classic dynamic rendering). `params`, `searchParams`, `cookies()`, `headers()` are async.
  `PageProps<"/route">` / `LayoutProps<"/route">` are global generated types (`next typegen`).
  `middleware.ts` is now `proxy.ts` (we don't use one).
- Tailwind CSS v4 — tokens in `src/app/globals.css`, design rules in `docs/DESIGN.md`. Warm "day"
  theme by default; wrap a block in `.theme-night` for the lamp-lit mood (same utilities).
  Semantic utilities only: `bg-bg`, `bg-surface(-2/-3)`, `border-line(-strong)`, `text-fg`,
  `text-muted`, `text-faint`, `leaf-50…900` (200–300 = readable accent), `sky`, `sun`, `rose`,
  warm accents `honey`, `peach`, `clay`, `sprout`, `bg-screen` (the pot's display). Helpers:
  `.glass`, `.text-gradient`, `.bg-grid`, `.eyebrow`, `.lamp-glow`, `shadow-soft`. Never hard-code
  colours — use `rgb(var(--accent|--glow|--ink)/a)` for arbitrary alphas.
- Prisma 7 + PostgreSQL. Client: `import { prisma } from "@/lib/db"`. Generated types:
  `@/generated/prisma/client`. **Do not edit `prisma/schema.prisma`** without coordinating.
- Better Auth (Google OAuth; email+password only when `AUTH_DEV_PASSWORD_LOGIN=true`).
  Server: `getSession()`, `getUser()`, `requireUser(returnTo)`, `requireAdmin()` from `@/lib/session`.
  Client: `signIn`, `signOut`, `useSession` from `@/lib/auth-client`.
- Stripe: `getStripe()` from `@/lib/stripe` (null when unconfigured). Feature flags: `features` from `@/lib/env`.
- Motion: `import { motion } from "motion/react"`. Icons: `lucide-react`. Class merge: `cn()` from `@/lib/utils`.
- Map: `d3-geo` + `topojson-client` + `world-atlas`. Miller projection; the dot grid is precomputed by
  `node scripts/map/build-dots.mjs` (re-run after changing the projection or the atlas).

## i18n (en / zh / ja)

- One namespace file per feature in `src/i18n/messages/<ns>.ts`, flat dot keys, English is the
  source of truth and `zh`/`ja` must have identical keys (type-enforced).
- Server: `const t = await getT("store")`. Client: `const t = useT("store")`, `useLocale()`.
- Interpolation: `t("cart.count", { n: 3 })` with `"{n} items"`.
- Catalog text uses `LocalizedText` — render with `lt(text, locale)` from `@/data`.
- Never hard-code user-visible strings in components.
- Voice: warm and short, in the companion's first person where it fits (see `docs/DESIGN.md` §4).

## Catalog

- `@/data` exports accessors (`getCountry`, `listCountries`, `getPlant`, `plantsForCountry`,
  `plantPrice`, `getPotModel`, `listFinishes`, …) and all types. Money is in **minor units**;
  format with `formatMoney(amount, currency, locale)` from `@/lib/money`.
- Recommendations: `recommendPlants()` from `@/lib/recommend`.

## Shared component contracts (do not change props without coordinating)

- `CompanionFace` (`@/components/companion-face/CompanionFace`) — `{ expression, talking, size }`.
- `PotPreview` (`@/components/pot/PotPreview`) — `{ size, finish, plantId, expression, ringRotating, lightOn, annotated }`.
- `PlantArt` (`@/components/plant-art/PlantArt`) — `{ plantId, width, animated }`.
- `CartProvider` / `CartButton` (`@/components/cart/*`).
- UI primitives: `@/components/ui/button` (`Button`, `ButtonLink`, `buttonVariants`),
  `@/components/ui/primitives` (`Container`, `Card`, `Badge`, `Input`, `Textarea`, `Select`, `Label`, `SectionHeading`)
  and `@/components/ui/speech-bubble` (`SpeechBubble` — the companion's voice).

## Commands

```bash
pnpm dev            # http://localhost:3000
pnpm typecheck      # next typegen && tsc --noEmit
pnpm lint
pnpm test           # vitest (src/**/*.test.ts)
pnpm build
pnpm db:migrate     # prisma migrate dev
```

Local DB: `postgresql://postgres:postgres@localhost:5432/oeeoee`. Copy `.env.example` → `.env`.
Set `BETTER_AUTH_URL`/`NEXT_PUBLIC_APP_URL` to the port you run on, or auth rejects the origin.

## Quality bar

- Mobile first: everything works at 375px wide. Keyboard accessible. Respect reduced motion.
- Server components by default; `"use client"` only where interaction needs it.
- Validate all request bodies with `zod`. Never trust client prices — recompute on the server.
- No secrets in code. No `any` unless unavoidable.
