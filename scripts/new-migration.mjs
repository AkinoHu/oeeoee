#!/usr/bin/env node
/**
 * Create the next D1 migration from changes to prisma/schema.prisma.
 *
 *   pnpm db:migrate:local            # make sure the local D1 is up to date
 *   pnpm db:new-migration add_foo    # writes migrations/000N_add_foo.sql
 *   pnpm db:migrate:local            # apply it locally, then db:migrate:remote
 *
 * It diffs the local D1 database (wrangler's SQLite file) against the schema.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const name = (process.argv[2] ?? "").replace(/[^a-z0-9_]+/gi, "_").toLowerCase();
if (!name) {
  console.error("Usage: pnpm db:new-migration <name>");
  process.exit(1);
}

const d1Dir = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const sqlite = existsSync(d1Dir)
  ? readdirSync(d1Dir)
      .filter((f) => f.endsWith(".sqlite"))
      .map((f) => path.join(d1Dir, f))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0]
  : undefined;
if (!sqlite) {
  console.error("No local D1 database found. Run `pnpm db:migrate:local` first.");
  process.exit(1);
}

const existing = readdirSync("migrations").filter((f) => /^\d{4}_.*\.sql$/.test(f));
const next = String(existing.length + 1).padStart(4, "0");
const out = path.join("migrations", `${next}_${name}.sql`);

execFileSync(
  "pnpm",
  ["prisma", "migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--script", "-o", out],
  { stdio: "inherit", env: { ...process.env, DATABASE_URL: `file:${path.resolve(sqlite)}` } },
);
console.log(`Wrote ${out}`);
