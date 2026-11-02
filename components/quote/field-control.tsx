"use client";

import { AlertCircle, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatOption, maskDate } from "@/lib/engine/display";
import { toggleOption } from "@/lib/engine/validate";
import { cn } from "@/lib/utils";
import type { FieldDefinition, FieldResolution, OptionValue } from "@/lib/types";

const MAX_OPTION_CARDS = 5;

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

type Ids = { root: string; input: string; hint: string; error: string; describedBy?: string };

function fieldIds({ field, resolution, error }: Props): Ids {
  const root = `field-${field.key}`;
  const hint = `${root}-hint`;
  const errorId = `${root}-error`;
  return { root, input: `${root}-input`, hint, error: errorId, describedBy: [resolution?.reason && hint, error && errorId].filter(Boolean).join(" ") || undefined };
}

const Optional = ({ field }: { field: FieldDefinition }) => (field.required ? null : <span className="ml-1.5 font-normal text-muted-foreground">(optional)</span>);

const Hint = ({ id, text }: { id: string; text?: string }) => (text ? <p id={id} className="mt-1 text-sm text-muted-foreground">{text}</p> : null);

const ErrorText = ({ id, text }: { id: string; text: string | null }) =>
  text ? (
    <p id={id} className="mt-2 flex items-start gap-1.5 text-sm font-medium text-destructive">
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      {text}
    </p>
  ) : null;

type Choice = { key: string; label: string; checked: boolean; note?: string; closest?: boolean; pick: () => void };

function buildChoices({ field, resolution, value, exclusive, onChange }: Props): Choice[] {
  if (field.type === "boolean") {
    return [
      { key: "yes", label: "Yes", checked: value === true, pick: () => onChange(true) },
      { key: "no", label: "No", checked: value === false, pick: () => onChange(false) },
      ...(field.required ? [] : [{ key: "unsure", label: "Not sure", checked: value === null, pick: () => onChange(null) }]),
    ];
  }
  const multi = field.type === "multiselect";
  return (field.options ?? []).map((option) => ({
    key: String(option),
    label: formatOption(field, option),
    checked: multi ? Array.isArray(value) && value.includes(option) : value === option,
    note: resolution?.optionNotes?.[String(option)],
    closest: resolution?.suggestions?.includes(option),
    pick: () => onChange(multi ? toggleOption(Array.isArray(value) ? value : [], option, exclusive) : option),
  }));
}

function ChoiceField(props: Props) {
  const { field, resolution, error, autoFocus, onBlur } = props;
  const ids = fieldIds(props);
  const multi = field.type === "multiselect";
  const choices = buildChoices(props);

  return (
    <fieldset
      id={ids.root}
      role={multi ? "group" : "radiogroup"}
      aria-describedby={ids.describedBy}
      aria-required={!multi && field.required ? true : undefined}
      aria-invalid={!multi && error ? true : undefined}
      // Moving between options in the group shouldn't count as leaving the question.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onBlur();
      }}
    >
      <legend className="text-sm font-semibold">
        {field.label}
        <Optional field={field} />
      </legend>
      <Hint id={ids.hint} text={resolution?.reason} />
      <div className={cn("mt-2.5 grid gap-2", choices.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3")}>
        {choices.map((choice, index) => (
          <label key={choice.key} className={cn("relative flex min-h-11 cursor-pointer flex-col justify-center rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:border-primary/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50", choice.checked ? "border-primary bg-primary/5 font-semibold" : "border-input", choice.closest && !choice.checked && "border-primary/50")}>
            <input type={multi ? "checkbox" : "radio"} name={ids.root} className="sr-only" checked={choice.checked} onChange={choice.pick} autoFocus={autoFocus && index === 0} />
            <span className="flex items-center justify-between gap-2">
              {choice.label}
              {choice.checked && <Check aria-hidden className="size-4 shrink-0 text-primary" />}
            </span>
            {choice.closest && <span className="mt-1 w-fit rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">Closest</span>}
            {choice.note && <span className="mt-1 text-xs font-normal text-muted-foreground">{choice.note}</span>}
          </label>
        ))}
      </div>
      <ErrorText id={ids.error} text={error} />
    </fieldset>
  );
}

function InputField(props: Props) {
  const { field, resolution, value, error, autoFocus, onChange, onBlur } = props;
  const ids = fieldIds(props);
  const shared = { id: ids.input, value: String(value ?? ""), autoFocus, onBlur, "aria-describedby": ids.describedBy, "aria-required": field.required, "aria-invalid": Boolean(error) };

  return (
    <div id={ids.root}>
      <label htmlFor={ids.input} className="text-sm font-semibold">
        {field.label}
        <Optional field={field} />
      </label>
      <Hint id={ids.hint} text={resolution?.reason} />
      {field.type === "select" ? (
        <select {...shared} className="mt-2 h-11 w-full rounded-lg border border-input bg-card px-3 text-base" onChange={(event) => onChange(field.options?.find((option) => String(option) === event.target.value) ?? "")}>
          <option value="">Choose...</option>
          {field.options?.map((option) => (
            <option key={option} value={String(option)}>{formatOption(field, option)}</option>
          ))}
        </select>
      ) : (
        <Input {...INPUT_PROPS[field.type]} {...shared} className="mt-2 h-11 bg-card text-base md:text-base" onChange={(event) => onChange(field.type === "date" ? maskDate(event.target.value) : event.target.value)} />
      )}
      <ErrorText id={ids.error} text={error} />
    </div>
  );
}

const isChoiceField = ({ type, options }: FieldDefinition) => type === "multiselect" || type === "boolean" || (type === "select" && (options?.length ?? 0) <= MAX_OPTION_CARDS);

export function FieldControl(props: Props) {
  return isChoiceField(props.field) ? <ChoiceField {...props} /> : <InputField {...props} />;
}
