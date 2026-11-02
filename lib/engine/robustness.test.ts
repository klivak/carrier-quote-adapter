import { describe, expect, it } from "vitest";
import { harbor } from "@/lib/carriers";
import { profileA } from "@/lib/profiles";
import type { Answers, CarrierForm, CarrierMapping } from "@/lib/types";
import { buildRequest } from "./build-request";
import { checkEligibility } from "./eligibility";
import { initialAnswers, resolveFields } from "./resolve";
import { validateAnswers } from "./validate";

const { form, mapping } = harbor;
const complete: Answers = { ...initialAnswers(resolveFields(form, mapping, profileA)), phone: "503-555-0100", contents_coverage: 50000, claims_last_5_years: "0" };
const errorsFor = (answers: Answers) => validateAnswers(form, mapping, answers, profileA);

describe("messy input", () => {
  it("treats spaces as empty", () => {
    expect(errorsFor({ ...complete, applicant_full_name: "   " }).applicant_full_name).toBeDefined();
  });
  it("trims text in the request", () => {
    expect(buildRequest(form, mapping, { ...complete, applicant_full_name: "  Maya Torres " }, profileA).applicant_full_name).toBe("Maya Torres");
  });
  it.each(["0x10", "1e2", "Infinity", "1,5"])("rejects %s as a number", (value) => {
    expect(errorsFor({ ...complete, claims_last_5_years: value }).claims_last_5_years).toBeDefined();
  });
  it("rejects a phone number that is too long", () => {
    expect(errorsFor({ ...complete, phone: "1".repeat(16) }).phone).toBeDefined();
  });
  it("rejects a birth year before 1900", () => {
    expect(errorsFor({ ...complete, date_of_birth: "01/01/1800" }).date_of_birth).toBeDefined();
  });
});

describe("eligibility boundaries", () => {
  it.each([
    ["11/05/2005", true],
    ["11/06/2005", false],
    ["12/31/2030", false],
  ])("birth date %s, eligible: %s", (date_of_birth, eligible) => {
    expect(checkEligibility(form, mapping, { residence_state: "Oregon", date_of_birth }, "2026-11-05").length === 0).toBe(eligible);
  });
  it.each(["California", "Oregon", "Washington", "Arizona"])("covers %s", (residence_state) => {
    expect(checkEligibility(form, mapping, { residence_state }, "2026-11-05")).toEqual([]);
  });
});

describe("the engine works with any carrier", () => {
  const otherForm: CarrierForm = {
    carrier: "acme",
    product: "auto",
    fields: [
      { key: "dob", label: "Date of birth", type: "date", required: true, validation: { minAge: 18 } },
      { key: "region", label: "Region", type: "select", options: ["Texas"], required: true },
      { key: "nickname", label: "Nickname", type: "text", required: false },
    ],
  };
  const otherMapping: CarrierMapping = {
    carrierName: "Acme",
    eligibility: { birthDateField: "dob", stateField: "region" },
    fields: {
      dob: { source: ["date_of_birth"], resolve: () => ({ status: "converted", value: "03/12/1994" }) },
      region: { source: ["state"], resolve: () => ({ status: "converted", value: "Texas" }) },
      nickname: { source: [], resolve: () => ({ status: "ask" }) },
    },
  };
  it("builds a request with no engine changes", () => {
    const answers = initialAnswers(resolveFields(otherForm, otherMapping, profileA));
    expect(buildRequest(otherForm, otherMapping, answers, profileA)).toEqual({ dob: "03/12/1994", region: "Texas" });
  });
  it("names the carrier and product in refusals", () => {
    expect(checkEligibility(otherForm, otherMapping, { region: "Ohio" }, "2026-11-05")[0].message).toBe("Acme doesn't offer auto insurance in Ohio. It covers Texas.");
  });
});
