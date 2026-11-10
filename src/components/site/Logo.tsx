import Link from "next/link";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";
import { LogoMark } from "./LogoMark";

// LogoMark lives in its own module with no server imports, so client
// components (e.g. the error pages) can use it without pulling in getT().
export { LogoMark };

export async function Logo({ className }: { className?: string }) {
  const t = await getT("common");
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2", className)} aria-label={t("nav.home")}>
      <LogoMark className="transition-transform group-hover:-rotate-6" />
      <span className="text-xl font-extrabold tracking-tight">oeeoee</span>
    </Link>
  );
}
