# Carrier quote adapter - full specification

## 1. Goal

Connect a standard customer profile to the renters insurance quote form of a fictional carrier, Harbor Assurance. The carrier supplies its form as a JSON definition, with its own field names, formats, options and rules.

The customer should see a form that already knows what the profile can honestly answer, asks only for the rest, and explains clearly when the carrier can't quote.

### Required deliverables

1. An adapter that takes a customer profile and produces Harbor's quote request in Harbor's exact format: field keys, date format and option values.
2. A Next.js page that renders Harbor's form from its JSON, pre-fills everything the profile already answers, and only asks for what's missing.
3. An eligibility check that shows clearly why Harbor can't quote a customer, instead of submitting.
4. A short README: assumptions, what I'd do with more time, and how the approach works with 50 carriers.
5. A video of 5 minutes or less, camera on: the code and mapping decisions, then the AI workflow and how its output was checked.

### Out of scope

Backend, database, auth, real carrier API calls, saving progress, more carriers.

## 2. Principles

1. **Never present a guess as a fact.** A pre-filled value must mean what the carrier's field means.
2. **The form comes from JSON.** The renderer has no Harbor field names in it.
3. **Carrier knowledge lives in one folder.** A new carrier means a new form JSON and mapping, not engine changes.
4. **The core is pure.** Mapping, eligibility, validation and request building are plain functions without React, so they are easy to test.
5. **The customer's time matters.** Ask the fewest questions, in the most useful order, and explain why when asking looks odd.

## 3. Input data

### 3.1 Standard profile

```json
{
  "first_name": "string",
  "last_name": "string",
  "date_of_birth": "YYYY-MM-DD",
  "email": "string",
  "state": "two-letter code, e.g. CA",
  "zip": "5 digits",
  "personal_property_value": "number, USD",
  "has_dog": "boolean",
  "dog_breed": "string or null",
  "claims_last_3_years": "number"
}
```

### 3.2 Sample profiles

```json
{ "first_name": "Maya", "last_name": "Torres", "date_of_birth": "1994-03-12", "email": "maya@example.com", "state": "OR", "zip": "97205", "personal_property_value": 32000, "has_dog": true, "dog_breed": "Labrador", "claims_last_3_years": 0 }
```

```json
{ "first_name": "Sam", "last_name": "Lee", "date_of_birth": "2006-01-20", "email": "sam@example.com", "state": "NV", "zip": "89501", "personal_property_value": 12000, "has_dog": false, "dog_breed": null, "claims_last_3_years": 1 }
```

### 3.3 Harbor form

Stored unchanged as `lib/carriers/harbor/form.json`.

```json
{
  "carrier": "harbor",
  "product": "renters",
  "fields": [
    { "key": "applicant_full_name", "label": "Full legal name", "type": "text", "required": true },
    { "key": "date_of_birth", "label": "Birth date", "type": "date", "format": "MM/DD/YYYY", "required": true, "validation": { "minAge": 21 } },
    { "key": "contact_email", "label": "Email address", "type": "email", "required": true },
    { "key": "phone", "label": "Mobile number", "type": "tel", "required": true },
    { "key": "residence_state", "label": "State of residence", "type": "select", "options": ["California", "Oregon", "Washington", "Arizona"], "required": true },
    { "key": "postal_code", "label": "Postal code", "type": "text", "pattern": "^\\d{5}(-\\d{4})?$", "required": true },
    { "key": "contents_coverage", "label": "Contents coverage amount (USD)", "type": "select", "options": [10000, 25000, 50000, 75000], "required": true },
    { "key": "pets", "label": "Pets in the home", "type": "multiselect", "options": ["None", "Dog", "Cat", "Other"], "required": true },
    { "key": "dog_breed", "label": "Dog breed", "type": "select", "options": ["Labrador", "Pit Bull", "Rottweiler", "Other"], "required": true, "showIf": { "field": "pets", "includes": "Dog" } },
    { "key": "claims_last_5_years", "label": "Number of claims in the past 5 years", "type": "number", "min": 0, "required": true },
    { "key": "building_has_sprinklers", "label": "Does your building have sprinklers?", "type": "boolean", "required": false }
  ]
}
```

## 4. Tech stack

- Next.js (App Router) with TypeScript in strict mode, using the current stable version
- Tailwind CSS and shadcn/ui
- Vitest for the core, plus Playwright for one end-to-end run per sample profile
- pnpm
- No Docker: there is no backend or database, and `pnpm dev` is the shortest way for a reviewer to run it

## 5. Project structure

