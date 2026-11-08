"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { useT } from "@/i18n/client";
import { signIn, signUp } from "@/lib/auth-client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12Z" />
    </svg>
  );
}

export function LoginForm({ next, google, devLogin }: { next: string; google: boolean; devLogin: boolean }) {
  const t = useT("auth");
  const tc = useT("common");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGoogle() {
    setBusy(true);
    setError(null);
    const res = await signIn.social({ provider: "google", callbackURL: next });
    if (res?.error) {
      setError(res.error.message ?? tc("state.error"));
      setBusy(false);
    }
  }

  async function onDevSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setBusy(true);
    setError(null);
    const signedIn = await signIn.email({ email, password });
    // First time: create the account.
    const error = signedIn.error
      ? (await signUp.email({ email, password, name: email.split("@")[0] })).error
      : null;
    if (error) {
      setError(error.message ?? tc("state.error"));
      setBusy(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mt-8 space-y-6">
      {google ? (
        <Button size="lg" className="w-full bg-fg text-bg hover:bg-white" onClick={onGoogle} disabled={busy}>
          <GoogleIcon /> {t("google")}
        </Button>
      ) : (
        <p className="rounded-xl border border-sun/30 bg-sun/10 px-4 py-3 text-sm text-sun">{t("googleMissing")}</p>
      )}

      {devLogin && (
        // method="post": a submit before hydration must not put the password in the URL.
        <form onSubmit={onDevSubmit} method="post" className="space-y-3 rounded-2xl border border-dashed border-line-strong p-4">
          <p className="text-sm font-medium">{t("dev.title")}</p>
          <div>
            <Label htmlFor="email">{t("dev.email")}</Label>
            <Input id="email" name="email" type="email" required defaultValue="dev@example.com" autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">{t("dev.password")}</Label>
            <Input id="password" name="password" type="password" required minLength={8} defaultValue="devpassword" autoComplete="current-password" />
          </div>
          <Button type="submit" variant="secondary" className="w-full" disabled={busy}>
            {t("dev.submit")}
          </Button>
          <p className="text-xs text-faint">{t("dev.hint")}</p>
        </form>
      )}

      {error && <p className="text-sm text-rose">{error}</p>}
    </div>
  );
}
