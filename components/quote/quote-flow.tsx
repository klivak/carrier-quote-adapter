"use client";

import { AlertTriangle, Ban, Check, CheckCircle2, Copy, Pencil, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { buildRequest, serializeAnswers } from "@/lib/engine/build-request";
import { checkEligibility } from "@/lib/engine/eligibility";
import { initialAnswers, resolveFields } from "@/lib/engine/resolve";
import { isEmpty, validateAnswers } from "@/lib/engine/validate";
import { isVisible } from "@/lib/engine/visibility";
import type { Answers, CarrierForm, CarrierMapping, FieldDefinition, FieldResolution, IneligibilityReason, Profile } from "@/lib/types";
import { FieldControl, formatValue } from "./field-control";

type Props = { form: CarrierForm; mapping: CarrierMapping; profile: Profile; today: string };

const GROUPS = [
  { id: "ask", title: "A few questions for you", statuses: ["ask"] },
  { id: "check", title: "Please check these", statuses: ["needs_confirmation"] },
  { id: "profile", title: "From your profile", statuses: ["direct", "converted"] },
] as const;

export function QuoteFlow({ form, mapping, profile, today }: Props) {
  const resolutions = useMemo(() => Object.fromEntries(resolveFields(form, mapping, profile).map((resolution) => [resolution.key, resolution])), [form, mapping, profile]);
  const [answers, setAnswers] = useState<Answers>(() => initialAnswers(Object.values(resolutions)));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [attempts, setAttempts] = useState(0);
  const [fixing, setFixing] = useState(false);
  // Derived from the date on each render, so it stays right when the real date replaces the prerender date.
  const blocked = !fixing && checkEligibility(form, mapping, initialAnswers(Object.values(resolutions)), today).length > 0;
  const [request, setRequest] = useState<Record<string, unknown> | null>(null);

  const reasons = checkEligibility(form, mapping, answers, today);
  const errors = validateAnswers(form, mapping, answers, profile);
  const visibleFields = form.fields.filter((field) => isVisible(field, answers));
  const groups = GROUPS.map((group) => ({ ...group, fields: visibleFields.filter((field) => (group.statuses as readonly string[]).includes(resolutions[field.key].status)) }));
  const orderedFields = groups.flatMap((group) => group.fields);
  const remaining = visibleFields.filter((field) => field.required && (isEmpty(answers[field.key]) || errors[field.key])).length;
  const requiredCount = Math.max(visibleFields.filter((field) => field.required).length, 1);
  const blockedFields = new Set(reasons.map((reason) => reason.field));

  const shownError = (key: string) => (touched[key] || attempts > 0 ? (errors[key] ?? null) : null);
  const preview = JSON.stringify(serializeAnswers(form, answers), null, 2);

  if (request) return <Success request={request} carrierName={mapping.carrierName} onBack={() => setRequest(null)} />;
  if (blocked) return <Ineligible reasons={reasons} carrierName={mapping.carrierName} product={form.product} onFix={() => {
          // Keep these fields open after they become valid, so they don't collapse mid-edit.
          setEditing(Object.fromEntries(reasons.map((reason) => [reason.field, true])));
          // The refusal screen is about to disappear, so move focus to the first field to correct.
          flushSync(() => setFixing(true));
          document.querySelector<HTMLElement>(`#field-${reasons[0]?.field} :is(input, select)`)?.focus();
        }} />;

  const invalidFields = attempts > 0 ? orderedFields.filter((field) => errors[field.key]) : [];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (reasons.length > 0) return;
    const firstInvalid = orderedFields.find((field) => errors[field.key]);
    if (firstInvalid) {
      // Render the errors first, so that a collapsed profile field is open when it receives focus.
      flushSync(() => setAttempts((count) => count + 1));
      document.querySelector<HTMLElement>(`#field-${firstInvalid.key} :is(input, select)`)?.focus();
      return;
    }
    setRequest(buildRequest(form, mapping, answers, profile));
  }

  const renderControl = (field: FieldDefinition, resolution: FieldResolution, autoFocus = false) => (
    <FieldControl field={field} resolution={resolution} value={answers[field.key]} error={shownError(field.key)} exclusive={mapping.exclusiveOptions?.[field.key]} autoFocus={autoFocus} onChange={(value) => setAnswers((current) => ({ ...current, [field.key]: value }))} onBlur={() => setTouched((current) => ({ ...current, [field.key]: true }))} />
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <form onSubmit={submit} noValidate className="space-y-6">
        <header>
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary"><ShieldCheck aria-hidden className="size-4" /> {mapping.carrierFullName ?? mapping.carrierName}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Your {mapping.carrierName} {form.product} quote</h1>
          <p aria-live="polite" className="mt-1 text-muted-foreground">
            {remaining === 0 ? "Everything is ready. Check it over and continue." : `${remaining} ${remaining === 1 ? "answer" : "answers"} left. We filled in the rest from your profile.`}
          </p>
          <div aria-hidden className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${Math.round(((requiredCount - remaining) / requiredCount) * 100)}%` }} />
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

        {reasons.length > 0 && <ReasonList reasons={reasons} carrierName={mapping.carrierName} />}

        {groups.map(
          (group) =>
            group.fields.length > 0 && (
              <section key={group.id} aria-labelledby={`group-${group.id}`} className="rounded-xl border bg-card p-5 shadow-sm">
                <h2 id={`group-${group.id}`} className="flex items-center justify-between gap-2 text-base font-semibold">
                  {group.title}
                  {group.fields.every((field) => !errors[field.key] && (!field.required || !isEmpty(answers[field.key]))) && (
                    <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground"><Check aria-hidden className="size-4 text-primary" /> Complete</span>
                  )}
                </h2>
                <div className={group.id === "profile" ? "mt-2 divide-y" : "mt-4 space-y-6"}>
                  {group.fields.map((field) => {
                    const resolution = resolutions[field.key];
                    if (group.id !== "profile") return <div key={field.key}>{renderControl(field, resolution)}</div>;
                    const open = editing[field.key] || blockedFields.has(field.key) || Boolean(shownError(field.key));
                    return open ? (
                      <div key={field.key} className="py-4">
                        {renderControl(field, resolution, Boolean(editing[field.key]) && !blockedFields.has(field.key))}
                        {!blockedFields.has(field.key) && !errors[field.key] && (
                          <Button type="button" variant="ghost" className="mt-2 h-11" onClick={() => setEditing((current) => ({ ...current, [field.key]: false }))}>Done</Button>
                        )}
                      </div>
                    ) : (
                      <div key={field.key} id={`field-${field.key}`} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <div className="text-sm text-muted-foreground">{field.label}</div>
                          <div className="break-words font-medium">{formatValue(field, answers[field.key])}</div>
                        </div>
                        <Button type="button" variant="ghost" className="min-h-11 shrink-0" aria-label={`Edit ${field.label}`} onClick={() => setEditing((current) => ({ ...current, [field.key]: true }))}>
                          <Pencil aria-hidden /> Edit
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ),
        )}

        {reasons.length === 0 && (
          <div>
            <Button type="submit" className="h-12 w-full text-base sm:w-auto sm:px-8">Confirm and get my quote</Button>
            <p className="mt-2 text-sm text-muted-foreground">By continuing, you confirm these details are correct.</p>
          </div>
        )}
      </form>

      <aside className="rounded-xl border bg-card p-4 shadow-sm lg:sticky lg:top-6">
        <h2 className="text-sm font-semibold">Request to {mapping.carrierName}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Updates as you answer. Empty and hidden fields are left out.</p>
        <pre tabIndex={0} aria-label={`Live ${mapping.carrierName} request`} className="mt-3 max-h-96 overflow-auto rounded-lg bg-muted p-3 text-xs">{preview}</pre>
      </aside>
    </div>
  );
}

function ReasonList({ reasons, carrierName }: { reasons: IneligibilityReason[]; carrierName: string }) {
  return (
    <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <p className="flex items-center gap-2 font-semibold"><AlertTriangle aria-hidden className="size-4 text-destructive" /> {carrierName} can&apos;t quote these details</p>
      <ul className="mt-2 space-y-1 text-sm">
        {reasons.map((reason) => <li key={reason.code}>{reason.message}</li>)}
      </ul>
    </div>
  );
}

function Ineligible({ reasons, carrierName, product, onFix }: { reasons: IneligibilityReason[]; carrierName: string; product: string; onFix: () => void }) {
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

function Success({ request, carrierName, onBack }: { request: Record<string, unknown>; carrierName: string; onBack: () => void }) {
  const json = JSON.stringify(request, null, 2);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <section className="mx-auto max-w-2xl rounded-xl border bg-card p-6 shadow-sm">
      <CheckCircle2 aria-hidden className="size-8 text-primary" />
      <h1 ref={headingRef} tabIndex={-1} className="mt-3 text-2xl font-semibold tracking-tight outline-none">Your request is ready</h1>
      <p className="mt-1 text-muted-foreground">This demo doesn&apos;t call {carrierName}. This is the exact request it would send.</p>
      <pre tabIndex={0} data-testid="final-request" className="mt-4 overflow-auto rounded-lg bg-muted p-4 text-sm">{json}</pre>
      <Button
        variant="outline"
        className="mt-3 h-11"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(json);
            setCopyState("copied");
          } catch {
            setCopyState("failed");
          }
        }}
      >
        <Copy aria-hidden /> <span aria-live="polite">{{ idle: "Copy JSON", copied: "Copied", failed: "Couldn't copy. Please select the text." }[copyState]}</span>
      </Button>
      <Button variant="ghost" className="ml-2 mt-3 h-11" onClick={onBack}>Change my answers</Button>
    </section>
  );
}
