"use client";

import { AlertTriangle, Check, Pencil, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatValue } from "@/lib/engine/display";
import type { QuoteGroupId } from "@/lib/engine/quote-state";
import type { CarrierForm, CarrierMapping, FieldDefinition } from "@/lib/types";
import { FieldControl } from "./field-control";
import type { QuoteFormController } from "./use-quote-form";

const GROUP_TITLES: Record<QuoteGroupId, string> = { ask: "A few questions for you", check: "Please check these", profile: "From your profile" };

type Props = { form: CarrierForm; mapping: CarrierMapping; quote: QuoteFormController };

export function QuoteForm({ form, mapping, quote }: Props) {
  const { state, invalidFields } = quote;
  const { carrierName } = mapping;

  const renderControl = (field: FieldDefinition, autoFocus = false) => (
    <FieldControl field={field} resolution={quote.resolutions[field.key]} value={quote.answers[field.key]} error={quote.shownError(field.key)} exclusive={mapping.exclusiveOptions?.[field.key]} autoFocus={autoFocus} onChange={(value) => quote.setAnswer(field.key, value)} onBlur={() => quote.markTouched(field.key)} />
  );

  const renderProfileField = (field: FieldDefinition) => {
    const { key } = field;
    const blocked = quote.isBlocked(key);
    if (!quote.isEditing(key) && !blocked && !quote.shownError(key)) {
      return (
        <div key={key} id={`field-${key}`} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <div className="text-sm text-muted-foreground">{field.label}</div>
            <div className="break-words font-medium">{formatValue(field, quote.answers[key])}</div>
          </div>
          <Button type="button" variant="ghost" className="min-h-11 shrink-0" aria-label={`Edit ${field.label}`} onClick={() => quote.setEditingField(key, true)}>
            <Pencil aria-hidden /> Edit
          </Button>
        </div>
      );
    }
    return (
      <div key={key} className="py-4">
        {renderControl(field, quote.isEditing(key) && !blocked)}
        {!blocked && !state.errors[key] && (
          <Button type="button" variant="ghost" className="mt-2 h-11" onClick={() => quote.setEditingField(key, false)}>Done</Button>
        )}
      </div>
    );
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <form onSubmit={quote.submit} noValidate className="space-y-6">
        <header>
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary"><ShieldCheck aria-hidden className="size-4" /> {mapping.carrierFullName ?? carrierName}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Your {carrierName} {form.product} quote</h1>
          <p aria-live="polite" className="mt-1 text-muted-foreground">
            {state.remaining === 0 ? "Everything is ready. Check it over and continue." : `${state.remaining} ${state.remaining === 1 ? "answer" : "answers"} left. We filled in the rest from your profile.`}
          </p>
          <div aria-hidden className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${state.progress}%` }} />
          </div>
        </header>

        {invalidFields.length > 0 && (
          <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="font-semibold">Please fix {invalidFields.length === 1 ? "this field" : `these ${invalidFields.length} fields`}</p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
              {invalidFields.map((field) => (
                <li key={field.key}>
                  <a href={`#field-${field.key}`} className="inline-block py-1 underline underline-offset-2">{field.label}</a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {state.reasons.length > 0 && (
          <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle aria-hidden className="size-4 text-destructive" /> {carrierName} can&apos;t quote these details</p>
            <ul className="mt-2 space-y-1 text-sm">
              {state.reasons.map((reason) => <li key={reason.code}>{reason.message}</li>)}
            </ul>
          </div>
        )}

        {state.groups.map((group) => (
          <section key={group.id} aria-labelledby={`group-${group.id}`} className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 id={`group-${group.id}`} className="flex items-center justify-between gap-2 text-base font-semibold">
              {GROUP_TITLES[group.id]}
              {group.complete && <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground"><Check aria-hidden className="size-4 text-primary" /> Complete</span>}
            </h2>
            <div className={group.id === "profile" ? "mt-2 divide-y" : "mt-4 space-y-6"}>
              {group.fields.map((field) => (group.id === "profile" ? renderProfileField(field) : <div key={field.key}>{renderControl(field)}</div>))}
            </div>
          </section>
        ))}

        {state.reasons.length === 0 && (
          <div>
            <Button type="submit" className="h-12 w-full text-base sm:w-auto sm:px-8">Confirm and get my quote</Button>
            <p className="mt-2 text-sm text-muted-foreground">By continuing, you confirm these details are correct.</p>
          </div>
        )}
      </form>

      <aside className="rounded-xl border bg-card p-4 shadow-sm lg:sticky lg:top-6">
        <h2 className="text-sm font-semibold">Request to {carrierName}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Updates as you answer. Empty and hidden fields are left out.</p>
        <pre tabIndex={0} aria-label={`Live ${carrierName} request`} className="mt-3 max-h-96 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(quote.preview, null, 2)}</pre>
      </aside>
    </div>
  );
}
