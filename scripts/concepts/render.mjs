/**
 * Renders the 3D pot form sketches (scripts/concepts/pot-forms.html) to PNG files.
 * Review material only; `three` and `playwright` are deliberately not project dependencies.
 *
 *   mkdir /tmp/pot-forms && cd /tmp/pot-forms
 *   npm init -y && npm i three@0.170.0
 *   cp <repo>/scripts/concepts/pot-forms.html <repo>/scripts/concepts/render.mjs .
 *   python3 -m http.server 8765 &
 *   node render.mjs            # needs a Playwright install with Chromium
 *
 * Writes d-<form>.png (day) and n-<form>.png (night) next to this file.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const FORMS = ["pod", "lantern", "moon", "buddy", "bare"];
const W = 1040;
const H = 1300;
const BASE = process.env.BASE ?? "http://localhost:8765/pot-forms.html";

// Software WebGL, so this also runs on machines without a GPU.
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const form of FORMS) {
  for (const night of [false, true]) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    page.on("pageerror", (e) => console.error(form, String(e)));
    await page.goto(`${BASE}?c=${form}&w=${W}&h=${H}${night ? "&night=1" : ""}`);
    await page.waitForFunction("window.__done === true", null, { timeout: 120_000 });
    await page.screenshot({ path: `${night ? "n" : "d"}-${form}.png` });
    await page.close();
    console.log(`${night ? "night" : "day"} ${form}`);
  }
}
await browser.close();
