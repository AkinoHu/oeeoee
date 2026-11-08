import Link from "next/link";
import { getT } from "@/i18n/server";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { Logo } from "./Logo";

export async function SiteFooter() {
  const t = await getT("common");
  return (
    <footer className="border-t border-line bg-surface/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between lg:px-8">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted">{t("brand.tagline")}</p>
          <p className="text-xs text-faint">{t("footer.madeWith")}</p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted">
          <Link href="/#explore" className="hover:text-fg">{t("nav.explore")}</Link>
          <Link href="/#product" className="hover:text-fg">{t("nav.product")}</Link>
          <Link href="/partners" className="hover:text-fg">{t("nav.partners")}</Link>
          <Link href="/console" className="hover:text-fg">{t("nav.console")}</Link>
          <a href="mailto:hello@oeeoee.com" className="hover:text-fg">{t("footer.contact")}</a>
        </div>
        <LocaleSwitcher />
      </div>
      <div className="border-t border-line/60 py-5 text-center text-xs text-faint">
        {t("footer.rights", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
