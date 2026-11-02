---
name: quality-check
description: Use before committing or pushing a change, to run all project checks and review it against the project rules.
---

# Quality check

Run these from the repo root and report real results:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm test:e2e`, which builds the app and includes axe checks

Then review the change:

- No carrier field names in `lib/engine/` or `components/quote/`, outside tests and `quote-demo.tsx`.
- No guess is pre-filled as a fact.
- Business rules are in `lib/` and have unit tests.
- Code, comments, docs and commit messages are in English.
- For UI changes, look at screenshots on desktop and mobile widths and try the flow by keyboard.
- `docs/WORKLOG.md` records what really happened. Automated checks are not described as screen reader testing.
