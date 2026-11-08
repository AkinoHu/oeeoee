/**
 * Visitor location guessing — no network calls, no IP database.
 *
 *  server: CDN / edge geo headers  →  Accept-Language region subtag
 *  client: IANA time zone (Intl)   →  navigator.geolocation (on click only)
 *
 * Shared by server and client code, so keep it free of server-only imports.
 * Everything returns ISO 3166-1 alpha-2 codes in upper case ("JP").
 */

export type GeoSource = "ip" | "language" | "timezone" | "device";

export interface GeoGuess {
  country: string;
  source: GeoSource;
}

/** Anything header-like: a Web `Headers`, Next's `ReadonlyHeaders`, or a plain record. */
export type HeaderBag =
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>;

/** Headers set by CDNs / platforms with the visitor's country, most specific first. */
export const COUNTRY_HEADERS = [
  "cf-ipcountry", // Cloudflare
  "x-vercel-ip-country", // Vercel
  "x-country-code", // generic reverse proxies (nginx GeoIP module, custom edges)
  "cloudfront-viewer-country", // AWS CloudFront
  "x-appengine-country", // Google App Engine
  "x-geo-country",
  "x-country",
] as const;

/** Fly.io edge regions → country. The edge nearest the visitor is a decent proxy. */
export const FLY_REGION_COUNTRY: Readonly<Record<string, string>> = {
  ams: "NL", arn: "SE", atl: "US", bog: "CO", bom: "IN", bos: "US", cdg: "FR", den: "US",
  dfw: "US", ewr: "US", eze: "AR", fra: "DE", gdl: "MX", gig: "BR", gru: "BR", hkg: "HK",
  iad: "US", jnb: "ZA", lax: "US", lhr: "GB", mad: "ES", mia: "US", nrt: "JP", ord: "US",
  otp: "RO", phx: "US", qro: "MX", scl: "CL", sea: "US", sin: "SG", sjc: "US", syd: "AU",
  waw: "PL", yul: "CA", yyz: "CA",
};

/** Placeholder / pseudo codes some CDNs emit (unknown, Tor, anonymous proxy, satellite…). */
const PSEUDO_CODES = new Set(["XX", "ZZ", "T1", "A1", "A2", "O1", "AP", "EU"]);
const ALIASES: Readonly<Record<string, string>> = { UK: "GB" };

/** Upper-cases and validates a 2-letter country code; null for junk or pseudo codes. */
export function normalizeCountryCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || PSEUDO_CODES.has(code)) return null;
  return ALIASES[code] ?? code;
}

function readHeader(headers: HeaderBag, name: string): string | null {
  if (typeof (headers as { get?: unknown }).get === "function") {
    return (headers as { get(name: string): string | null }).get(name);
  }
  const record = headers as Record<string, string | string[] | undefined>;
  const key = Object.keys(record).find((k) => k.toLowerCase() === name);
  const value = key ? record[key] : undefined;
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export interface LanguageTag {
  tag: string;
  q: number;
}

/** Parses an Accept-Language header into tags sorted by quality (stable, q=0 dropped). */
export function parseAcceptLanguage(header: string | null | undefined): LanguageTag[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part, index) => {
      const [rawTag, ...params] = part.trim().split(";");
      const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const q = qParam ? Number(qParam.slice(2)) : 1;
      return { tag: rawTag.trim(), q: Number.isFinite(q) ? q : 0, index };
    })
    .filter((t) => t.tag && t.tag !== "*" && t.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map(({ tag, q }) => ({ tag, q }));
}

/**
 * The region subtag of the most preferred language that has one:
 * "ja-JP,ja;q=0.9" → "JP", "zh-Hans-CN" → "CN", "en,de-AT;q=0.5" → "AT".
 * UN M.49 numeric regions ("es-419") are ignored.
 */
