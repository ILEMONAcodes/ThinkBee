# agents/

Role files. At session start the agent asks which role it is playing, then reads the matching file along with `AGENTS.md`.

| File | Role | Owns |
| --- | --- | --- |
| `frontend.md` | Frontend developer | `web/` |
| `backend.md` | Backend developer | `api/` |
| `design.md` | Design system guardian | `design/`, UI review |
| `qa.md` | Tester and reviewer | tests, checklists |

**Solo mode**: one agent plays frontend and backend, but works on one side at a time and commits them separately.

**Two-developer mode**: each developer runs their own session. They meet only at `docs/API_SPEC.md`, the OpenAPI schema and `docs/DECISIONS.md`. A change to the contract goes in its own commit and the other side is told in the PR.

**Handoff note** at the end of each session, appended to the PR description or `docs/ROADMAP.md`: what was done, what is next, any assumption taken from `docs/DECISIONS.md`.
