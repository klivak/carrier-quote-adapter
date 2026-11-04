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

## 6. Generic field controls

- What: Added one control component that renders any carrier field from its JSON type.
- How: Few options show as cards, more options as a native select. Dates get a typing mask. Each control has a real label, hints and errors linked with ARIA.
- Check: The component has no Harbor field names. Checked later in the browser tests.

## 7. Quote flow

- What: Added the page: profile switcher, three groups (ask, check, from profile), live request preview, ineligible and success screens.
- How: Fields are grouped by what the customer must do. On a failed submit, the first invalid field gets focus and a summary lists all of them.
- Check: Ran both sample profiles in the browser with Playwright.

## 8. UX pass

- What: Set the theme, darker input borders and muted text for contrast, reduced-motion support and page metadata.
- How: Reviewed screenshots of each state on desktop and mobile.
- Check: Screenshots showed the phone placeholder looked like a filled value, so I removed it. I also added a way back from the success screen.

## 9. Browser tests

- What: Added Playwright tests for Maya's full flow, Sam's refusal and correction, the dog toggle, keyboard use and a 360px layout.
- How: The clock is fixed in tests, so Sam's result won't change after Sam's birthday.
- Check: These tests found a real bug the unit tests missed: after correcting Sam's state or birth date, the field collapsed mid-edit because it was only open while invalid. Fixed by keeping those fields open.

## 10. README and final check

- What: Wrote the README with assumptions, next steps and the 50-carrier approach.
- How: Compared the result with the spec's definition of done.
- Check: Ran tests, lint, typecheck and build, then installed and tested from a clean clone.

## 11. Engine hardening

- What: Added tests for messy input, eligibility boundaries and a second fake carrier.
- How: Wrote the tests first and watched them fail. Fixed spaces counting as answers, `0x10` and `1e2` passing as numbers, very long phone numbers and birth years before 1900.
- Check: The fake carrier builds a request with no engine changes, which backs up the 50-carrier claim with a test.

## 12. Accessibility and stability

- What: Added automated axe checks on all four screens, proper radio group roles, focus handling between screens, a clipboard failure message and an error page.
- How: Browser tests now run on a production build, not the dev server.
- Check: Axe found one real problem: the error summary links were too small a target (WCAG 2.2). Fixed. This is automated checking only, and it has not been tested with a real screen reader.

## 13. Performance

- What: The first HTML now contains the real form, not a loading placeholder. Removed an unused font.
- How: The date is only known in the browser, so the static HTML uses a fixed date, and React switches to the real date right after hydration. The default profile's result doesn't depend on the exact day.
- Check: Lighthouse on a local production build, mobile preset: performance 84 to 95, LCP 3.3 s to 0.8 s, CLS 0.008, with accessibility, best practices and SEO at 100. Desktop preset: performance 100. These are single local runs.

## 14. Visual polish and CI

- What: Added a progress bar, "Closest" labels on coverage options, "Complete" marks on groups and a "Done" button when editing.
- How: Reviewed screenshots after the change. They showed "Assurance" hard-coded in the generic form, so the full carrier name moved into the Harbor mapping.
- Check: Unit tests, lint, typecheck, and browser tests repeated twice. One earlier browser test run failed because the local server process crashed on start (exit code 3221226505). It did not happen again, and the cause is unknown.

## 15. Move derived state into the engine

- What: Moved grouping, progress and the remaining count out of the React component, into a pure `deriveQuoteState`. Moved display helpers out too, and shared one email check.
- How: Reviewed the structure: this logic only had browser coverage because it lived in the UI.
- Check: Added unit tests for groups, progress, hidden fields and the date mask. 81 unit tests pass.

## 16. Split the UI

- What: Replaced one large component with a state hook, a screen chooser and one file per screen. Split field controls into choice and input fields. Updated the spec with the structure and dependency rules.
- How: A refactor with no intended behavior change, so the existing browser tests are the safety net.
- Check: Unit tests, browser tests, axe, lint and typecheck pass. A search confirms no Harbor names in `components/` or `lib/engine/` outside the demo entry and tests.
- Slip: A failed shell command once left a broken local commit. A typecheck caught it, and I redid the commit before anything was pushed.

## 17. More tests and project skills

- What: Added browser tests for full flows and edge cases, Harbor invariants checked across 12 profile variants, and two project skills: `add-carrier` and `quality-check`.
- How: Used the React best practices and accessibility guides as checklists. The accessibility guide led to the reduced motion, focus and zoom-width tests.
- Check: A new test found a real bug: an error appearing on blur moved the page during a mouse press, so the first click on an option was lost. Errors now wait until the press ends. Code review was not run in this step.

## 18. Visual review

- What: Reviewed every screen at phone, tablet and desktop widths with a small Playwright script, `e2e/visual-review.mjs`.
- How: Compared screenshots and fixed what looked wrong. The fields to correct were at the bottom of the page after pressing Fix, so that group now comes first. Also aligned text in option cards, kept three options on one row on phones, shortened the number error, made the Done button clearer and tidied the demo bar on phones.
- Check: Added browser tests for the new order and the three-option row, then ran all checks.

## 19. CI

- What: Added a GitHub Actions workflow for lint, typecheck, unit tests, build and browser tests.
- How: Added in its own commit, because pushing workflow files needs an extra token permission.

## 20. Docs sync

- What: Brought the docs in line with the code. Added steps 17-19 to the spec's delivery plan, updated the test description, and added a short "How AI was used" section to the README.
- How: Read the spec, worklog and README side by side. The spec's plan had no entry for steps 17-19, which broke the rule that new steps are added there.
- Check: Ran unit tests, browser tests, lint, typecheck and build before this commit: all pass. The 3 skipped browser tests are the keyboard-only tests, which skip the mobile project on purpose.

## 21. Push and CI

- What: Pushed `main` to the public GitHub repo and confirmed CI passes.
- How: The first push was rejected because the HTTPS token had no `workflow` scope, which is needed for `.github/workflows/ci.yml`. Pushing over SSH worked.
- Check: The GitHub Actions run passed all steps: lint, typecheck, unit tests, build and browser tests. GitHub only warned that Node 20 actions are deprecated.
