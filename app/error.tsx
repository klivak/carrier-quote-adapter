"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main role="alert" className="mx-auto max-w-xl flex-1 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">Nothing was sent to the carrier. Please try again.</p>
      <Button className="mt-4 h-11" onClick={reset}>Try again</Button>
    </main>
  );
}