export function regionFromAcceptLanguage(header: string | null | undefined): string | null {
  for (const { tag } of parseAcceptLanguage(header)) {
    const subtags = tag.split(/[-_]/).slice(1);
    for (const sub of subtags) {
      if (sub.length === 2 && /^[a-z]{2}$/i.test(sub)) {
        const code = normalizeCountryCode(sub);
        if (code) return code;
      }
      if (sub.length === 1) break; // extension / private-use subtags follow
    }
  }
  return null;
}

/**
 * Server-side guess from request headers. IP-derived headers win over
 * Accept-Language (which only says what language the browser speaks).
 */
export function guessCountryFromHeaders(headers: HeaderBag): GeoGuess | null {
  for (const name of COUNTRY_HEADERS) {
    const code = normalizeCountryCode(readHeader(headers, name));
    if (code) return { country: code, source: "ip" };
  }
  const fly = readHeader(headers, "fly-region")?.trim().toLowerCase();
  if (fly && FLY_REGION_COUNTRY[fly]) return { country: FLY_REGION_COUNTRY[fly], source: "ip" };

  const fromLanguage = regionFromAcceptLanguage(readHeader(headers, "accept-language"));
  if (fromLanguage) return { country: fromLanguage, source: "language" };
  return null;
}

// ── Time zones ───────────────────────────────────────────────────────────
/**
 * Compact IANA time zone → country table: "CC:Zone Zone …;". Covers every
 * country's main zones plus the legacy names browsers still report
 * (Asia/Calcutta, Asia/Saigon, Europe/Kiev, …).
 */
