import type { Metadata } from "next";
import Link from "next/link";
import { ConsoleSidebar, ConsoleTabs } from "@/components/console/ConsoleNav";
import { TimezoneSync } from "@/components/console/TimezoneSync";
import { LocaleSwitcher } from "@/components/site/LocaleSwitcher";
import { Logo } from "@/components/site/Logo";
import { UserMenu } from "@/components/site/UserMenu";
import { getT } from "@/i18n/server";
import { getOrCreateCompanion } from "@/lib/companion/queries";
import { timezoneWasSet } from "@/lib/companion/settings";
import { isAdminEmail, requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("console");
  return { title: { default: t("meta.title"), template: `%s · ${t("meta.title")} · oeeoee` }, robots: { index: false } };
}

/** Console (中台) chrome: own header, sidebar on desktop, tab bar on mobile. */
export default async function ConsoleLayout({ children }: LayoutProps<"/console">) {
  const user = await requireUser("/console");
  const [t, companion] = await Promise.all([getT("console"), getOrCreateCompanion(user.id)]);
  const menuUser = { name: user.name, email: user.email, image: user.image, isAdmin: isAdminEmail(user.email) };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Logo />
          <span className="hidden rounded-md border border-line px-1.5 py-0.5 font-bold tabular-nums text-[11px] tracking-wider text-leaf-300 uppercase sm:inline">
            {t("shell.badge")}
          </span>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link href="/" className="hidden rounded-lg px-3 py-2 text-sm text-muted hover:text-fg md:inline">
              {t("shell.backToSite")}
            </Link>
            <LocaleSwitcher />
            <UserMenu user={menuUser} />
          </div>
        </div>
        <div className="lg:hidden">
          <ConsoleTabs />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 sm:px-6 lg:px-8">
        <aside className="hidden w-52 shrink-0 py-8 lg:block">
          <ConsoleSidebar />
          <p className="mt-8 px-3 text-xs leading-relaxed text-faint">{t("shell.help")}</p>
        </aside>
        <main id="main" className="min-w-0 flex-1 py-6 sm:py-8">
          {children}
        </main>
      </div>
      <TimezoneSync needed={!timezoneWasSet(companion.reminders)} />
    </div>
  );
}
