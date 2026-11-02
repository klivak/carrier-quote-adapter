export type Profile = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  email: string;
  state: string;
  zip: string;
  personal_property_value: number;
  has_dog: boolean;
  dog_breed: string | null;
  claims_last_3_years: number;
};

export type OptionValue = string | number;

export type FieldDefinition = {
  key: string;
  label: string;
  type: "text" | "date" | "email" | "tel" | "select" | "multiselect" | "number" | "boolean";
  required: boolean;
  format?: string;
  pattern?: string;
  min?: number;
  options?: OptionValue[];
  validation?: { minAge?: number };
  showIf?: { field: string; includes: string };
};

export type CarrierForm = {
  carrier: string;
  product: string;
  fields: FieldDefinition[];
};

export type Answers = Record<string, unknown>;

export type ResolutionStatus = "direct" | "converted" | "needs_confirmation" | "ask";

export type Resolved = {
  status: ResolutionStatus;
  value?: unknown;
  reason?: string;
  suggestions?: OptionValue[];
  optionNotes?: Record<string, string>;
};

export type FieldResolution = Resolved & {
  key: string;
  source: (keyof Profile)[];
};

export type FieldMapping = {
  source: (keyof Profile)[];
  resolve: (profile: Profile, field: FieldDefinition) => Resolved;
  validate?: (value: unknown, profile: Profile) => string | null;
  patternMessage?: string;
};

export type CarrierMapping = {
  carrierName: string;
  fields: Record<string, FieldMapping>;
  exclusiveOptions?: Record<string, OptionValue[]>;
  eligibility: { birthDateField: string; stateField: string };
};

export type IneligibilityReason = {
  field: string;
  code: "under_min_age" | "state_not_covered";
  message: string;
};
