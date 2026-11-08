"use client";

import type { ComponentProps } from "react";
import { Select } from "@/components/ui/primitives";

/** A <select> that submits its (GET) form as soon as the value changes. */
export function AutoSubmitSelect(props: ComponentProps<"select">) {
  return <Select {...props} onChange={(event) => event.currentTarget.form?.requestSubmit()} />;
}
