import type { Answers, CarrierForm, CarrierMapping, Profile } from "@/lib/types";
import { isEmpty, validateAnswers } from "./validate";
import { isVisible } from "./visibility";

// Keys and order follow the carrier JSON. Hidden and empty fields are left out.
export function serializeAnswers(form: CarrierForm, answers: Answers): Record<string, unknown> {
  const request: Record<string, unknown> = {};
  for (const field of form.fields) {
    const value = answers[field.key];
    if (!isVisible(field, answers) || isEmpty(value)) continue;
    request[field.key] = field.type === "number" ? Number(value) : typeof value === "string" ? value.trim() : value;
  }
  return request;
}

export function buildRequest(form: CarrierForm, mapping: CarrierMapping, answers: Answers, profile: Profile): Record<string, unknown> {
  const errors = validateAnswers(form, mapping, answers, profile);
  const failed = Object.keys(errors);
  if (failed.length > 0) throw new Error(`Can't build ${form.carrier} request, invalid fields: ${failed.join(", ")}`);
  return serializeAnswers(form, answers);
}
