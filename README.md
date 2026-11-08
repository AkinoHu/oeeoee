# oeeoee

A living AI companion for your desk — a smart plant pot that cares for its plant
automatically and keeps you company through an AI character on its screen.

This repo contains the website (world-map storefront), the account system and
the web platform ("中台") that hosts the companion's brain.

- Product & business plan: [`docs/PLAN.md`](docs/PLAN.md)
- Task breakdown: [`docs/TASKS.md`](docs/TASKS.md)
- Deploying to Railway: [`docs/DEPLOY.md`](docs/DEPLOY.md)

## Quick start

```bash
pnpm install
cp .env.example .env          # set DATABASE_URL + BETTER_AUTH_SECRET at minimum
pnpm db:migrate
pnpm dev                      # http://localhost:3000
```
