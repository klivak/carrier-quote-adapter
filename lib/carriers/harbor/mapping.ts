import { formatUsd, isoToCarrierDate, nearestOptions, stateName } from "@/lib/engine/converters";
import type { CarrierMapping, Profile, Resolved } from "@/lib/types";

const hasText = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

const ask = (reason?: string): Resolved => ({ status: "ask", reason });

function resolveCoverage(profile: Profile, options: number[]): Resolved {
  const value = profile.personal_property_value;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return ask();
  if (options.includes(value)) return { status: "direct", value };

  // Coverage is a financial choice: rounding down underinsures and rounding up costs more, so the customer picks.
  const suggestions = nearestOptions(value, options);
  const optionNotes = Object.fromEntries(suggestions.map((option) => [String(option), option < value ? `${formatUsd(value - option)} under your value` : `${formatUsd(option - value)} over your value`]));
  const offered = suggestions.map(formatUsd).join(" or ");
  return { status: "needs_confirmation", suggestions, optionNotes, reason: `Your belongings are valued at ${formatUsd(value)}. Harbor's closest ${suggestions.length > 1 ? "amounts are" : "amount is"} ${offered}.` };
}

function resolvePets(profile: Profile): Resolved {
  if (profile.has_dog === true) return { status: "needs_confirmation", value: ["Dog"], reason: "We know about your dog. Do you have any other pets?" };
  if (profile.has_dog !== false) return ask();
  // The profile only tracks dogs, so "no dog" doesn't mean "None".
  if (hasText(profile.dog_breed)) return ask(`Your profile says no dog, but also lists a breed (${profile.dog_breed}).`);
  return { status: "needs_confirmation", reason: "Your profile only tells us you don't have a dog. Do you have any other pets?" };
}

function resolveBreed(profile: Profile, options: string[]): Resolved {
  if (!hasText(profile.dog_breed)) return ask();
  const breed = profile.dog_breed.trim().toLowerCase();
  const match = options.find((option) => option.toLowerCase() === breed);
  if (match && profile.has_dog === true) return { status: "direct", value: match };
  // Breed can affect risk, so an unlisted breed is never mapped silently to another option.
  return ask(`Your profile says ${profile.dog_breed}.`);
}

export const harborMapping: CarrierMapping = {
  carrierName: "Harbor",
  eligibility: { birthDateField: "date_of_birth", stateField: "residence_state" },
  exclusiveOptions: { pets: ["None"] },
  fields: {
    applicant_full_name: {
      source: ["first_name", "last_name"],
      resolve: (profile) => (hasText(profile.first_name) && hasText(profile.last_name) ? { status: "needs_confirmation", value: `${profile.first_name.trim()} ${profile.last_name.trim()}`, reason: "Harbor needs your legal name. Please correct this if it's different." } : ask()),
    },
    date_of_birth: {
      source: ["date_of_birth"],
      resolve: (profile) => {
        const value = isoToCarrierDate(profile.date_of_birth);
        return value ? { status: "converted", value } : ask();
      },
    },
    contact_email: {
      source: ["email"],
      resolve: (profile) => (hasText(profile.email) && /^\S+@\S+\.\S+$/.test(profile.email) ? { status: "direct", value: profile.email } : ask()),
    },
    phone: { source: [], resolve: () => ask() },
    residence_state: {
      source: ["state"],
      resolve: (profile) => {
        const value = stateName(profile.state);
        return value ? { status: "converted", value } : ask();
      },
    },
    postal_code: {
      source: ["zip"],
      patternMessage: "Enter a 5-digit ZIP code, like 97205",
      resolve: (profile, field) => (hasText(profile.zip) && new RegExp(field.pattern ?? "").test(profile.zip) ? { status: "direct", value: profile.zip } : ask()),
    },
    contents_coverage: {
      source: ["personal_property_value"],
      resolve: (profile, field) => resolveCoverage(profile, (field.options ?? []) as number[]),
    },
    pets: { source: ["has_dog"], resolve: resolvePets },
    dog_breed: {
      source: ["dog_breed"],
      resolve: (profile, field) => resolveBreed(profile, (field.options ?? []) as string[]),
    },
    claims_last_5_years: {
      source: ["claims_last_3_years"],
      // Looks like claims_last_3_years, but claims from years 4 and 5 are unknown. The 3-year count is only a lower bound.
      resolve: () => ask("Your profile covers 3 years, and Harbor asks about 5."),
      validate: (value, profile) => {
        const known = profile.claims_last_3_years;
        if (typeof known !== "number" || Number(value) >= known) return null;
        return `Your profile shows ${known} ${known === 1 ? "claim" : "claims"} in the last 3 years, so this can't be lower than ${known}`;
      },
    },
    building_has_sprinklers: { source: [], resolve: () => ask() },
  },
};
