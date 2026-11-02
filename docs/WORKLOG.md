# Work log

What we did at each step, how, and how it was checked. Tool: Claude Code.

## 1. Spec first

- What: Wrote the full spec before any code, and a `CLAUDE.md` with project rules for the agent.
- How: Gave the agent the brief. It drafted the mapping table and flagged the fields that only look alike: claims cover 3 years vs 5, coverage has fixed options, and having no dog doesn't mean having no pets.
- Check: The agent traced both sample profiles through the rules. Sam fails on two rules at once (state and age), so the check must return all reasons. Sam turns 21 on 2027-01-20, so the code takes `today` as a parameter to keep tests stable.
