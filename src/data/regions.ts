import type { Region } from "./types";

/**
 * `center` / `zoom` frame each region on the landing map (Miller projection;
 * zoom 1 = the whole world fitted to the map area). A test checks that every
 * market of a region lands inside the frame on desktop and phone layouts.
 */

export const REGIONS: Region[] = [
  { id: "east-asia", name: { en: "East Asia", zh: "东亚", ja: "東アジア" }, center: [116, 36], zoom: 3.4 },
  { id: "southeast-asia", name: { en: "Southeast Asia", zh: "东南亚", ja: "東南アジア" }, center: [113, 7], zoom: 4 },
  { id: "south-asia", name: { en: "South Asia", zh: "南亚", ja: "南アジア" }, center: [80, 20], zoom: 3.9 },
  { id: "oceania", name: { en: "Oceania", zh: "大洋洲", ja: "オセアニア" }, center: [151, -31], zoom: 3 },
  { id: "north-america", name: { en: "North America", zh: "北美", ja: "北米" }, center: [-98, 50], zoom: 2.3 },
  { id: "latin-america", name: { en: "Latin America", zh: "拉丁美洲", ja: "中南米" }, center: [-76, -8], zoom: 1.85 },
  { id: "europe", name: { en: "Europe", zh: "欧洲", ja: "ヨーロッパ" }, center: [9, 53], zoom: 3.6 },
  { id: "middle-east", name: { en: "Middle East", zh: "中东", ja: "中東" }, center: [45, 30], zoom: 4 },
  { id: "africa", name: { en: "Africa", zh: "非洲", ja: "アフリカ" }, center: [17, 2], zoom: 1.9 },
];
