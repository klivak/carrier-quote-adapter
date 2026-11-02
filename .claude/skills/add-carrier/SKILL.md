---
name: add-carrier
description: Use when connecting a new insurance carrier's JSON quote form to the standard customer profile.
---

# Add a carrier

1. Save the carrier's JSON unchanged as `lib/carriers/<carrier>/form.json`.
2. Compare every field with the profile by meaning, not by name. Check time windows, units, formats and fixed options.
3. Write `lib/carriers/<carrier>/mapping.test.ts` first, using `lib/carriers/harbor/mapping.test.ts` as the model.
4. Write `mapping.ts`. Give each field one status: `direct`, `converted`, `needs_confirmation` or `ask`. If a value is a guess, it must not be `direct` or `converted`.
5. Register the carrier in `lib/carriers/index.ts`.
6. Do not change `lib/engine/` or `components/quote/` for carrier-specific behavior. If the engine really lacks a capability, add it in a generic way with its own test.
7. Run the `quality-check` skill and add a `docs/WORKLOG.md` entry.
