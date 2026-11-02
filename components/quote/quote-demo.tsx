"use client";

import { useState, useSyncExternalStore } from "react";
import { harbor } from "@/lib/carriers";
import { profileA, profileB } from "@/lib/profiles";
import { cn } from "@/lib/utils";
import { QuoteFlow } from "./quote-flow";

const PROFILES = [
  { id: "a", label: "Profile A", profile: profileA },
  { id: "b", label: "Profile B", profile: profileB },
];

const subscribeNever = () => () => {};

// The static HTML is built without knowing the visitor's date. It only renders the default profile, whose result doesn't depend on the exact day, and React switches to the real date right after hydration.
const PRERENDER_DATE = "2026-11-05";

function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function QuoteDemo() {
  const [selected, setSelected] = useState(PROFILES[0]);
  // The customer's own date is only known in the browser. The engine receives it as a parameter.
  const today = useSyncExternalStore(subscribeNever, localToday, () => PRERENDER_DATE);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
      <fieldset className="mb-8 grid grid-cols-2 items-center gap-2 rounded-xl border border-dashed bg-card/60 p-3 sm:flex sm:gap-3 sm:px-4">
        <legend className="sr-only">Choose a sample customer</legend>
        <span aria-hidden className="col-span-2 text-sm text-muted-foreground">Demo data:</span>
        {PROFILES.map((item) => (
          <label key={item.id} className={cn("flex min-h-11 cursor-pointer items-center rounded-lg border px-3 py-1.5 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50", selected.id === item.id ? "border-primary bg-primary/5 font-semibold" : "border-input bg-card")}>
            <input type="radio" name="sample-profile" className="sr-only" checked={selected.id === item.id} onChange={() => setSelected(item)} />
            {item.label}: {item.profile.first_name} {item.profile.last_name}
          </label>
        ))}
      </fieldset>
      <QuoteFlow key={selected.id} form={harbor.form} mapping={harbor.mapping} profile={selected.profile} today={today} />
    </main>
  );
}
