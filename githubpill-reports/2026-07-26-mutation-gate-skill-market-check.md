# Market Check — Mutation-Gated Agent Test Skill (N1, cross-editor skill+CLI)

**Sharpened idea:** A cross-editor Agent Skill + thin CLI that makes your coding agent's generated tests pass a **mutation-score gate** — the agent iterates until its tests actually kill mutants. Installed via `npx`, works in Claude Code / Cursor / Windsurf / Copilot / Codex. Local, open-source, no MCP, no dashboard.

## OSS (GitHub): 🟢 open
Broad discovery noise-dominated (awesome-lists, general frameworks). Nearest prior art is a **stale mutation *engine*** ([codeintegrity-ai/mutahunter](https://github.com/codeintegrity-ai/mutahunter), last push 2025-04, no test-gen, no agent loop) — a dependency, not a competitor. No OSS product implements the enforced mutation-gate-in-agent-loop.

## Closed-source / SaaS: 🟡 concept mainstream, packaging open
**The concept is NOT novel in 2026** — "pair AI test-gen with mutation testing to verify tests catch bugs" appears in buyer's guides and trend roundups ([laracopilot](https://laracopilot.com/blog/ai-test-generation-2026/), [motomtech quality gates](https://www.motomtech.com/blog-post/ai-generated-code-quality-gates/), [Augment guide](https://www.augmentcode.com/guides/mutation-testing-ai-generated-code)). The "40–55% → 70–85% mutation score" framing is commodity talking point.

| Product | Does | Not your idea because |
|---|---|---|
| [Qodo](https://www.qodo.ai) (Gen/Cover) | Leading AI unit-test generator | Validates via coverage+compile, NOT enforced mutation gate; standalone IDE tool, not a guardrail on your agent |
| [Diffblue Cover](https://www.diffblue.com/agents/) | Autonomous JUnit/Python test gen | Static-analysis (not LLM), JVM-first, validate ≠ mutation score |
| TestSprite | Autonomous testing agent + cloud sandboxes | Full-service SaaS replacement |

## Surviving angle (what nobody ships)
1. Guardrail on the agent you already use (not a replacement generator).
2. Mutation score as the enforced iterate-until-pass gate.
3. Cross-editor skill + CLI via `npx` (not a proprietary plugin/platform).
4. Local + open-source.

## Verdict
- **Startup idea:** partly taken / commoditizing — Qodo could ship this feature fast. Don't bet a company on it.
- **Portfolio project for the 1QLabs role:** 🟢 **open and ideal** — no one ships this packaging; market validation of the concept is a *plus*, and it hits every JD line (engineering depth + agentic fluency, skills, guardrails, cross-editor breadth).
