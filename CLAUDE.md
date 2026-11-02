# Carrier quote adapter

Practice take-home: connect a standard customer profile to a fictional carrier's JSON quote form. `docs/SPEC.md` is the source of truth; read it before changing behavior. If code and spec need to differ, ask first, then update the spec in the same commit.

## Rules

- Everything in this repo is in English: code, comments, docs and commits.
- Never pre-fill a guess as a fact. Fields that look alike but differ in meaning must be asked or confirmed (SPEC section 7).
- Carrier-specific knowledge lives only in `lib/carriers/<carrier>/`. The renderer and `lib/engine/` must not mention Harbor field names.
- Engine functions are pure and take `today` as a parameter. No React and no hidden clock in `lib/engine/`.
- Do not edit `lib/carriers/harbor/form.json`; it is the carrier's input.
- Use the current stable versions. Check the installed Next.js docs in `node_modules/next/dist/docs/` before using an API you aren't sure of.
- Business rules go in `lib/`, with unit tests. Components show state and handle interaction (SPEC section 5).
- Do not add a backend, database, auth or Docker. They are out of scope.

## Workflow

- Follow SPEC section 16 one step at a time, and add new steps there. Write engine tests before the code.
- One step, one commit, with a short plain commit message.
- In the same commit, add a `docs/WORKLOG.md` entry: what we did, how, and how it was checked. Keep it short and record only what really happened, including mistakes the review caught.
- Before committing, run `pnpm test`, `pnpm lint` and `pnpm typecheck`. Check UI changes in a real browser, on desktop and mobile widths.

## Commands

`pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:e2e`.

## Writing style

Plain short English. One line per paragraph, no hard wrapping. Use a short dash "-" and never a long one.
