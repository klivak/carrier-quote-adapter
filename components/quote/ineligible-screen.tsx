import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IneligibilityReason } from "@/lib/types";

type Props = { reasons: IneligibilityReason[]; carrierName: string; product: string; onFix: () => void };

export function IneligibleScreen({ reasons, carrierName, product, onFix }: Props) {
  return (
    <section role="alert" className="mx-auto max-w-2xl rounded-xl border bg-card p-6 shadow-sm">
      <Ban aria-hidden className="size-8 text-destructive" />
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{carrierName} can&apos;t give you a {product} quote</h1>
      <p className="mt-1 text-muted-foreground">{reasons.length === 1 ? "There is one reason:" : `There are ${reasons.length} reasons:`}</p>
      <ul className="mt-4 space-y-3">
        {reasons.map((reason) => (
          <li key={reason.code} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">{reason.message}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">Nothing was sent to {carrierName}. If your profile is out of date, you can correct it.</p>
      <Button variant="outline" className="mt-3 h-11" onClick={onFix}>Fix my details</Button>
    </section>
  );
}