```
app/page.tsx                         Page entry
app/error.tsx                        Error page
components/quote/quote-demo.tsx      Sample profile switcher and today's date
components/quote/quote-flow.tsx      Chooses the screen: form, refusal or success
components/quote/use-quote-form.ts   Customer state and actions
components/quote/quote-form.tsx      The form screen
components/quote/field-control.tsx   Renders any carrier field from its JSON type
components/quote/ineligible-screen.tsx
components/quote/success-screen.tsx
lib/types.ts                         Profile, form definition, field resolution types
lib/profiles.ts                      Sample profiles
lib/engine/resolve.ts                Profile + form + mapping -> field resolutions
lib/engine/quote-state.ts            Answers -> groups, progress, errors, refusal reasons
lib/engine/visibility.ts             Evaluates showIf
lib/engine/validate.ts               Required, pattern, min, option and custom rules
lib/engine/eligibility.ts            Returns every reason a carrier can't quote
lib/engine/build-request.ts          Final answers -> carrier request
lib/engine/converters.ts             Shared converters: dates, state names, age
lib/engine/display.ts                Value formatting and the date mask
lib/carriers/harbor/form.json        Carrier form, unchanged
lib/carriers/harbor/mapping.ts       Harbor mapping
lib/carriers/index.ts                Carrier registry
e2e/                                 Browser and accessibility tests
docs/SPEC.md                         This file
docs/WORKLOG.md                      Step-by-step build log
```

### Dependency rules

- `lib/carriers` may use `lib/engine`. `lib/engine` never imports a carrier, except in tests.
- `lib/engine` has no React and no hidden clock.
- `components/quote` shows state and holds interaction state; business rules stay in `lib/`.
- Only `quote-demo.tsx` knows which carrier and profiles are used.

## 6. Core model

Each form field gets one resolution:

```ts
type ResolutionStatus = "direct" | "converted" | "needs_confirmation" | "ask";

type FieldResolution = {
  key: string;
  status: ResolutionStatus;
  value?: unknown;          // pre-filled value, absent when nothing can be assumed
  reason?: string;          // shown to the customer when a choice needs explaining
  source?: string[];        // profile fields used
  suggestions?: unknown[];  // for example the two nearest coverage options
};
```

| Status | Meaning | UI |
| --- | --- | --- |
| `direct` | Same meaning, same format | Pre-filled, can be edited |
| `converted` | Same meaning, different format | Pre-filled, can be edited |
| `needs_confirmation` | The profile suggests an answer but can't prove it | Asked, with the suggestion and reason visible |
| `ask` | The profile can't answer it | Asked, empty |

A mapping is declarative where possible: each carrier field names its source fields and a resolver, built from shared helpers. Every form field must have a mapping entry, and a test enforces this, so a new carrier field can't be missed silently.

## 7. Harbor field mapping

| Harbor field | Source | Status | Rule | Why |
| --- | --- | --- | --- | --- |
| `applicant_full_name` | `first_name`, `last_name` | `needs_confirmation` | Join with one space | Harbor asks for a legal name; the profile doesn't say its name is the legal one |
| `date_of_birth` | `date_of_birth` | `converted` | `YYYY-MM-DD` to `MM/DD/YYYY` by splitting the string | `new Date()` can shift the date by timezone |
| `contact_email` | `email` | `direct` | Copy | Same meaning |
| `phone` | none | `ask` | Empty | Not in the profile |
| `residence_state` | `state` | `converted` | Code to full name through a table of all US states | A state outside Harbor's options is an eligibility failure, not a blank field |
| `postal_code` | `zip` | `direct` | Copy, check the pattern | Same meaning |
| `contents_coverage` | `personal_property_value` | Exact option: `direct`. Otherwise: `needs_confirmation` with no value | Offer the nearest option below and above | Coverage is a financial choice: rounding down underinsures, rounding up costs more |
| `pets` | `has_dog` | `needs_confirmation` | `true`: suggest `Dog`. `false`: suggest nothing | The profile only knows about dogs. No dog doesn't mean no cat, so `None` can't be assumed |
| `dog_breed` | `dog_breed` | Exact option, ignoring case: `direct`. Otherwise: `ask` | Keep the original breed in the hint | Never map to `Other` or to a listed breed silently: breed can affect risk |
| `claims_last_5_years` | `claims_last_3_years` | `ask` | Empty, with the 3-year count as a lower bound | It looks alike but covers a longer window. Claims in years 4 and 5 are unknown |
| `building_has_sprinklers` | none | `ask` | Optional, three states: yes, no, unanswered | Not in the profile, and must not block submit |

### Multiselect rule for `pets`

`None` is exclusive: selecting it clears the others, and selecting another option clears `None`. Generic JSON can't express this, so it is a carrier rule in the Harbor mapping, not hard-coded in the renderer. Treating an option named `None` as exclusive is the assumption, and it is listed in the README.

