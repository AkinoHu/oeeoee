import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { LocaleSwitcher } from "@/components/site/LocaleSwitcher";
import { Logo } from "@/components/site/Logo";
import { UserMenu } from "@/components/site/UserMenu";
import { Badge, Container } from "@/components/ui/primitives";
import { getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("partners");
  return {
    title: { default: t("admin.badge"), template: `%s · ${t("admin.badge")} · oeeoee` },
    robots: { index: false, follow: false },
  };
}

/** Admin shell. Every page and server action below re-checks admin access too. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  const t = await getT("partners");

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Logo />
          <Badge tone="sun" className="font-mono tracking-wide uppercase">
            {t("admin.badge")}
          </Badge>
          <AdminNav className="ml-4 hidden md:block" />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className="hidden h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted hover:text-fg lg:inline-flex"
            >
              {t("admin.viewSite")}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <LocaleSwitcher className="hidden sm:inline-flex" />
            <UserMenu user={{ name: user.name, email: user.email, image: user.image, isAdmin: true }} />
          </div>
        </div>
        <AdminNav compact className="border-t border-line/60 px-2 py-1.5 md:hidden" />
      </header>
      <main className="flex-1 py-8 sm:py-10">
        <Container>{children}</Container>
      </main>
    </div>
  );
}
