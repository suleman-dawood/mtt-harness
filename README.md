# MTT Harness

**Make your coding agent prove its tests actually catch bugs.**

MTT (Mutation Test Truth) Harness is a cross-editor agent skill + CLI that gates
AI-written tests with **mutation testing**. Your agent proposes mutants and
strengthens tests in-session (no API key); the `mtt` CLI deterministically
applies each mutant, runs the real suite, and reports which ones **survived** —
so the score can't be faked.

> High coverage means the tests *ran* the code. Mutation score means the tests
> would *notice* if the code broke. MTT Harness gates on the second one.

## Why

AI agents write tests that are green, high-coverage, and assert nothing. MTT
Harness breaks the code in small ways and checks the tests actually fail —
turning "looks tested" into "provably tested."

## Install

```bash
npx mtt-harness init
```

Detects your agentic editors and installs the skill into each:
Claude Code · Cursor · Windsurf · OpenCode · Antigravity · Codex/Copilot (`AGENTS.md`).

## Use

**In your editor** (agent-driven, no key):

```
/mtt src/pricing.ts
```

The agent writes/strengthens tests, runs the gate, and iterates until the
mutation score clears the threshold.

**In CI** (headless, deterministic):

```bash
mtt guard src/pricing.ts --test-cmd "npm test" --since origin/main
```

Exits non-zero if the mutation score drops below `--threshold` (default 80).

## Status

Early development. See [design spec](docs/superpowers/specs/2026-07-26-mtt-harness-design.md).

## License

MIT
