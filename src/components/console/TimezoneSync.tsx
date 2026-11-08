"use client";

import { useEffect } from "react";
import { saveDetectedTimezone } from "@/app/console/actions";

/** Saves the browser's time zone to the companion once, if none is set yet. */
export function TimezoneSync({ needed }: { needed: boolean }) {
  useEffect(() => {
    if (!needed) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) void saveDetectedTimezone(tz);
  }, [needed]);
  return null;
}
