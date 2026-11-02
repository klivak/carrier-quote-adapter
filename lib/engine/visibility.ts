import type { Answers, FieldDefinition } from "@/lib/types";

export function isVisible(field: FieldDefinition, answers: Answers): boolean {
  if (!field.showIf) return true;
  const value = answers[field.showIf.field];
  return Array.isArray(value) ? value.includes(field.showIf.includes) : value === field.showIf.includes;
}
