# Work log

What we did at each step, how, and how it was checked. Tool: Claude Code.

## 1. Spec first

- What: Wrote the full spec before any code, and a `CLAUDE.md` with project rules for the agent.
- How: Gave the agent the brief. It drafted the mapping table and flagged the fields that only look alike: claims cover 3 years vs 5, coverage has fixed options, and having no dog doesn't mean having no pets.
- Check: The agent traced both sample profiles through the rules. Sam fails on two rules at once (state and age), so the check must return all reasons. Sam turns 21 on 2027-01-20, so the code takes `today` as a parameter to keep tests stable.

## 2. Project setup

- What: Set up Next.js 16, TypeScript, Tailwind, shadcn/ui, Vitest and Playwright. Renamed the branch to `main`.
- How: Generated the app with `create-next-app` in a temp folder, moved it to the repo root, then added shadcn/ui with its CLI.
- Check: Checked the installed versions. `AGENTS.md` comes from the Next.js scaffold, and `next dev` re-creates it, so it stays in the repo.

## 3. Types, converters and eligibility

- What: Added the shared types, Harbor's JSON unchanged, sample profiles, converters and the eligibility check.
- How: Wrote the tests first. Dates are converted as strings to avoid timezone shifts, and the rules are read from the carrier JSON.
- Check: Tests cover birthday boundaries, leap-day birthdays and Sam failing both rules at once.

## 4. Field resolution and Harbor mapping

- What: Gave each Harbor field a status: `direct`, `converted`, `needs_confirmation` or `ask`.
- How: Wrote the tests first. All Harbor knowledge stays in `lib/carriers/harbor/mapping.ts`, and the engine throws if a form field has no mapping.
- Check: Tests cover both sample profiles and edge cases: coverage extremes, unlisted breeds, dog fields that disagree and bad profile data.

## 5. Validation, visibility and request building

- What: Added validation rules, `showIf` handling, the exclusive `None` rule and the final request builder.
- How: Wrote the tests first. `buildRequest` validates first and throws, so an invalid request can't be built. Hidden fields are left out.
- Check: The profile A request is compared with Harbor's exact format in a test. A failed typecheck showed that `next typegen` must run before `tsc`, so I added it to the script.
