import type { Answers, CarrierForm, CarrierMapping, IneligibilityReason } from "@/lib/types";
import { ageOn, carrierDateToIso, formatLongDate, joinList, nextEligibleDate } from "./converters";

// Rules come from the carrier JSON, so the form and the check can't disagree. Empty or unreadable answers are skipped: those are validation problems, not reasons to refuse a quote.
export function checkEligibility(form: CarrierForm, mapping: CarrierMapping, answers: Answers, today: string): IneligibilityReason[] {
  const { carrierName, eligibility } = mapping;
  const reasons: IneligibilityReason[] = [];

  const stateField = form.fields.find((field) => field.key === eligibility.stateField);
  const state = answers[eligibility.stateField];
  if (stateField?.options && typeof state === "string" && state && !stateField.options.includes(state)) {
    reasons.push({
      field: stateField.key,
      code: "state_not_covered",
      message: `${carrierName} doesn't offer ${form.product} insurance in ${state}. It covers ${joinList(stateField.options.map(String))}.`,
    });
  }

  const birthField = form.fields.find((field) => field.key === eligibility.birthDateField);
  const minAge = birthField?.validation?.minAge;
  const birthIso = carrierDateToIso(answers[eligibility.birthDateField]);
  if (birthField && minAge !== undefined && birthIso && ageOn(birthIso, today) < minAge) {
    reasons.push({
      field: birthField.key,
      code: "under_min_age",
      message: `${carrierName} requires applicants to be at least ${minAge}. You'll be eligible on ${formatLongDate(nextEligibleDate(birthIso, minAge))}.`,
    });
  }

  return reasons;
}
