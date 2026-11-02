import type { FieldDefinition, OptionValue } from "@/lib/types";
import { formatUsd } from "./converters";

export const formatOption = (field: FieldDefinition, option: OptionValue): string => (typeof option === "number" && field.label.includes("USD") ? formatUsd(option) : String(option));

export function formatValue(field: FieldDefinition, value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return formatOption(field, value);
  return String(value ?? "");
}

// Inserts the slashes while typing, so the customer only types digits.
export function maskDate(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/");
}
