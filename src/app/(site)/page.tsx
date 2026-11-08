import { getT } from "@/i18n/server";

/** Landing page. PLACEHOLDER — implemented by the map agent. */
export default async function HomePage() {
  const t = await getT("common");
  return (
    <section className="flex min-h-[70vh] items-center justify-center">
      <h1 className="text-gradient text-4xl font-semibold">{t("brand.tagline")}</h1>
    </section>
  );
}
