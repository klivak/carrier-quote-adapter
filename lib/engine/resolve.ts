import type { CarrierForm, CarrierMapping, FieldResolution, Profile } from "@/lib/types";

export function resolveFields(form: CarrierForm, mapping: CarrierMapping, profile: Profile): FieldResolution[] {
  return form.fields.map((field) => {
    const fieldMapping = mapping.fields[field.key];
    // Failing loudly means a new carrier field can't be skipped by accident.
    if (!fieldMapping) throw new Error(`No mapping for field "${field.key}" of carrier "${form.carrier}"`);
    return { key: field.key, source: fieldMapping.source, ...fieldMapping.resolve(profile, field) };
  });
}

export const initialAnswers = (resolutions: FieldResolution[]) => Object.fromEntries(resolutions.filter((resolution) => resolution.value !== undefined).map((resolution) => [resolution.key, resolution.value]));
