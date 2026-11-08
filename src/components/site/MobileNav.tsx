"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { LocaleSwitcher } from "./LocaleSwitcher";

/** Header navigation below the `md` breakpoint, where the inline nav is hidden. */
export function MobileNav() {
  const t = useT("common");
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const links = [
    { href: "/#explore", label: t("nav.explore") },
    { href: "/#product", label: t("nav.product") },
    { href: "/partners", label: t("nav.partners") },
  ];

  return (
    <div
      ref={ref}
      className="relative md:hidden"
      onBlur={(e) => {
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
      >
        {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        <span className="sr-only">{t("nav.menu")}</span>
      </button>
      {open && (
        <nav id={panelId} aria-label={t("nav.menu")} className="glass absolute right-0 mt-2 w-56 rounded-2xl p-2 shadow-2xl">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm hover:bg-surface-2"
            >
              {l.label}
            </Link>
          ))}
          <div className="my-1 h-px bg-line" />
          <LocaleSwitcher className="w-full px-1 py-1" />
        </nav>
      )}
    </div>
  );
}