### Dependent field rule for `dog_breed`

If `pets` no longer includes `Dog`, the field hides, its error clears and it isn't sent. The answer stays in memory, so toggling `Dog` back restores it.

## 8. Eligibility

```ts
type IneligibilityReason = {
  field: string;
  code: "under_min_age" | "state_not_covered";
  message: string;
};
```

- Return **all** failed rules, not just the first.
- Read the rules from the carrier's JSON: `minAge` from validation and states from options. Mapping and form stay in agreement.
- `today` is a parameter. No hidden clock in the engine.
- Age uses the calendar birthday, including leap-day birthdays, not days divided by 365.
- Run the check on load and again before submit, because the customer can edit date of birth and state.
- Messages are plain and specific: "Harbor doesn't offer renters insurance in Nevada. It covers California, Oregon, Washington and Arizona." and "Harbor requires applicants to be at least 21. You'll be eligible on January 20, 2027."

Editing state or birth date to pass the check is allowed because the customer may be correcting stale data. The final request always comes from what passes the check at submit.

## 9. Validation

Runs on blur for a touched field and on submit for all visible fields.

| Rule | Source | Message example |
| --- | --- | --- |
| Required | Form JSON | "Enter your mobile number" |
| Pattern | Form JSON | "Enter a 5-digit ZIP code, like 97205" |
| Option membership | Form JSON | "Choose one of the listed amounts" |
| Min | Form JSON | "Must be 0 or more" |
| Integer | `claims_last_5_years` | "Enter a whole number" |
| Email format | Type `email` | "Enter an email like name@example.com" |
| Valid date | Type `date` | "Enter a real date as MM/DD/YYYY" |
| Phone | Type `tel` | At least 10 digits; Harbor defines no format, so the value is sent as entered |
| 5-year count at least the 3-year count | Mapping | "Your profile shows 1 claim in the last 3 years, so this can't be lower than 1" |

Custom field-level rules belong to the mapping. Errors describe how to fix the problem and never blame the customer.

## 10. Request building

- Keys and order follow the carrier JSON.
- `contents_coverage` is a number, `claims_last_5_years` is a number, `pets` is an array and `date_of_birth` is `MM/DD/YYYY`.
- Hidden fields and an unanswered optional sprinkler field are omitted.
- The function throws if given answers that fail validation, so a bad request can't be built.

Profile A, with phone `503-555-0100`, coverage 50000, claims 0, pets confirmed and sprinklers unanswered:

```json
{
  "applicant_full_name": "Maya Torres",
  "date_of_birth": "03/12/1994",
  "contact_email": "maya@example.com",
  "phone": "503-555-0100",
  "residence_state": "Oregon",
  "postal_code": "97205",
  "contents_coverage": 50000,
  "pets": ["Dog"],
  "dog_breed": "Labrador",
  "claims_last_5_years": 0
}
```

## 11. UI and UX

### Layout

- One column on mobile. On desktop, the form plus a sticky side panel with progress and the live Harbor request preview.
- Profile switcher at the top, clearly labelled as demo data. Switching resets the form.
- Quiet, trustworthy look: neutral palette, one accent color, comfortable spacing. Nothing decorative.

### Order

Fields are grouped by what the customer must do, keeping JSON order inside each group:

1. **A few questions for you** - `ask` fields
2. **Please check these** - `needs_confirmation` fields
3. **From your profile** - `direct` and `converted` fields, shown as a compact read-only list with an Edit action per field

The header says what's left, for example "4 questions left. We filled in the rest from your profile."

### Controls

| Field type | Control |
| --- | --- |
| `select` with 5 or fewer options | Radio cards, so options are visible in one look |
| `select` with more options | Native select |
| `multiselect` | Checkbox chips |
| `boolean` | Yes and No buttons, with "Not sure" available if optional |
| `date` | Text with MM/DD/YYYY mask, as the carrier asks for it |
| `number` | Numeric input with `inputMode`, not a spinner |
| `tel` / `email` | Native types with `autocomplete`, so mobile shows the right keyboard |

### Explaining the odd questions

- Coverage: "Your belongings are valued at $32,000. Harbor offers $25,000 or $50,000 nearby." $25,000 notes that it's $7,000 under the value. Nothing is selected for the customer.
- Claims: "Your profile covers 3 years, and Harbor asks about 5."
- Pets: "We know about your dog. Do you have any other pets?"

### States

