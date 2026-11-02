"use client";

import { CheckCircle2, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const COPY_LABELS = { idle: "Copy JSON", copied: "Copied", failed: "Couldn't copy. Please select the text." };

type Props = { request: Record<string, unknown>; carrierName: string; onBack: () => void };

export function SuccessScreen({ request, carrierName, onBack }: Props) {
  const json = JSON.stringify(request, null, 2);
  const [copyState, setCopyState] = useState<keyof typeof COPY_LABELS>("idle");
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <section className="mx-auto max-w-2xl rounded-xl border bg-card p-6 shadow-sm">
      <CheckCircle2 aria-hidden className="size-8 text-primary" />
      <h1 ref={headingRef} tabIndex={-1} className="mt-3 text-2xl font-semibold tracking-tight outline-none">Your request is ready</h1>
      <p className="mt-1 text-muted-foreground">This demo doesn&apos;t call {carrierName}. This is the exact request it would send.</p>
      <pre tabIndex={0} data-testid="final-request" className="mt-4 overflow-auto rounded-lg bg-muted p-4 text-sm">{json}</pre>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" className="h-11" onClick={copy}>
          <Copy aria-hidden /> <span aria-live="polite">{COPY_LABELS[copyState]}</span>
        </Button>
        <Button variant="ghost" className="h-11" onClick={onBack}>Change my answers</Button>
      </div>
    </section>
  );
}
