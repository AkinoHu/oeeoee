"use client";

import { LayoutDashboard, LogOut, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import { useT } from "@/i18n/client";

export interface MenuUser {
  name: string;
  email: string;
  image?: string | null;
  isAdmin: boolean;
}

export function UserMenu({ user }: { user: MenuUser | null }) {
  const t = useT("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!user) {
    return (
      <Link href="/login" className={buttonVariants({ variant: "secondary", size: "sm" })}>
        {t("nav.signIn")}
      </Link>
    );
  }

  const initial = (user.name || user.email).slice(0, 1).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-line-strong bg-surface-2 text-sm font-semibold"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initial
        )}
      </button>
      {open && (
        <div role="menu" className="glass absolute right-0 mt-2 w-60 rounded-2xl p-2 shadow-2xl">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link role="menuitem" href="/console" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2">
            <LayoutDashboard className="h-4 w-4 text-muted" /> {t("nav.console")}
          </Link>
          {user.isAdmin && (
            <Link role="menuitem" href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2">
              <Shield className="h-4 w-4 text-muted" /> {t("nav.admin")}
            </Link>
          )}
          <button
            role="menuitem"
            type="button"
            onClick={async () => {
              await signOut();
              setOpen(false);
              router.push("/");
              router.refresh();
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2"
          >
            <LogOut className="h-4 w-4 text-muted" /> {t("nav.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
