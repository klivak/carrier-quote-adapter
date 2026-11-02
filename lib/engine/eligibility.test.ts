import { describe, expect, it } from "vitest";
import form from "@/lib/carriers/harbor/form.json";
import type { CarrierForm, CarrierMapping } from "@/lib/types";
import { checkEligibility } from "./eligibility";

const harbor = form as CarrierForm;
const mapping: CarrierMapping = { carrierName: "Harbor", fields: {}, eligibility: { birthDateField: "date_of_birth", stateField: "residence_state" } };
const TODAY = "2026-11-05";

describe("checkEligibility", () => {
  it("passes an adult in a covered state", () => {
    expect(checkEligibility(harbor, mapping, { residence_state: "Oregon", date_of_birth: "03/12/1994" }, TODAY)).toEqual([]);
  });

  it("returns every failed rule, not just the first", () => {
    const reasons = checkEligibility(harbor, mapping, { residence_state: "Nevada", date_of_birth: "01/20/2006" }, TODAY);
    expect(reasons.map((reason) => reason.code)).toEqual(["state_not_covered", "under_min_age"]);
    expect(reasons[0].message).toBe("Harbor doesn't offer renters insurance in Nevada. It covers California, Oregon, Washington and Arizona.");
    expect(reasons[1].message).toBe("Harbor requires applicants to be at least 21. You'll be eligible on January 20, 2027.");
  });

  it("uses the given date, with no hidden clock", () => {
    const answers = { residence_state: "Oregon", date_of_birth: "01/20/2006" };
    expect(checkEligibility(harbor, mapping, answers, "2027-01-19")).toHaveLength(1);
    expect(checkEligibility(harbor, mapping, answers, "2027-01-20")).toHaveLength(0);
  });

  it("does not refuse on empty or unfinished answers", () => {
    expect(checkEligibility(harbor, mapping, {}, TODAY)).toEqual([]);
    expect(checkEligibility(harbor, mapping, { residence_state: "", date_of_birth: "01/2" }, TODAY)).toEqual([]);
  });
});
