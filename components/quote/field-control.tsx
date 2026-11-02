"use client";

import { AlertCircle, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toggleOption } from "@/lib/engine/validate";
import { formatUsd } from "@/lib/engine/converters";
import { cn } from "@/lib/utils";
import type { FieldDefinition, FieldResolution, OptionValue } from "@/lib/types";

const MAX_OPTION_CARDS = 5;

export const formatOption = (field: FieldDefinition, option: OptionValue): string => (typeof option === "number" && field.label.includes("USD") ? formatUsd(option) : String(option));

export function formatValue(field: FieldDefinition, value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return formatOption(field, value);
  return String(value ?? "");
}

// Inserts the slashes while typing, so the customer only types digits.
function maskDate(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/");
}

const INPUT_PROPS: Partial<Record<FieldDefinition["type"], React.ComponentProps<"input">>> = {
  email: { type: "email", autoComplete: "email", inputMode: "email" },
  tel: { type: "tel", autoComplete: "tel", inputMode: "tel" },
  date: { inputMode: "numeric", autoComplete: "bday", placeholder: "MM/DD/YYYY" },
  number: { inputMode: "numeric", autoComplete: "off" },
  text: { type: "text" },
};

type Props = {
  field: FieldDefinition;
  resolution?: FieldResolution;
  value: unknown;
  error: string | null;
  exclusive?: OptionValue[];
  autoFocus?: boolean;
  onChange: (value: unknown) => void;
  onBlur: () => void;
};

export function FieldControl({ field, resolution, value, error, exclusive, autoFocus, onChange, onBlur }: Props) {
  const id = `field-${field.key}`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [resolution?.reason && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  const footer = (
    <>
      {error && (
        <p id={errorId} className="mt-2 flex items-start gap-1.5 text-sm font-medium text-destructive">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </>
  );
  const hint = resolution?.reason && (
    <p id={hintId} className="mt-1 text-sm text-muted-foreground">
      {resolution.reason}
    </p>
  );
  const optional = !field.required && <span className="ml-1.5 font-normal text-muted-foreground">(optional)</span>;

  const isChoice = field.type === "multiselect" || field.type === "boolean" || (field.type === "select" && (field.options?.length ?? 0) <= MAX_OPTION_CARDS);

  if (isChoice) {
    const multi = field.type === "multiselect";
    const choices: { key: string; label: string; checked: boolean; note?: string; closest?: boolean; pick: () => void }[] =
      field.type === "boolean"
        ? [
            { key: "yes", label: "Yes", checked: value === true, pick: () => onChange(true) },
            { key: "no", label: "No", checked: value === false, pick: () => onChange(false) },
            ...(field.required ? [] : [{ key: "unsure", label: "Not sure", checked: value === null, pick: () => onChange(null) }]),
          ]
        : (field.options ?? []).map((option) => ({
            key: String(option),
            label: formatOption(field, option),
            checked: multi ? Array.isArray(value) && value.includes(option) : value === option,
            note: resolution?.optionNotes?.[String(option)],
            closest: resolution?.suggestions?.includes(option),
            pick: () => onChange(multi ? toggleOption(Array.isArray(value) ? value : [], option, exclusive) : option),
          }));

    return (
      <fieldset id={id} aria-describedby={describedBy} aria-invalid={Boolean(error)} onBlur={onBlur}>
        <legend className="text-sm font-semibold">
          {field.label}
          {optional}
        </legend>
        {hint}
        <div className={cn("mt-2.5 grid gap-2", choices.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3")}>
          {choices.map((choice, index) => (
            <label key={choice.key} className={cn("relative flex min-h-11 cursor-pointer flex-col justify-center rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:border-primary/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50", choice.checked ? "border-primary bg-primary/5 font-semibold" : "border-input", choice.closest && !choice.checked && "border-primary/50")}>
              <input type={multi ? "checkbox" : "radio"} name={id} className="sr-only" checked={choice.checked} onChange={choice.pick} autoFocus={autoFocus && index === 0} />
              <span className="flex items-center justify-between gap-2">
                {choice.label}
                {choice.checked && <Check aria-hidden className="size-4 shrink-0 text-primary" />}
              </span>
              {choice.note && <span className="mt-0.5 text-xs font-normal text-muted-foreground">{choice.note}</span>}
            </label>
          ))}
        </div>
        {footer}
      </fieldset>
    );
  }

  return (
    <div id={id}>
      <label htmlFor={`${id}-input`} className="text-sm font-semibold">
        {field.label}
        {optional}
      </label>
      {hint}
      {field.type === "select" ? (
        <select id={`${id}-input`} value={String(value ?? "")} aria-describedby={describedBy} aria-invalid={Boolean(error)} autoFocus={autoFocus} onBlur={onBlur} className="mt-2 h-11 w-full rounded-lg border border-input bg-card px-3 text-base" onChange={(event) => onChange(field.options?.find((option) => String(option) === event.target.value) ?? "")}>
          <option value="">Choose...</option>
          {field.options?.map((option) => (
            <option key={option} value={String(option)}>
              {formatOption(field, option)}
            </option>
          ))}
        </select>
      ) : (
        <Input id={`${id}-input`} {...INPUT_PROPS[field.type]} value={String(value ?? "")} aria-describedby={describedBy} aria-invalid={Boolean(error)} autoFocus={autoFocus} onBlur={onBlur} className="mt-2 h-11 bg-card text-base md:text-base" onChange={(event) => onChange(field.type === "date" ? maskDate(event.target.value) : event.target.value)} />
      )}
      {footer}
    </div>
  );
}
