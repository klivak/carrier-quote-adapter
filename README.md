# Carrier quote adapter

Connects a standard customer profile to a carrier's JSON quote form. The carrier here is the fictional Harbor Assurance. The page pre-fills what the profile really answers, asks only for the rest, and explains clearly when the carrier can't quote.

## Run it

Needs Node 20+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 and switch between the two sample profiles.

```bash
pnpm test        # engine and mapping tests
pnpm test:e2e    # browser tests, run "pnpm exec playwright install chromium" first
pnpm lint
pnpm typecheck
pnpm build
```

## How it works

Each carrier field gets one status:

- `direct`: same meaning, same format, so it is pre-filled
- `converted`: same meaning, different format, so it is pre-filled
- `needs_confirmation`: the profile suggests something but can't prove it, so the customer checks it
- `ask`: the profile can't answer it, so the customer is asked

The carrier's knowledge lives only in `lib/carriers/harbor/`. The engine in `lib/engine/` and the form in `components/quote/` know nothing about Harbor's fields. The engine is pure and receives today's date as a parameter.

## Assumptions

- **Claims:** 3-year and 5-year counts are different questions, so the field is always asked. The 3-year count is used only as a lower bound.
- **Coverage:** Harbor has fixed amounts. An exact match is pre-filled. Otherwise the customer sees the nearest amounts and picks, because rounding down underinsures and rounding up costs more.
- **Pets:** the profile only knows about dogs. `has_dog: true` suggests `Dog`, and `false` suggests nothing, because no dog doesn't mean no pets. `None` can't be combined with other options.
- **Breed:** matched exactly, ignoring case. An unlisted breed is asked, not mapped to `Other`, because breed can affect risk.
- **Name:** first and last name may not be the legal name, so the customer checks it.
- **Phone:** Harbor gives no format. I require at least 10 digits and send it as typed.
- **Eligibility:** all failed rules are shown together. Customers can correct stale state or birth date details. This means a determined customer could type around the check, and a real system would verify these details on the carrier's side.
- **Age:** uses the customer's local date. A February 29 birthday counts as March 1 in other years.

## With more time

- Check that the ZIP code matches the state
- Save progress and send real requests, with carrier error handling
- Clarify with Harbor how pet breed and exact coverage rules affect the quote
- Validate the profile with a schema at the boundary
- Run an accessibility audit with real screen readers

## With 50 carriers

- One engine, plus a form JSON and a declarative mapping for each carrier
- A shared converter library, so each carrier only states what differs
- Required tests per carrier: every field mapped, edge-case profiles, and an exact-request snapshot
- Schema validation of incoming carrier JSON, so a changed form fails CI and not production
- Versioned carrier definitions, as forms change over time
- Shared questions across carriers, so one answer can serve several quotes
- AI agents can draft a new mapping from a carrier's JSON, while tests and human review decide what ships

## Quality checks

- Unit tests cover the engine and mapping, including a second fake carrier that needs no engine changes.
- Browser tests run on a production build, on desktop and mobile sizes, with axe accessibility checks on every screen.
- Not done: testing with a real screen reader.

## Build log

See `docs/WORKLOG.md` for each step and `docs/SPEC.md` for the full specification.
