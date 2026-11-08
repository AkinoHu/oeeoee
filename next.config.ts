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
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
};

export default nextConfig;
