---
name: mtt-harness
description: Use when writing, reviewing, or trusting a test suite — especially tests you (the agent) just wrote, or to harden the tests on files a branch changed. Proves tests actually catch bugs via mutation testing, and drives the agent to strengthen weak tests until they pass a mutation-score gate. Trigger on /mtt, /mtt-harness, or /mtt-sweep.
---

# MTT Harness — prove the tests catch bugs

High coverage means the tests *ran* the code. It does **not** mean the tests
would *notice* if the code broke. Mutation testing settles it: deliberately
break the code in small ways ("mutants") and check whether the tests fail. A
test suite that stays green while the code is broken is theater.

The `mtt` CLI is the source of truth — it applies each mutant, runs the real
suite, and reports which mutants **survived** (tests passed anyway). You cannot
judge kill/survive by reading code; you MUST run the CLI.

## When to use

- Right after writing tests for a file.
- Before claiming a file is "tested" or a task is done.
- When asked to `/mtt <file>` or to harden a suite.

## Loop

1. **Identify** the source file and its test file. Make sure the tests are
   green first (`mtt` refuses a red baseline).

2. **Run the gate**, scoping the test command to just the relevant test file so
   it stays fast:

   ```bash
   mtt guard <source-file> --test-cmd "<command that runs only the sibling tests>" --json
   ```

   Examples of a scoped `--test-cmd`:
   - JS/TS: `npm test -- pricing.test.ts` or `npx vitest run pricing.test.ts`
   - Go: `go test ./pkg/pricing/`
   - Python: `pytest tests/test_pricing.py`

3. **Read the survivors** from the JSON. Each survivor is a real gap: the CLI
   broke the code at `file:line` (e.g. `>` → `>=`, or deleted a statement) and
   your tests did not notice.

4. **Strengthen the tests.** For each survivor, add or tighten an assertion
   that would fail under that specific change — test the boundary, assert the
   exact value, cover the deleted behavior. Do not weaken the code to match the
   tests.

5. **Re-run** step 2. Repeat until the score meets the threshold (default 80%).
   Report the before/after score and what the old suite was missing.

## Deeper: agent-proposed mutants (optional)

The built-in operators are syntactic. To probe subtler bugs, propose your own
mutants as JSON and have the CLI verify them (it runs the tests — you can't fake
the result):

```json
[
  { "line": 22, "find": "qty * price", "replace": "qty + price", "operator": "semantic" },
  { "line": 30, "find": "<= limit", "replace": "< limit", "operator": "boundary" }
]
```

```bash
mtt guard <source-file> --test-cmd "..." --mutants proposed.json --json
```

Add semantic mutants that reflect how this code could *actually* be wrong, then
kill them.

## Sweeping changed files (/mtt-sweep)

To harden the tests on everything a branch changed, work through them in
budget-sized sections instead of file-by-file by hand.

1. Get the worklist (the CLI maps each changed file to its tests and gates them):

   ```bash
   mtt sweep --since origin/main --test-cmd "npx vitest run {test}" --budget 15m --json
   ```

   `{test}` is replaced with each file's auto-discovered test file(s). For
   Python use `--test-cmd "python3 -m pytest {test}"`, for Go
   `--test-cmd "go test {test}"`.

2. The JSON `worklist` lists every file below threshold (with its survivors)
   and every file with `status: "no-tests"`. Work through it:
   - **Below threshold:** strengthen the tests to kill each survivor, then
     re-verify that one file with `mtt guard <file> --test-cmd "..."`.
   - **No tests:** write a focused test file first, then gate it.

3. If the run reports `deferred` files (budget hit), run the same `mtt sweep`
   again to pick up the next section.

Only report the branch as hardened once a fresh `mtt sweep` shows no failures.

## Rules

- **Never report a file as tested until `mtt guard` passes the threshold.**
- **Never edit the source to make a mutant unkillable** — strengthen the tests.
- If a survivor is a genuinely equivalent mutant (no behavior change is
  possible), add its id to `.mtt-ignore` and say why. Use this sparingly.
- Keep the test command scoped to the file under test; don't run the whole
  suite per mutant.