- **Ineligible:** replaces the form. A clear heading, every reason as its own item, no submit button, and a "Fix my details" action for state and birth date.
- **Validation errors:** inline under the field, and on submit, focus moves to the first error with a summary at the top.
- **Success:** a confirmation summary with the exact request JSON and a copy button. No real API call happens, and the screen says so.

### Accessibility

Real labels, `fieldset` and `legend` for groups, `aria-describedby` for hints and errors, `aria-live` for progress and errors, full keyboard use, visible focus, WCAG AA contrast, 44px touch targets, no information by color alone, and `prefers-reduced-motion` respected.

## 12. Expected behavior

Dates assume `today` = 2026-11-05.

### Profile A: Maya Torres, eligible

| Group | Fields |
| --- | --- |
| Ask | Phone, 5-year claims, sprinklers (optional) |
| Check | Name (suggested), coverage (25k or 50k, nothing selected), pets (`Dog` suggested) |
| From profile | Birth date 03/12/1994, email, Oregon, 97205, Labrador |

### Profile B: Sam Lee, not eligible

Shows two reasons: Nevada isn't covered, and age 20 is below 21. Sam turns 21 on 2027-01-20.

## 13. Edge cases

| Case | Behavior |
| --- | --- |
| Coverage above 75,000 | Offer 75,000 and note it is below the value |
| Coverage below 10,000 | Offer 10,000 |
| Coverage equals an option | Pre-fill as `direct` |
| `has_dog: true`, breed null | Suggest `Dog`, ask breed |
| Breed not listed, such as Beagle | Ask, showing "Your profile says Beagle" |
| `has_dog: false`, breed set | Inconsistent data: no suggestion, ask |
| Birthday today or tomorrow | Exact-day age logic; covered by tests |
| Leap-day birthday | Birthday counted as March 1 in non-leap years |
| Invalid or missing profile value | Treated as `ask`, never crashes |
| Unknown state code | Field is asked, no false eligibility message |
| ZIP+4 entered | Valid by Harbor's pattern |
| State and ZIP disagree | Not checked; listed in README as a future improvement |

## 14. Tests

Unit (Vitest):

- Date conversion has no timezone shift
- State code conversion, including a state outside Harbor's list
- Age the day before, on and after the birthday, plus a leap-day birthday
- Profile B returns both reasons
- 32000 and 12000 offer the two nearest options with nothing selected; an exact value pre-fills; extremes offer one option
- `has_dog: false` doesn't produce `None`
- `None` is exclusive
- Breed exact match, case difference, unlisted and null
- 5-year claims are never pre-filled, and a value under the 3-year count fails
- Hidden `dog_breed` is omitted, and sprinklers are optional
- Every field in the form has a mapping entry
- Profile A's request equals the JSON in section 10

End-to-end (Playwright): complete Maya's flow to the request output; see both reasons for Sam with no submit button.

## 15. README contents

Run instructions, assumptions (sections 7 to 9), trade-offs, what I'd do with more time, and the 50-carrier approach:

- One engine, with a form JSON and mapping for each carrier
- Shared converter library, so each carrier only states what differs
- Coverage test per carrier: every field mapped, fixtures for edge profiles, and an exact-request snapshot
- Schema validation of incoming carrier JSON, so a changed form fails CI rather than production
- Versioned carrier definitions, as carriers change forms over time
- Customer-facing question reuse across carriers, so one answer can serve several quotes
- AI agents can draft a new mapping from a carrier's JSON, while tests and human review decide what ships

## 16. Delivery plan

Each step is one commit, with a `docs/WORKLOG.md` entry in the same commit.

1. Project setup: Next.js, TypeScript, Tailwind, shadcn/ui, Vitest
2. Types, carrier JSON and sample profiles
3. Converters and eligibility, with tests
4. Field resolution and Harbor mapping, with tests
5. Validation, visibility and request building, with tests
6. Generic form renderer and field controls
7. Quote flow: groups, pre-fill, progress, eligibility, success
8. UX and accessibility pass, checked in a real browser on desktop and mobile
9. End-to-end tests
10. README, final review against this spec

Follow-up steps after the first version:

11. Engine hardening, with a second fake carrier in tests
12. Accessibility and stability: axe checks, focus handling, error page
13. Performance: prerender the real form, measure with Lighthouse
14. Visual polish and CI
15. Move derived state into the engine
16. Split the UI: a hook for state, one file per screen
17. Push and confirm CI passes

## 17. Definition of done

- `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck` and `pnpm build` all pass, locally and in CI
- Both sample profiles behave as section 12 says, checked in a browser
- No Harbor field names in the renderer or generic engine
- Keyboard-only run works; layout holds at 360px width
- README and WORKLOG are complete and the author can explain every decision
- Repo is public and a clean clone runs by following the README
