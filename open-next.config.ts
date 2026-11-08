import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Every page renders per request (no ISR), so no incremental cache is configured.
export default defineCloudflareConfig({});
