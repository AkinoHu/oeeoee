import Link from "next/link";
import { CartButton } from "@/components/cart/CartButton";
import { getT } from "@/i18n/server";
import { getUser, isAdminEmail } from "@/lib/session";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { UserMenu } from "./UserMenu";

/** Sticky, translucent header shared by all public pages. */
export async function SiteHeader() {
  const [t, user] = await Promise.all([getT("common"), getUser()]);
  const menuUser = user
    ? { name: user.name, email: user.email, image: user.image, isAdmin: isAdminEmail(user.email) }
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 text-sm text-muted md:flex">
          <Link href="/#explore" className="rounded-lg px-3 py-2 hover:text-fg">
            {t("nav.explore")}
          </Link>
          <Link href="/#product" className="rounded-lg px-3 py-2 hover:text-fg">
            {t("nav.product")}
          </Link>
          <Link href="/partners" className="rounded-lg px-3 py-2 hover:text-fg">
            {t("nav.partners")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher className="hidden sm:inline-flex" />
          <CartButton />
          <UserMenu user={menuUser} />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
