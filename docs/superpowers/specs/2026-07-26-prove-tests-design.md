# prove-tests — Design Spec

**Status:** Draft · **Date:** 2026-07-26 · **Name:** `prove-tests` (provisional)

## 1. Summary

`prove-tests` is a cross-editor agent skill plus a CLI that makes a coding agent
**prove its tests actually catch bugs**, using mutation testing.

The agent (running in the user's already-open editor session) proposes mutants
and writes/strengthens tests. The CLI is the deterministic muscle: it applies
each mutant, runs the real test suite, and reports which mutants **survived**
(i.e. the tests passed even though the code was broken). Because kill/survive is
decided by actually executing tests — never by an LLM's opinion — the agent
cannot fake the score.

It installs with a single `npx prove-tests init` that drops the skill into every
agentic editor present (Claude Code, Cursor, Windsurf, Codex/Copilot via
`AGENTS.md`), aihero-style.

**One-line pitch:** *An installable skill that makes any coding agent prove its
tests catch bugs — mutation-gated, no API key, works in Claude Code / Cursor /
Windsurf / Copilot / Codex.*

## 2. Problem

AI agents (and humans) write tests that look thorough — green, high coverage —
but assert nothing meaningful. Coverage measures lines *executed*, not bugs
*caught*. So teams ship agent code guarded by tests that are theater. Mutation
testing is the known cure (deliberately break the code, check the tests notice),
but no tool delivers it as a **guardrail inside the agent's own loop**, key-free,
across editors. Commercial test-gen tools (Qodo, Diffblue) *generate* tests and
validate via coverage/compile — not an enforced mutation gate wired into the
agent you already use.

## 3. Goals / Non-goals

**Goals**
- Deterministic mutation gate: score cannot be faked by the agent.
- Zero API key in the primary path — the open editor agent does all LLM work.
- Cross-editor install via `npx`, one command.
- Usable on real repos via scoping (per-file / per-diff), not whole-repo scans.
- Doubles as a headless CI gate (exit code).

**Non-goals (v1)**
- Not a test *generator* product (the editor agent already writes tests).
- Not an autonomous headless "fix my tests" agent (that's a later `gen` mode).
- Not a coverage tool; coverage is only used later for test selection.
- No dashboard / web UI. No MCP server.

## 4. Architecture

Three parts, one repo:

1. **`prove-tests` CLI** (TypeScript/Node) — deterministic apply-and-run engine +
   built-in tree-sitter mutation operators. The only trusted component.
2. **`/prove-tests` skill** (markdown) — the loop the agent follows, using its
   in-session LLM. Non-deterministic reasoning lives here, but it can't affect
   the score.
3. **`npx prove-tests init` installer** — detects editors and writes the skill
   into each one's convention; makes the CLI available.

Trust boundary: **the CLI owns kill/survive; the agent owns creativity
(mutant ideas, test writing).**

## 5. The CLI — `prove-tests guard`

```
prove-tests guard <file> \
  --test-cmd "npm test -- pricing.test.ts" \
  [--since <git-ref>] [--mutants extra.json] [--max 50] \
  [--timeout 10000] [--json] [--threshold 80]
```

Pipeline:
1. **Baseline check** — run `--test-cmd` unmutated. If already red, abort:
   *"fix failing tests before gating"* (a broken baseline can't be measured).
2. **Generate mutants** — apply built-in tree-sitter operators to `<file>`;
   optionally merge agent-proposed mutants from `--mutants extra.json`.
3. **Run each mutant** — patch it in, run `--test-cmd` with a per-mutant
   timeout (timeout ⇒ killed), restore the file. Killed = suite failed;
   survived = suite passed.
4. **Report** — mutation score + each survivor as `file:line`, operator, and the
   exact change. Human table by default; `--json` for machine/agent parsing.
5. **Exit code** — `0` if score ≥ `--threshold`, else `1` (the CI gate).

**Built-in mutation operators (v1, JS/TS):** relational (`>`↔`>=`, `<`↔`<=`),
arithmetic (`+`↔`-`, `*`↔`/`), logical (`&&`↔`||`), boolean literal
(`true`↔`false`), negate condition, remove statement, return-value swap.
Structured so new operators / grammars are additive.

## 6. The skill — `/prove-tests`

Markdown workflow. Instructs the agent to:
1. Write or locate tests for the target file.
2. Run `prove-tests guard <file> --test-cmd "<scoped test cmd>"`.
3. Read survivors; for each, add/strengthen an assertion that would catch it.
4. *(Optional, deeper)* propose extra semantic mutants → write `extra.json` →
   `guard --mutants extra.json`.
5. Re-run until score ≥ threshold. **Do not report the task done until it passes.**

The agent does all LLM work in-session (no key). The CLI decides the score.

## 7. The installer — `npx prove-tests init`

Detects editors present and writes the skill into each convention; idempotent;
`--editor <name>` forces one.

| Editor | Target path |
|---|---|
| Claude Code | `.claude/skills/prove-tests/SKILL.md` |
| Cursor | `.cursor/rules/prove-tests.mdc` |
| Windsurf | `.windsurf/rules/prove-tests.md` |
| Codex / Copilot / generic | `AGENTS.md` section |

## 8. Language-agnostic story

- **Agent-proposed mutants work for any language on day one** — the agent reads
  Go/Rust/Python/etc. and proposes mutants the CLI applies as text patches.
- **Built-in tree-sitter operators start with JS/TS in v1** (operators are
  per-grammar work) and expand language-by-language.
- Honest framing: *language-agnostic via agent mutants; deterministic built-in
  operators for JS/TS today, more rolling out.*

## 9. Performance & scaling

Mutation cost is `mutants × test-runtime`; the dominant cost is re-running the
suite per mutant. The tool is built to **never pay the full cost**:

- **Scope by default** — mutate a file (interactive) or a diff
  (`--since <ref>`, CI). Whole-repo interactive runs are **refused** unless an
  explicit `--all --i-mean-it` opt-in is passed; the tool prints an estimate and
  steers to `--since`.
- **Test selection** —
  - *v1:* the agent scopes `--test-cmd` to the sibling test file, so it's
    `mutants × one small test file`, not the full suite.
  - *v2:* per-test coverage map ⇒ run only tests that execute the mutated line.
- **Caps & limits** — `--max` mutants per file; per-mutant `--timeout`.
- **v2:** parallel mutant runs across workers; incremental cache keyed by
  `(file-hash, test-hash)` so unchanged code isn't re-mutated.

Mental model: a linter you point at what you touched, not a blind whole-repo scan.

## 10. Edge cases / error handling

- **Red baseline** → abort with a clear message.
- **Flaky tests** → optional single retry before trusting a kill; documented risk.
- **Equivalent mutants** (behavior-identical, unkillable) → `.prove-tests-ignore`
  list so they don't permanently depress the score.
- **Slow suites** → `--since` + `--max` + timeout.
- **No grammar for the language** → fall back to agent-only mutants, warn.

## 11. Testing strategy (dogfooded)

- **Unit:** each operator (snippet → expected mutant set); score/report logic;
  baseline + timeout handling.
- **Integration:** fixture repo with a deliberately weak suite → asserts expected
  survivors; a strong suite → 100%.
- **Installer:** temp dirs simulating each editor → asserts correct files written;
  idempotency.
- **Dogfood:** run `prove-tests guard` on its own source in CI.

## 12. Tech stack

- TypeScript + Node 20, distributed on npm (`npx prove-tests`).
- Tree-sitter for AST parsing (JS/TS grammar in v1).
- Minimal CLI framework; test command is user-supplied and runner-agnostic.
- No runtime LLM dependency in the primary path.

## 13. v1 scope vs roadmap

**v1 (in):** `guard` (tree-sitter JS/TS + agent-mutant merge), baseline check,
per-mutant timeout, `--since`, `--max`, JSON + human output, exit codes, the
whole-repo refuse-guard; `/prove-tests` skill; `npx init` for the four editor
targets; `.prove-tests-ignore`.

**Later (v2+):** optional `--llm` BYO-key headless mutants; coverage-guided test
selection; parallel runs; incremental cache; more built-in grammars; autonomous
`gen` mode; HTML report.

## 14. Usage walkthrough

**Setup (once):**
```bash
npx prove-tests init
# ✓ Detected: Claude Code, Cursor → skill installed
```

**Daily (agent-driven):** user types `/prove-tests src/pricing.ts`. The agent
runs `guard`, sees e.g. score 43% with survivors (discount deletion, boundary
flip), strengthens the tests targeting those lines, re-runs to 90%, and reports
the delta. User did one thing; the agent + CLI did the rest, key-free.

**CI (headless, no agent):**
```yaml
- run: npx prove-tests guard src/pricing.ts --test-cmd "npm test" --since origin/main
```
Tree-sitter mutants only, deterministic, fails the build if score < threshold.
