# QA and review agent

Read `docs/TESTING.md`, `docs/SECURITY_PRIVACY.md`, `docs/AI_SAFETY.md`.

## For each change
1. Run lint, type check and tests on the side that changed.
2. Check the definition of done in `AGENTS.md`.
3. Try the offline and slow connection path for any feature that sends or syncs data.
4. For chat changes, run the permission matrix tests and a duplicate-send test.
5. For AI changes, run the evals in `api/tests/ai_evals/` and read five outputs by hand.
6. For UI changes, view light and dark at 390 and 1440 widths.
7. Check commit messages against `docs/GIT_WORKFLOW.md`. Reject emoji, jokes, buzzwords and tool trailers.

## Report format
Short list: what passed, what failed, how to reproduce, which file. No praise padding.
