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

## Requirements

- Node.js 18+
- A test command you can run from the repo root (any runner: `vitest`, `jest`,
  `go test`, `pytest`, …)

## Quick start (5 minutes)

No install needed — run it straight from GitHub with `npx`:

```bash
cd ~/your-repo          # any JS/TS or Go repo with tests
npx github:suleman-dawood/mtt-harness init      # install the /mtt skill into your editor(s)
```

`npx` clones, builds, and runs it in one step. Then gate a file:

```bash
npx github:suleman-dawood/mtt-harness guard src/pricing.ts --test-cmd "npx vitest run pricing.test.ts"
```

`mtt init` detects your agentic editors and installs the skill into each:
Claude Code · Cursor · Windsurf · OpenCode · Antigravity · Codex/Copilot
(`AGENTS.md`). Force one with `--editor claude`.

> Prefer a persistent `mtt` command on your PATH? Clone it:
> `git clone https://github.com/suleman-dawood/mtt-harness && cd mtt-harness && npm install && npm run build && npm link`
> (Once published to npm, `npx mtt-harness init` will be the short form.)

### Use it with an agent (main flow)

In Claude Code (or Cursor/etc.):

```
/mtt src/pricing.ts
```

The agent runs the gate, reads the survivors, strengthens the tests, and loops
until the mutation score clears the threshold — no API key, all in-session.

`mtt init` detects your agentic editors and installs the skill into each:
Claude Code · Cursor · Windsurf · OpenCode · Antigravity · Codex/Copilot
(`AGENTS.md`). Force one with `--editor claude`.

### Use it with an agent (main flow)

In Claude Code (or Cursor/etc.):

```
/mtt src/pricing.ts
```

The agent runs the gate, reads the survivors, strengthens the tests, and loops
until the mutation score clears the threshold — no API key, all in-session.

### Use it by hand / in CI

Run the gate yourself. **Scope `--test-cmd` to the file's sibling test** so the
suite isn't re-run in full for every mutant:

```bash
# JS/TS (vitest)
mtt guard src/pricing.ts --test-cmd "npx vitest run pricing.test.ts"

# JS/TS (jest via npm test)
mtt guard src/pricing.ts --test-cmd "npm test -- pricing.test.ts"

# Go
mtt guard pkg/pricing/pricing.go --test-cmd "go test ./pkg/pricing/"
```

Output:

```
src/pricing.ts  (typescript)
  Baseline: green
  Mutation score: 62%  (13/21 killed)  ✗ below threshold 80%
  Survivors (tests did not catch these):
    src/pricing.ts:14  binary-op        `>=` → `>`
    src/pricing.ts:22  remove-statement  removed `applyDiscount(cart)`
```

Exit code is `0` if the score meets `--threshold` (default 80), else `1` — so it
gates a CI job:

```yaml
- run: mtt guard src/pricing.ts --test-cmd "npx vitest run pricing.test.ts" --since origin/main
```

## Options

| Flag | Purpose |
| --- | --- |
| `--test-cmd <cmd>` | Command that runs the tests (required) |
| `--threshold <n>` | Min mutation score to pass (default 80) |
| `--since <ref>` | Only mutate lines changed vs a git ref (fast on big repos) |
| `--max <n>` | Cap mutants evaluated per file |
| `--timeout <ms>` | Per-mutant timeout (default 10000; raise for slow suites) |
| `--mutants <file>` | Merge agent-authored semantic mutants (JSON) |
| `--json` | Machine-readable output |

## Language support

- **Built-in mutation operators:** JavaScript, TypeScript, TSX, Go.
- **Any other language:** the agent proposes mutants (`--mutants`), which the CLI
  verifies by running your tests — so kill/survive stays deterministic.

## Notes

- Run `mtt` from the repo root; the `--test-cmd` runs as-is in that directory.
- `mtt` refuses a red baseline — the suite must pass on unmutated code first.
- Equivalent mutants (no behavior change possible) can be listed in `.mtt-ignore`
  by their reported id so they don't depress the score.

## Status

Early development (v0.1). See the
[design spec](docs/superpowers/specs/2026-07-26-mtt-harness-design.md).

## License

MIT
