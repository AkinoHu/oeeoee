import type { PotFinish, PotModel } from "./types";

/**
 * The smart pot line-up. Prices are placeholders in minor units
 * (CNY/USD/EUR/... cents; JPY/KRW whole units). Owner: catalog agent.
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
    prices: { cny: 69900, usd: 9900, jpy: 14800, eur: 9900, gbp: 8900, krw: 139000, sgd: 13900, aud: 15900, cad: 13900 },
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
    prices: { cny: 99900, usd: 14900, jpy: 21800, eur: 14900, gbp: 12900, krw: 199000, sgd: 19900, aud: 22900, cad: 19900 },
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
    prices: { cny: 149900, usd: 21900, jpy: 32800, eur: 21900, gbp: 18900, krw: 299000, sgd: 29900, aud: 33900, cad: 29900 },
  },
];

export const POT_FINISHES: PotFinish[] = [
  { id: "porcelain", name: { en: "Porcelain", zh: "瓷白", ja: "ポーセリン" }, color: "#ECE7DF", shade: "#C9C1B4" },
  { id: "sage", name: { en: "Sage", zh: "鼠尾草绿", ja: "セージ" }, color: "#A9BFA2", shade: "#7F9878" },
  { id: "graphite", name: { en: "Graphite", zh: "石墨灰", ja: "グラファイト" }, color: "#3A3F3C", shade: "#262A28" },
];
