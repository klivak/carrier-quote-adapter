import { describe, expect, it } from "vitest";
import { harbor } from "@/lib/carriers";
import { profileA, profileB } from "@/lib/profiles";
import type { Answers } from "@/lib/types";
import { buildRequest } from "./build-request";
import { initialAnswers, resolveFields } from "./resolve";
import { toggleOption, validateAnswers } from "./validate";
import { isVisible } from "./visibility";

const { form, mapping } = harbor;
const prefilled = initialAnswers(resolveFields(form, mapping, profileA));
const completeA: Answers = { ...prefilled, phone: "503-555-0100", contents_coverage: 50000, claims_last_5_years: "0" };
const errorsFor = (answers: Answers, profile = profileA) => validateAnswers(form, mapping, answers, profile);

describe("request for profile A", () => {
  it("matches Harbor's exact format", () => {
    expect(buildRequest(form, mapping, completeA, profileA)).toEqual({
      applicant_full_name: "Maya Torres",
      date_of_birth: "03/12/1994",
      contact_email: "maya@example.com",
      phone: "503-555-0100",
      residence_state: "Oregon",
      postal_code: "97205",
      contents_coverage: 50000,
      pets: ["Dog"],
      dog_breed: "Labrador",
      claims_last_5_years: 0,
    });
  });
  it("follows the carrier's key order", () => {
    expect(Object.keys(buildRequest(form, mapping, completeA, profileA))).toEqual(form.fields.map((field) => field.key).filter((key) => key !== "building_has_sprinklers"));
  });
  it("refuses to build from invalid answers", () => {
    expect(() => buildRequest(form, mapping, prefilled, profileA)).toThrow(/phone/);
  });
  it("includes sprinklers when answered, including false", () => {
    expect(buildRequest(form, mapping, { ...completeA, building_has_sprinklers: false }, profileA).building_has_sprinklers).toBe(false);
  });
});

describe("dog_breed visibility", () => {
  const noDog = { ...completeA, pets: ["Cat"], dog_breed: "Labrador" };
  it("hides and leaves out the breed without a dog", () => {
    const breed = form.fields.find((field) => field.key === "dog_breed")!;
    expect(isVisible(breed, noDog)).toBe(false);
    expect(buildRequest(form, mapping, noDog, profileA)).not.toHaveProperty("dog_breed");
  });
  it("does not require a hidden breed", () => {
    expect(errorsFor({ ...noDog, dog_breed: undefined })).toEqual({});
  });
  it("requires the breed with a dog", () => {
    expect(errorsFor({ ...completeA, dog_breed: undefined }).dog_breed).toBe("Choose an option");
  });
});

describe("validation", () => {
  it("passes a complete answer set, with sprinklers unanswered", () => {
    expect(errorsFor(completeA)).toEqual({});
  });
  it("gives a helpful required message", () => {
    expect(errorsFor({ ...completeA, phone: "" }).phone).toBe("Enter your mobile number");
  });
  it("checks the pattern, and accepts ZIP+4", () => {
    expect(errorsFor({ ...completeA, postal_code: "972" }).postal_code).toBe("Enter a 5-digit ZIP code, like 97205");
    expect(errorsFor({ ...completeA, postal_code: "97205-1234" }).postal_code).toBeUndefined();
  });
  it("checks dates, email, phone and numbers", () => {
    expect(errorsFor({ ...completeA, date_of_birth: "02/30/1994" }).date_of_birth).toBe("Enter a real date as MM/DD/YYYY");
    expect(errorsFor({ ...completeA, contact_email: "maya" }).contact_email).toContain("email");
    expect(errorsFor({ ...completeA, phone: "123" }).phone).toContain("10 digits");
    expect(errorsFor({ ...completeA, claims_last_5_years: "-1" }).claims_last_5_years).toBe("Must be 0 or more");
    expect(errorsFor({ ...completeA, claims_last_5_years: "1.5" }).claims_last_5_years).toBe("Enter a whole number");
    expect(errorsFor({ ...completeA, claims_last_5_years: "abc" }).claims_last_5_years).toBe("Enter a number");
  });
  it("rejects a value outside the options", () => {
    expect(errorsFor({ ...completeA, contents_coverage: 32000 }).contents_coverage).toBeDefined();
  });
  it("does not let 5-year claims go below the 3-year count", () => {
    expect(errorsFor({ ...completeA, claims_last_5_years: "0" }, profileB).claims_last_5_years).toBe("Your profile shows 1 claim in the last 3 years, so this can't be lower than 1");
    expect(errorsFor({ ...completeA, claims_last_5_years: "1" }, profileB).claims_last_5_years).toBeUndefined();
  });
});

describe("toggleOption", () => {
  const exclusive = mapping.exclusiveOptions?.pets;
  it("clears the others when None is chosen", () => {
    expect(toggleOption(["Dog", "Cat"], "None", exclusive)).toEqual(["None"]);
  });
  it("clears None when another option is chosen", () => {
    expect(toggleOption(["None"], "Dog", exclusive)).toEqual(["Dog"]);
  });
  it("adds and removes normally", () => {
    expect(toggleOption(["Dog"], "Cat", exclusive)).toEqual(["Dog", "Cat"]);
    expect(toggleOption(["Dog", "Cat"], "Dog", exclusive)).toEqual(["Cat"]);
  });
});
