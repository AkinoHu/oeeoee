import type { ReactNode } from "react";
import { LogoMark } from "@/components/site/Logo";

/**
 * Full-page branded screen for 404 / error states (app/not-found, app/error,
 * app/global-error). Purely presentational so it works in server and client
 * components; the home link is a plain <a> so it always loads a fresh page,
 * even when the error came from the app shell itself.
 */
export function StatusScreen({
  art,
  eyebrow,
  title,
  body,
  actions,
  footnote,
}: {
  art?: ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  actions: ReactNode;
  footnote?: ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-svh flex-1 flex-col overflow-hidden bg-bg text-fg">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_42%,#0d1a14_0%,#08100c_50%,#060a08_85%)]" />
        <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_45%,black,transparent)]" />
      </div>
      <header className="mx-auto flex h-16 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full load, see above */}
        <a href="/" className="inline-flex items-center gap-2 rounded-lg">
          <LogoMark />
          <span className="font-mono text-lg font-semibold tracking-tight">oeeoee</span>
        </a>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pt-6 pb-20 sm:px-6">
        <div className="w-full max-w-lg text-center">
          {art && <div className="mx-auto mb-8 w-fit">{art}</div>}
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-md text-muted text-pretty">{body}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{actions}</div>
          {footnote && <p className="mt-8 font-mono text-xs break-all text-muted">{footnote}</p>}
        </div>
      </main>
    </div>
  );
}

/** The digest Next attaches to server errors (matches the server log entry), if any. */
export function errorDigest(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("digest" in error)) return null;
  const { digest } = error as { digest?: unknown };
  return typeof digest === "string" && digest ? digest : null;
}

/** The companion's screen frame used as the art on status screens. */
export function StatusArt({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-10 rounded-full bg-leaf-300/10 blur-3xl" />
      <div className="relative rounded-[1.75rem] border border-fg/10 bg-[#0a110e] p-2.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_30px_60px_-20px_rgb(0_0_0/0.9)]">
        {children}
      </div>
    </div>
  );
}
