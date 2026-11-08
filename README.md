# oeeoee

A living AI companion for your desk — a smart plant pot that cares for its plant
automatically and keeps you company through an AI character on its screen.

This repo contains the website (world-map storefront), the account system and
the web platform ("中台") that hosts the companion's brain.

- Product & business plan: [`docs/PLAN.md`](docs/PLAN.md)
- Task breakdown: [`docs/TASKS.md`](docs/TASKS.md)
- Deploying to Cloudflare (oeeoee.com): [`docs/DEPLOY.md`](docs/DEPLOY.md)
- Pot ↔ platform device API (for firmware): [`docs/DEVICE_API.md`](docs/DEVICE_API.md)

## Quick start

```bash
pnpm install
cp .env.example .env          # set BETTER_AUTH_SECRET
pnpm db:migrate:local         # create tables in the local D1 database
pnpm dev                      # http://localhost:3000
```
