# Task breakdown & ownership

How the website build is split so several agents (or people) can work in
parallel without stepping on each other. Every file has exactly one owner.
Shared contracts (types, component props, schema) are owned by **platform**;
change them only after coordinating.

## Milestone 1 — Website MVP (this repo) — ✅ merged

All workstreams below are merged and verified together (typecheck, lint, 178 tests,
production build, browser walkthrough). Open follow-ups are listed in `PLAN.md` §7.

| ID | Workstream | Owner | Owns (files) | Depends on |
|----|-----------|-------|--------------|-----------|
| P0 | Platform scaffold: Next.js, Prisma schema, Better Auth (Google), i18n, design tokens, UI primitives, header/footer, login, Cloudflare deploy + CI | platform | `prisma/**`, `src/lib/{db,auth,auth-client,session,env,stripe,money,utils}.ts`, `src/i18n/*.ts(x)`, `src/i18n/messages/{common,auth,index}.ts`, `src/components/{ui,site}/**`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/(site)/layout.tsx`, `src/app/(site)/login/**`, `src/app/api/{auth,health}/**`, config files | — |
| A1 | Catalog & recommendation: 18 plants, ~40 markets, pot pricing, scoring engine + tests | catalog | `src/data/**` (except `types.ts`), `src/lib/recommend.ts`, `src/lib/recommend.test.ts`, `src/i18n/messages/recommend.ts` | P0 |
| A2 | World map landing: cinematic map, geolocation highlight, region → country zoom, product story sections | map | `src/components/map/**`, `src/components/landing/**`, `src/lib/geo.ts`, `src/app/(site)/page.tsx`, `src/i18n/messages/landing.ts` | P0 (+A1 data at merge) |
| A3 | Pot & plant art: SVG smart pot with rotating camera/light ring, 18 plant illustrations, animated companion face | pot-art | `src/components/pot/**`, `src/components/plant-art/**`, `src/components/companion-face/**`, `src/i18n/messages/pot.ts` | P0 |
| A4 | Country store & commerce: country page, pot studio (size/finish/plant switcher), recommendation quiz, cart, Stripe Checkout + webhook, order success, waitlist | store | `src/app/(site)/c/**`, `src/app/(site)/checkout/**`, `src/app/api/{checkout,stripe,waitlist}/**`, `src/components/{store,cart}/**`, `src/lib/cart/**`, `src/lib/orders.ts`, `src/i18n/messages/store.ts` | P0, contracts of A1/A3 |
| A5 | Console (中台 MVP): overview, companion persona/model/params, memories, devices + token provisioning, telemetry, orders, AI playground; device API + Claude-powered brain | console | `src/app/console/**`, `src/app/api/{device,companion}/**`, `src/components/console/**`, `src/lib/companion/**`, `src/lib/vitals.ts`, `src/i18n/messages/console.ts` | P0, contract of A3 |
| A6 | Partners & admin: partner recruitment page + application form, admin for orders / partner applications / waitlist | partners | `src/app/(site)/partners/**`, `src/app/admin/**`, `src/components/partners/**`, `src/i18n/messages/partners.ts` | P0 |
| P1 | Integration: merge, full build, end-to-end check, docs, deploy guide | platform | `docs/**`, `README.md` | all |

### Contracts frozen for Milestone 1

- `src/data/types.ts` — catalog types, `PLANT_IDS` roster.
- `src/components/companion-face/types.ts` — `Expression`, `CompanionFaceProps`.
- `src/components/pot/types.ts` — `PotPreviewProps`.
- `PlantArt` props, `CartProvider` / `CartButton` exports.
- `src/lib/recommend.ts` exported types and `recommendPlants()` signature.
- `prisma/schema.prisma`.

## Milestone 2 — Hardware & apps (outside this repo)

| ID | Workstream | Notes |
|----|-----------|-------|
| H1 | Pot firmware (ESP32-S3): sensors, pump, grow light, ring motor, camera, mic/speaker, screen face | Talks to `/api/device/*` with a device bearer token |
| H2 | Voice pipeline: wake word on device, streaming STT/TTS in the cloud | Brain stays in this repo (`/api/device/chat`) |
| H3 | Desktop plugin (macOS/Windows tray app): active-window category, sit-time, focus sessions → reminders | Posts context to the platform; privacy-first, on-device classification |
| H4 | Mobile app (React Native / Expo): pot status, push alerts (low water, anomalies), Health/Google Fit, screenshot import | Same auth + API |
| H5 | Plant vision: periodic ring photos → growth timeline, disease/pest detection | Storage (S3/R2) + vision model |

## Milestone 3 — China & scale

- WeChat / phone login, Alipay & WeChat Pay, ICP filing, mainland hosting, map approval (审图号).
- Partner portal: nurseries manage stock & fulfilment per country.
- Catalog moves from code to DB/CMS.
