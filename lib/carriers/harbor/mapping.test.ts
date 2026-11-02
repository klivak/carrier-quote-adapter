import { describe, expect, it } from "vitest";
import { initialAnswers, resolveFields } from "@/lib/engine/resolve";
import { profileA, profileB } from "@/lib/profiles";
import type { CarrierMapping, Profile } from "@/lib/types";
import { harbor } from "../index";

const resolve = (profile: Profile) => Object.fromEntries(resolveFields(harbor.form, harbor.mapping, profile).map((resolution) => [resolution.key, resolution]));

describe("mapping coverage", () => {
  it("has an entry for every form field", () => {
    expect(Object.keys(harbor.mapping.fields).sort()).toEqual(harbor.form.fields.map((field) => field.key).sort());
  });
  it("fails loudly on an unmapped field", () => {
    const empty: CarrierMapping = { ...harbor.mapping, fields: {} };
    expect(() => resolveFields(harbor.form, empty, profileA)).toThrow(/No mapping/);
  });
});

describe("profile A", () => {
  const fields = resolve(profileA);
  it("converts and copies what the profile really answers", () => {
    expect(fields.date_of_birth).toMatchObject({ status: "converted", value: "03/12/1994" });
    expect(fields.residence_state).toMatchObject({ status: "converted", value: "Oregon" });
    expect(fields.contact_email).toMatchObject({ status: "direct", value: "maya@example.com" });
    expect(fields.postal_code).toMatchObject({ status: "direct", value: "97205" });
    expect(fields.dog_breed).toMatchObject({ status: "direct", value: "Labrador" });
  });
  it("confirms the name and pets", () => {
    expect(fields.applicant_full_name).toMatchObject({ status: "needs_confirmation", value: "Maya Torres" });
    expect(fields.pets).toMatchObject({ status: "needs_confirmation", value: ["Dog"] });
  });
  it("offers the nearest coverage options and picks neither", () => {
    expect(fields.contents_coverage.status).toBe("needs_confirmation");
    expect(fields.contents_coverage.value).toBeUndefined();
    expect(fields.contents_coverage.suggestions).toEqual([25000, 50000]);
    expect(fields.contents_coverage.optionNotes).toEqual({ "25000": "$7,000 under your value", "50000": "$18,000 over your value" });
  });
  it("asks what the profile can't answer", () => {
    expect(fields.phone.status).toBe("ask");
    expect(fields.building_has_sprinklers.status).toBe("ask");
  });
  it("never copies the 3-year claims count into the 5-year field", () => {
    expect(fields.claims_last_5_years.status).toBe("ask");
    expect(fields.claims_last_5_years.value).toBeUndefined();
    expect(initialAnswers(Object.values(fields))).not.toHaveProperty("claims_last_5_years");
  });
});

describe("profile B", () => {
  const fields = resolve(profileB);
  it("does not turn no dog into no pets", () => {
    expect(fields.pets.status).toBe("needs_confirmation");
    expect(fields.pets.value).toBeUndefined();
  });
  it("keeps a state outside Harbor's list, so eligibility can explain it", () => {
    expect(fields.residence_state.value).toBe("Nevada");
  });
  it("offers coverage around 12,000", () => {
    expect(fields.contents_coverage.suggestions).toEqual([10000, 25000]);
  });
});

describe("edge cases", () => {
  it("pre-fills coverage on an exact option", () => {
    expect(resolve({ ...profileA, personal_property_value: 25000 }).contents_coverage).toMatchObject({ status: "direct", value: 25000 });
  });
  it("offers one option at the extremes", () => {
    expect(resolve({ ...profileA, personal_property_value: 90000 }).contents_coverage.suggestions).toEqual([75000]);
    expect(resolve({ ...profileA, personal_property_value: 5000 }).contents_coverage.suggestions).toEqual([10000]);
  });
  it("matches a breed ignoring case, and returns Harbor's spelling", () => {
    expect(resolve({ ...profileA, dog_breed: "pit bull" }).dog_breed).toMatchObject({ status: "direct", value: "Pit Bull" });
  });
  it("asks about an unlisted breed instead of choosing Other", () => {
    const breed = resolve({ ...profileA, dog_breed: "Beagle" }).dog_breed;
    expect(breed.status).toBe("ask");
    expect(breed.value).toBeUndefined();
    expect(breed.reason).toContain("Beagle");
  });
  it("asks about the breed when it is missing", () => {
    expect(resolve({ ...profileA, dog_breed: null }).dog_breed.status).toBe("ask");
  });
  it("asks when the dog fields disagree", () => {
    const fields = resolve({ ...profileB, dog_breed: "Labrador" });
    expect(fields.pets.status).toBe("ask");
    expect(fields.dog_breed.value).toBeUndefined();
  });
  it("asks instead of crashing on bad profile data", () => {
    const fields = resolve({ ...profileA, state: "ZZ", date_of_birth: "soon", zip: "12", email: "nope", first_name: "", personal_property_value: Number.NaN });
    for (const key of ["residence_state", "date_of_birth", "postal_code", "contact_email", "applicant_full_name", "contents_coverage"]) {
      expect(fields[key]).toMatchObject({ status: "ask" });
      expect(fields[key].value).toBeUndefined();
    }
  });
});
