"use client";

import type { CarrierForm, CarrierMapping, Profile } from "@/lib/types";
import { IneligibleScreen } from "./ineligible-screen";
import { QuoteForm } from "./quote-form";
import { SuccessScreen } from "./success-screen";
import { useQuoteForm } from "./use-quote-form";

type Props = { form: CarrierForm; mapping: CarrierMapping; profile: Profile; today: string };

export function QuoteFlow({ form, mapping, profile, today }: Props) {
  const quote = useQuoteForm({ form, mapping, profile, today });

  if (quote.request) return <SuccessScreen request={quote.request} carrierName={mapping.carrierName} onBack={quote.backToForm} />;
  if (quote.refused) return <IneligibleScreen reasons={quote.state.reasons} carrierName={mapping.carrierName} product={form.product} onFix={quote.startFixing} />;
  return <QuoteForm form={form} mapping={mapping} quote={quote} />;
}
