import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Classic dynamic rendering model (Cache Components off): pages that read
  // cookies/headers (locale, session) simply render per request.
  turbopack: {
    rules: {
      "*.css": {
        // Leave CSS Modules to Next's own pipeline: matching them here turns
        // `*.module.css` into global CSS and `import styles` silently yields {}.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Turbopack's WASM loader (used by Prisma's query compiler) has a dynamic
  // path that makes the file tracer pull in the whole project. Keep dev tools,
  // CLIs and unused data out of the server bundle, or the Cloudflare Worker
  // blows past its size limit.
  outputFileTracingExcludes: {
    "*": [
      ".claude/**",
      ".wrangler/**",
      ".open-next/**",
      "migrations/**",
      "scripts/**",
      "docs/**",
      "**/node_modules/prisma/**",
      "**/node_modules/@prisma/client/runtime/query_compiler_*",
      "**/node_modules/@prisma/engines/**",
      "**/node_modules/@prisma/studio-core/**",
      "**/node_modules/wrangler/**",
      "**/node_modules/miniflare/**",
      "**/node_modules/workerd/**",
      "**/node_modules/@cloudflare/workerd-*/**",
      "**/node_modules/esbuild/**",
      "**/node_modules/@esbuild/**",
      "**/node_modules/eslint/**",
      "**/node_modules/eslint-*/**",
      "**/node_modules/@eslint/**",
      "**/node_modules/@typescript-eslint/**",
      "**/node_modules/typescript/**",
      "**/node_modules/vitest/**",
      "**/node_modules/@vitest/**",
      "**/node_modules/vite/**",
      "**/node_modules/tsx/**",
      "**/node_modules/tailwindcss/**",
      "**/node_modules/@tailwindcss/**",
      "**/node_modules/lightningcss*/**",
      "**/node_modules/world-atlas/*10m*.json",
      "**/node_modules/world-atlas/land-*.json",
      "**/node_modules/next/dist/compiled/@vercel/og/**",
      "**/node_modules/next/dist/server/capsize-font-metrics.json",
    ],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
};

export default nextConfig;

// `next dev`: expose Cloudflare bindings (local D1 etc.) via getCloudflareContext().
initOpenNextCloudflareForDev();
