# GithubPill Deep-Search — Mutation-Tested Test Harness (N1)

**Verdict: 🟢 Open product slot** — concept is research-validated, but no OSS *product* implements the agent→generate→mutation-gate loop.

**Sharpened idea:** An agent generates code + tests from a typed spec; a validation pipeline uses **mutation testing** as the enforced gate — the agent must iterate until its tests actually kill mutants (not just hit coverage). Next.js/tRPC UI, MCP server, audit log.

## Cloned & inspected

| Repo | Stars | Last push | Finding |
|------|------:|-----------|---------|
| [codeintegrity-ai/mutahunter](https://github.com/codeintegrity-ai/mutahunter) | 298 | 2025-04-17 (**stale >15mo**, AGPL-3.0) | **Inverse of the idea.** LLM mutation *engine* that scores *existing* tests. Source has only a `run` subcommand (`src/mutahunter/main.py:20`) — no test generation, no agent orchestration, no spec→gate. **A dependency, not a competitor.** |
| [ZJU-ACES-ISE/ChatUniTest](https://github.com/ZJU-ACES-ISE/ChatUniTest) | 173 | 2025-07-25 | Academic LLM unit-test generator. No mutation gate, no agent-harness framing. |

Research (credibility, not competition): Meta ACH, MUTGEN (arxiv 2506.02954), "coverage ≠ bug-detection" literature, [iSEngLab/AwesomeLLM4UT](https://github.com/iSEngLab/AwesomeLLM4UT).

## Your angle
- The enforced **mutation-score gate on agent-generated tests** is the empty slot. mutahunter/Stryker/mutmut are engines you consume.
- Killer demo: 95% coverage, 0% mutation score → gate rejects → agent iterates to a real suite.
- Maps 1:1 to the JD (contractual spec, orchestration, validation pipeline/guardrails, MCP, audit).

## Verdict
🟢 — Build it. No OSS product owns this; the research backing is an interview asset.
