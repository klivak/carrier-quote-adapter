import { describe, expect, it } from "vitest";
import { buildRequest } from "@/lib/engine/build-request";
import { initialAnswers, resolveFields } from "@/lib/engine/resolve";
import { profileA } from "@/lib/profiles";
import type { Profile } from "@/lib/types";
import { harbor } from "../index";

const { form, mapping } = harbor;

const variants: Partial<Profile>[] = [{}, { has_dog: false, dog_breed: null }, { dog_breed: "Beagle" }, { dog_breed: null }, { claims_last_3_years: 4 }, { personal_property_value: 10000 }, { personal_property_value: 1 }, { personal_property_value: 1000000 }, { state: "CA" }, { state: "or" }, { zip: "97205-1234" }, { date_of_birth: "2000-02-29" }];

describe.each(variants)("Harbor invariants for %j", (change) => {
  const profile = { ...profileA, ...change };
  const resolutions = resolveFields(form, mapping, profile);
  const answers = initialAnswers(resolutions);

  it("never pre-fills the 5-year claims, phone or sprinklers", () => {
    for (const key of ["claims_last_5_years", "phone", "building_has_sprinklers"]) expect(answers).not.toHaveProperty(key);
  });
  it("never pre-fills a coverage amount Harbor doesn't offer", () => {
    if (answers.contents_coverage !== undefined) expect(form.fields.find((field) => field.key === "contents_coverage")?.options).toContain(answers.contents_coverage);
  });
  it("never assumes None for pets", () => {
    expect(answers.pets).not.toEqual(["None"]);
  });
  it("only suggests options Harbor offers", () => {
    for (const resolution of resolutions) {
      const options = form.fields.find((field) => field.key === resolution.key)?.options;
      for (const suggestion of resolution.suggestions ?? []) expect(options).toContain(suggestion);
    }
  });
  it("builds a valid request once the customer answers the rest", () => {
    const complete = { phone: "503-555-0100", claims_last_5_years: String(profile.claims_last_3_years), contents_coverage: 50000, pets: ["Cat"], dog_breed: "Other", ...answers };
    const request = buildRequest(form, mapping, complete, profile);
    expect(request.date_of_birth).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(typeof request.claims_last_5_years).toBe("number");
  });
});

describe("the carrier file", () => {
  it("stays as Harbor defined it", () => {
    expect(form.fields.map((field) => [field.key, field.type, field.required])).toEqual([
      ["applicant_full_name", "text", true],
      ["date_of_birth", "date", true],
      ["contact_email", "email", true],
      ["phone", "tel", true],
      ["residence_state", "select", true],
      ["postal_code", "text", true],
      ["contents_coverage", "select", true],
      ["pets", "multiselect", true],
      ["dog_breed", "select", true],
      ["claims_last_5_years", "number", true],
      ["building_has_sprinklers", "boolean", false],
    ]);
  });
});