const TZ_TABLE =
  // East Asia
  "CN:Asia/Shanghai Asia/Urumqi Asia/Chongqing Asia/Chungking Asia/Harbin Asia/Kashgar PRC;" +
  "HK:Asia/Hong_Kong Hongkong;MO:Asia/Macau Asia/Macao;JP:Asia/Tokyo Japan;" +
  "KR:Asia/Seoul ROK;KP:Asia/Pyongyang;MN:Asia/Ulaanbaatar Asia/Ulan_Bator Asia/Hovd Asia/Choibalsan;" +
  // Southeast Asia
  "SG:Asia/Singapore Singapore;MY:Asia/Kuala_Lumpur Asia/Kuching;TH:Asia/Bangkok;" +
  "VN:Asia/Ho_Chi_Minh Asia/Saigon;PH:Asia/Manila;KH:Asia/Phnom_Penh;LA:Asia/Vientiane;" +
  "MM:Asia/Yangon Asia/Rangoon;BN:Asia/Brunei;TL:Asia/Dili;" +
  "ID:Asia/Jakarta Asia/Pontianak Asia/Makassar Asia/Ujung_Pandang Asia/Jayapura;" +
  // South & Central Asia
  "IN:Asia/Kolkata Asia/Calcutta;PK:Asia/Karachi;BD:Asia/Dhaka Asia/Dacca;LK:Asia/Colombo;" +
  "NP:Asia/Kathmandu Asia/Katmandu;BT:Asia/Thimphu Asia/Thimbu;MV:Indian/Maldives;AF:Asia/Kabul;" +
  "KZ:Asia/Almaty Asia/Qostanay Asia/Qyzylorda Asia/Aqtobe Asia/Aqtau Asia/Atyrau Asia/Oral;" +
  "UZ:Asia/Tashkent Asia/Samarkand;KG:Asia/Bishkek;TJ:Asia/Dushanbe;TM:Asia/Ashgabat Asia/Ashkhabad;" +
  // Oceania
  "AU:Australia/Sydney Australia/Melbourne Australia/Brisbane Australia/Perth Australia/Adelaide " +
  "Australia/Hobart Australia/Darwin Australia/Canberra Australia/ACT Australia/NSW Australia/Lord_Howe " +
  "Australia/Broken_Hill Australia/Lindeman Australia/Eucla Australia/Queensland Australia/Victoria " +
  "Australia/West Australia/South Australia/North Australia/Tasmania Antarctica/Macquarie;" +
  "NZ:Pacific/Auckland Pacific/Chatham NZ;FJ:Pacific/Fiji;PG:Pacific/Port_Moresby Pacific/Bougainville;" +
  "NC:Pacific/Noumea;PF:Pacific/Tahiti;WS:Pacific/Apia;TO:Pacific/Tongatapu;VU:Pacific/Efate;" +
  "SB:Pacific/Guadalcanal;GU:Pacific/Guam;" +
  // North America
  "US:America/New_York America/Chicago America/Denver America/Los_Angeles America/Phoenix " +
  "America/Anchorage America/Juneau America/Sitka America/Nome America/Adak America/Boise " +
  "America/Detroit America/Indiana/Indianapolis America/Indianapolis America/Kentucky/Louisville " +
  "America/Louisville America/Menominee America/North_Dakota/Center Pacific/Honolulu " +
  "US/Eastern US/Central US/Mountain US/Pacific US/Arizona US/Alaska US/Hawaii;" +
  "CA:America/Toronto America/Vancouver America/Edmonton America/Winnipeg America/Halifax " +
  "America/St_Johns America/Regina America/Montreal America/Moncton America/Whitehorse " +
  "America/Yellowknife America/Iqaluit America/Dawson_Creek Canada/Eastern Canada/Pacific;" +
  "GL:America/Nuuk America/Godthab;BM:Atlantic/Bermuda;" +
  // Latin America & Caribbean
  "MX:America/Mexico_City America/Cancun America/Monterrey America/Tijuana America/Merida " +
  "America/Chihuahua America/Hermosillo America/Mazatlan America/Matamoros;" +
  "BR:America/Sao_Paulo America/Manaus America/Fortaleza America/Recife America/Bahia " +
  "America/Belem America/Cuiaba America/Porto_Velho America/Rio_Branco America/Noronha;" +
  "AR:America/Argentina/Buenos_Aires America/Buenos_Aires America/Argentina/Cordoba America/Cordoba " +
  "America/Argentina/Mendoza America/Mendoza;" +
  "CL:America/Santiago Pacific/Easter;CO:America/Bogota;PE:America/Lima;VE:America/Caracas;" +
  "EC:America/Guayaquil Pacific/Galapagos;BO:America/La_Paz;PY:America/Asuncion;" +
  "UY:America/Montevideo;GY:America/Guyana;SR:America/Paramaribo;CR:America/Costa_Rica;" +
  "PA:America/Panama;GT:America/Guatemala;HN:America/Tegucigalpa;SV:America/El_Salvador;" +
  "NI:America/Managua;BZ:America/Belize;CU:America/Havana;DO:America/Santo_Domingo;" +
  "PR:America/Puerto_Rico;JM:America/Jamaica;HT:America/Port-au-Prince;BS:America/Nassau;" +
  "TT:America/Port_of_Spain;BB:America/Barbados;" +
  // Europe
  "GB:Europe/London GB;IE:Europe/Dublin;FR:Europe/Paris;DE:Europe/Berlin Europe/Busingen;" +
  "NL:Europe/Amsterdam;BE:Europe/Brussels;LU:Europe/Luxembourg;CH:Europe/Zurich;AT:Europe/Vienna;" +
  "IT:Europe/Rome;ES:Europe/Madrid Atlantic/Canary Africa/Ceuta;PT:Europe/Lisbon Atlantic/Madeira Atlantic/Azores;" +
  "DK:Europe/Copenhagen;SE:Europe/Stockholm;NO:Europe/Oslo;FI:Europe/Helsinki;IS:Atlantic/Reykjavik;" +
  "PL:Europe/Warsaw;CZ:Europe/Prague;SK:Europe/Bratislava;HU:Europe/Budapest;RO:Europe/Bucharest;" +
  "BG:Europe/Sofia;GR:Europe/Athens;HR:Europe/Zagreb;SI:Europe/Ljubljana;RS:Europe/Belgrade;" +
  "BA:Europe/Sarajevo;ME:Europe/Podgorica;MK:Europe/Skopje;AL:Europe/Tirane;" +
  "EE:Europe/Tallinn;LV:Europe/Riga;LT:Europe/Vilnius;UA:Europe/Kyiv Europe/Kiev;BY:Europe/Minsk;" +
  "MD:Europe/Chisinau;MT:Europe/Malta;CY:Asia/Nicosia Europe/Nicosia;MC:Europe/Monaco;" +
  "AD:Europe/Andorra;LI:Europe/Vaduz;SM:Europe/San_Marino;VA:Europe/Vatican;" +
  "RU:Europe/Moscow Europe/Kaliningrad Europe/Samara Europe/Volgograd Asia/Yekaterinburg Asia/Omsk " +
  "Asia/Novosibirsk Asia/Krasnoyarsk Asia/Irkutsk Asia/Yakutsk Asia/Vladivostok Asia/Magadan Asia/Kamchatka;" +
  "GE:Asia/Tbilisi;AM:Asia/Yerevan;AZ:Asia/Baku;" +
  // Middle East
  "TR:Europe/Istanbul Asia/Istanbul Turkey;AE:Asia/Dubai;SA:Asia/Riyadh;QA:Asia/Qatar;KW:Asia/Kuwait;" +
  "BH:Asia/Bahrain;OM:Asia/Muscat;IL:Asia/Jerusalem Asia/Tel_Aviv Israel;JO:Asia/Amman;LB:Asia/Beirut;" +
  "IQ:Asia/Baghdad;IR:Asia/Tehran Iran;SY:Asia/Damascus;YE:Asia/Aden;PS:Asia/Gaza Asia/Hebron;" +
  // Africa
  "EG:Africa/Cairo Egypt;MA:Africa/Casablanca;DZ:Africa/Algiers;TN:Africa/Tunis;LY:Africa/Tripoli;" +
  "NG:Africa/Lagos;GH:Africa/Accra;KE:Africa/Nairobi;ET:Africa/Addis_Ababa;TZ:Africa/Dar_es_Salaam;" +
  "UG:Africa/Kampala;RW:Africa/Kigali;ZA:Africa/Johannesburg;NA:Africa/Windhoek;BW:Africa/Gaborone;" +
  "ZW:Africa/Harare;ZM:Africa/Lusaka;MZ:Africa/Maputo;AO:Africa/Luanda;CD:Africa/Kinshasa Africa/Lubumbashi;" +
  "CM:Africa/Douala;CI:Africa/Abidjan;SN:Africa/Dakar;SD:Africa/Khartoum;MG:Indian/Antananarivo;" +
  "MU:Indian/Mauritius;SC:Indian/Mahe";

export const TIMEZONE_COUNTRY: Readonly<Record<string, string>> = (() => {
  const map: Record<string, string> = {};
  for (const group of TZ_TABLE.split(";")) {
    const [code, zones] = group.split(":");
    for (const zone of zones.trim().split(/\s+/)) map[zone] = code;
  }
  return map;
})();

/** Country for an IANA time zone, e.g. "Asia/Tokyo" → "JP". Null for UTC/Etc or unknown zones. */
export function countryFromTimeZone(timeZone: string | null | undefined): string | null {
  if (!timeZone) return null;
  return TIMEZONE_COUNTRY[timeZone.trim()] ?? null;
}

/**
 * Client refinement: an IP-based server guess is kept; otherwise the browser's
 * time zone (a strong signal) beats the Accept-Language region (a weak one).
 */
export function refineGuess(server: GeoGuess | null, timeZone: string | null | undefined): GeoGuess | null {
  if (server?.source === "ip" || server?.source === "device") return server;
  const fromZone = countryFromTimeZone(timeZone);
  if (fromZone) return { country: fromZone, source: "timezone" };
  return server;
}
