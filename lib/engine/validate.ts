import type { Answers, CarrierForm, CarrierMapping, FieldDefinition, OptionValue, Profile } from "@/lib/types";
import { carrierDateToIso } from "./converters";
import { isVisible } from "./visibility";

export const isEmpty = (value: unknown): boolean => value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

function requiredMessage(field: FieldDefinition): string {
  if (field.type === "multiselect" || field.type === "select" || field.type === "boolean") return "Choose an option";
  return `Enter your ${lowerFirst(field.label)}`;
}

function formatError(field: FieldDefinition, value: unknown, patternMessage?: string): string | null {
  switch (field.type) {
    case "email":
      return /^\S+@\S+\.\S+$/.test(String(value)) ? null : "Enter an email like name@example.com";
    case "tel":
      return String(value).replace(/\D/g, "").length >= 10 ? null : "Enter a phone number with at least 10 digits";
    case "date":
      return carrierDateToIso(value) ? null : "Enter a real date as MM/DD/YYYY";
    case "number": {
      const number = Number(value);
      if (!Number.isFinite(number)) return "Enter a number";
      if (field.min !== undefined && number < field.min) return `Must be ${field.min} or more`;
      return Number.isInteger(number) ? null : "Enter a whole number";
    }
    case "select":
      return field.options?.includes(value as OptionValue) ? null : "Choose one of the listed options";
    case "multiselect":
      return Array.isArray(value) && value.every((item) => field.options?.includes(item)) ? null : "Choose from the listed options";
    default:
      return field.pattern && !new RegExp(field.pattern).test(String(value)) ? (patternMessage ?? "Check the format") : null;
  }
}

export function validateField(field: FieldDefinition, mapping: CarrierMapping, answers: Answers, profile: Profile): string | null {
  const value = answers[field.key];
  if (isEmpty(value)) return field.required ? requiredMessage(field) : null;
  const fieldMapping = mapping.fields[field.key];
  return formatError(field, value, fieldMapping?.patternMessage) ?? fieldMapping?.validate?.(value, profile) ?? null;
}

// Hidden fields are not required and not checked.
export function validateAnswers(form: CarrierForm, mapping: CarrierMapping, answers: Answers, profile: Profile): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of form.fields) {
    if (!isVisible(field, answers)) continue;
    const error = validateField(field, mapping, answers, profile);
    if (error) errors[field.key] = error;
  }
  return errors;
}

export function toggleOption(selected: OptionValue[], option: OptionValue, exclusive: OptionValue[] = []): OptionValue[] {
  if (selected.includes(option)) return selected.filter((item) => item !== option);
  if (exclusive.includes(option)) return [option];
  return [...selected.filter((item) => !exclusive.includes(item)), option];
}
