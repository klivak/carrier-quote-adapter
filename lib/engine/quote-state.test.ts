import { describe, expect, it } from "vitest";
import { harbor } from "@/lib/carriers";
import { profileA, profileB } from "@/lib/profiles";
import type { Answers, Profile } from "@/lib/types";
import { deriveQuoteState } from "./quote-state";
import { indexResolutions, initialAnswers, resolveFields } from "./resolve";

const { form, mapping } = harbor;
const TODAY = "2026-11-05";

function stateFor(profile: Profile, changes: Answers = {}) {
  const list = resolveFields(form, mapping, profile);
  return deriveQuoteState({ form, mapping, profile, resolutions: indexResolutions(list), answers: { ...initialAnswers(list), ...changes }, today: TODAY });
}
const groupKeys = (state: ReturnType<typeof stateFor>, id: string) => state.groups.find((group) => group.id === id)?.fields.map((field) => field.key);

describe("deriveQuoteState", () => {
  it("groups fields for profile A by what the customer must do, in form order", () => {
    const state = stateFor(profileA);
    expect(groupKeys(state, "ask")).toEqual(["phone", "claims_last_5_years", "building_has_sprinklers"]);
    expect(groupKeys(state, "check")).toEqual(["applicant_full_name", "contents_coverage", "pets"]);
    expect(groupKeys(state, "profile")).toEqual(["date_of_birth", "contact_email", "residence_state", "postal_code", "dog_breed"]);
  });
  it("counts what is left and reaches 100% when done", () => {
    expect(stateFor(profileA).remaining).toBe(3);
    const done = stateFor(profileA, { phone: "503-555-0100", claims_last_5_years: "0", contents_coverage: 25000 });
    expect(done.remaining).toBe(0);
    expect(done.progress).toBe(100);
    expect(done.groups.every((group) => group.complete)).toBe(true);
  });
  it("does not count the optional sprinkler question", () => {
    expect(stateFor(profileA, { phone: "503-555-0100", claims_last_5_years: "0" }).remaining).toBe(1);
  });
  it("counts an invalid answer as not done", () => {
    expect(stateFor(profileA, { phone: "1" }).remaining).toBe(3);
  });
  it("drops a hidden field from groups", () => {
    expect(stateFor(profileA, { pets: ["Cat"] }).orderedFields.map((field) => field.key)).not.toContain("dog_breed");
  });
  it("shows the breed question when a dog is added to profile B", () => {
    expect(groupKeys(stateFor(profileB, { pets: ["Dog"] }), "ask")).toContain("dog_breed");
    expect(groupKeys(stateFor(profileB), "ask")).not.toContain("dog_breed");
  });
  it("reports both refusal reasons for profile B", () => {
    expect(stateFor(profileB).reasons).toHaveLength(2);
  });
});
