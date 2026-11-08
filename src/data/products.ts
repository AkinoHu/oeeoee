import type { PotFinish, PotModel } from "./types";

/**
 * The smart pot line-up. Owner: catalog agent.
 *
 * Prices are in minor units (CNY/USD/EUR/… cents; JPY/KRW are zero-decimal,
 * i.e. whole yen / won). They are anchored on the US price (tax-exclusive) and
 * converted at rough 2026 FX, then adjusted for how prices are shown locally:
 *  - EUR/GBP/JPY/KRW/SGD/AUD include VAT/GST, so they sit a bit above a pure
 *    FX conversion; USD/CAD are shown before sales tax.
 *  - CNY is priced ~10–15 % below FX parity: made and fulfilled in China.
 *  - Charm endings per market: x9 / x99 for most, ¥x,800 in Japan, ₩x9,000 in Korea.
 * Free-shipping thresholds in countries.ts equal the M price per currency.
 */
export const POT_MODELS: PotModel[] = [
  {
    size: "S",
    sku: "POT-S",
    name: { en: "oeeoee Mini", zh: "oeeoee Mini", ja: "oeeoee Mini" },
    tagline: {
      en: "Desk-sized companion for small, low-light plants.",
      zh: "书桌尺寸，适合小巧耐阴的植物。",
      ja: "デスクにちょうどいい、小さな植物向け。",
    },
    dims: { diameterCm: 12, heightCm: 24 },
    reservoirMl: 600,
    screenInch: 1.8,
    prices: { cny: 69900, usd: 9900, jpy: 15800, eur: 10900, gbp: 8900, krw: 149000, sgd: 14900, aud: 16900, cad: 13900 },
  },
  {
    size: "M",
    sku: "POT-M",
    name: { en: "oeeoee", zh: "oeeoee 标准款", ja: "oeeoee" },
    tagline: {
      en: "The classic: room for most foliage plants and herbs.",
      zh: "经典款：适合大多数观叶植物和香草。",
      ja: "定番モデル：多くの観葉植物やハーブに。",
    },
    dims: { diameterCm: 16, heightCm: 30 },
    reservoirMl: 1200,
    screenInch: 2.4,
    prices: { cny: 99900, usd: 14900, jpy: 23800, eur: 15900, gbp: 13900, krw: 219000, sgd: 21900, aud: 24900, cad: 19900 },
  },
  {
    size: "L",
    sku: "POT-L",
    name: { en: "oeeoee Grand", zh: "oeeoee Grand", ja: "oeeoee Grand" },
    tagline: {
      en: "Floor-and-console size for statement plants in the living room.",
      zh: "客厅尺寸，适合有存在感的大型植物。",
      ja: "リビング向け、存在感のある大型植物に。",
    },
    dims: { diameterCm: 24, heightCm: 42 },
    reservoirMl: 2500,
    screenInch: 3.5,
    prices: { cny: 149900, usd: 21900, jpy: 34800, eur: 23900, gbp: 19900, krw: 329000, sgd: 31900, aud: 36900, cad: 29900 },
  },
];

export const POT_FINISHES: PotFinish[] = [
  { id: "porcelain", name: { en: "Porcelain", zh: "瓷白", ja: "ポーセリン" }, color: "#ECE7DF", shade: "#C9C1B4" },
  { id: "sage", name: { en: "Sage", zh: "鼠尾草绿", ja: "セージ" }, color: "#A9BFA2", shade: "#7F9878" },
  { id: "graphite", name: { en: "Graphite", zh: "石墨灰", ja: "グラファイト" }, color: "#3A3F3C", shade: "#262A28" },
];
