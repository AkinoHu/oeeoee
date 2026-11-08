import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // The app talks to Cloudflare D1 through @prisma/adapter-d1, so this URL is
    // only used by Prisma CLI tooling (e.g. `prisma migrate diff`).
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
});
