import type { Region } from "./types";

export const REGIONS: Region[] = [
  { id: "east-asia", name: { en: "East Asia", zh: "东亚", ja: "東アジア" }, center: [118, 35], zoom: 3.2 },
  { id: "southeast-asia", name: { en: "Southeast Asia", zh: "东南亚", ja: "東南アジア" }, center: [112, 5], zoom: 3.4 },
  { id: "south-asia", name: { en: "South Asia", zh: "南亚", ja: "南アジア" }, center: [80, 22], zoom: 3.4 },
  { id: "oceania", name: { en: "Oceania", zh: "大洋洲", ja: "オセアニア" }, center: [145, -28], zoom: 3 },
  { id: "north-america", name: { en: "North America", zh: "北美", ja: "北米" }, center: [-100, 45], zoom: 2.4 },
  { id: "latin-america", name: { en: "Latin America", zh: "拉丁美洲", ja: "中南米" }, center: [-65, -12], zoom: 2.2 },
  { id: "europe", name: { en: "Europe", zh: "欧洲", ja: "ヨーロッパ" }, center: [12, 52], zoom: 3.6 },
  { id: "middle-east", name: { en: "Middle East", zh: "中东", ja: "中東" }, center: [45, 27], zoom: 3.4 },
  { id: "africa", name: { en: "Africa", zh: "非洲", ja: "アフリカ" }, center: [20, 3], zoom: 2.3 },
];
