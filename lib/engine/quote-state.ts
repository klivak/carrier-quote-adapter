import type { Answers, CarrierForm, CarrierMapping, FieldDefinition, FieldResolution, Profile, ResolutionStatus } from "@/lib/types";
import { checkEligibility } from "./eligibility";
import { isEmpty, validateAnswers } from "./validate";
import { isVisible } from "./visibility";

export type QuoteGroupId = "ask" | "check" | "profile";

const GROUP_ORDER: QuoteGroupId[] = ["ask", "check", "profile"];

const GROUP_BY_STATUS: Record<ResolutionStatus, QuoteGroupId> = { ask: "ask", needs_confirmation: "check", direct: "profile", converted: "profile" };

type Input = { form: CarrierForm; mapping: CarrierMapping; profile: Profile; resolutions: Record<string, FieldResolution>; answers: Answers; today: string };

// Everything the UI shows is derived here from the answers, so it can be tested without React.
export function deriveQuoteState({ form, mapping, profile, resolutions, answers, today }: Input) {
  const reasons = checkEligibility(form, mapping, answers, today);
  const errors = validateAnswers(form, mapping, answers, profile);
  const visibleFields = form.fields.filter((field) => isVisible(field, answers));
  const isDone = (field: FieldDefinition) => !errors[field.key] && (!field.required || !isEmpty(answers[field.key]));

  const groups = GROUP_ORDER.map((id) => {
    const fields = visibleFields.filter((field) => GROUP_BY_STATUS[resolutions[field.key].status] === id);
    return { id, fields, complete: fields.every(isDone) };
  }).filter((group) => group.fields.length > 0);

  const required = visibleFields.filter((field) => field.required);
  const remaining = required.filter((field) => !isDone(field)).length;
  const progress = required.length === 0 ? 100 : Math.round(((required.length - remaining) / required.length) * 100);

  return { reasons, errors, groups, orderedFields: groups.flatMap((group) => group.fields), remaining, progress };
}
