import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { num, str, type ParsedArgs } from "../args";
import { detectLanguage } from "../engine/grammars";
import { runSweep, type SweepResult } from "../engine/sweep";
import { loadIgnore } from "../ignore";

const USAGE = `Usage: mtt sweep --since <ref> --test-cmd "<cmd with {test}>" [options]

Gates every changed source file against its auto-discovered tests.

Options:
  --since <ref>        Diff against this git ref (required)
  --test-cmd <tmpl>    Test command; {test} is replaced with the mapped test file(s)
  --budget <dur>       Stop starting new files after this (e.g. 15m, 90s)
  --max-files <n>      Gate at most n files this run
  --threshold <n>      Min mutation score to pass (default 80)
  --timeout <ms>       Per-mutant timeout (default 10000)
  --max <n>            Cap mutants per file
  --json               Emit a machine-readable worklist

Example:
  mtt sweep --since origin/main --test-cmd "npx vitest run {test}"
  mtt sweep --since origin/main --test-cmd "python3 -m pytest {test}" --budget 15m`;

/** Parse durations like `15m`, `90s`, or a bare number (seconds). */
export function parseDuration(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const m = /^(\d+)(s|m|h)?$/.exec(v.trim());
  if (!m) return undefined;
  const n = Number(m[1]);
  return m[2] === "m" ? n * 60 : m[2] === "h" ? n * 3600 : n;
}

function changedFiles(ref: string, cwd: string): string[] {
  // --relative yields paths relative to cwd and scopes to the cwd subtree, so
  // this works when the project sits in a subdirectory of the git repo.
  const out = execFileSync("git", ["diff", "--name-only", "--relative", ref], {
    cwd,
    encoding: "utf8",
  });
  return out
    .split("\n")
    .filter(Boolean)
    .filter((f) => detectLanguage(f) !== null)
    .filter((f) => existsSync(f));
}

export async function sweepCommand(args: ParsedArgs): Promise<number> {
  const since = str(args.flags.since);
  const template = str(args.flags["test-cmd"]);
  const json = args.flags.json === true;

  if (!since || !template) {
    process.stderr.write(USAGE + "\n");
    return 2;
  }
  if (!template.includes("{test}")) {
    process.stderr.write(`error: --test-cmd must contain the {test} placeholder\n`);
    return 2;
  }

  let files: string[];
  try {
    files = changedFiles(since, process.cwd());
  } catch (err) {
    process.stderr.write(`error: git diff failed: ${(err as Error).message}\n`);
    return 2;
  }
  if (files.length === 0) {
    process.stdout.write(
      json ? `{"summary":{"gated":0},"worklist":[]}\n` : `No changed source files vs ${since}.\n`,
    );
    return 0;
  }

  const result = await runSweep({
    files,
    root: process.cwd(),
    testCmdTemplate: template,
    threshold: num(args.flags.threshold, 80),
    timeoutMs: num(args.flags.timeout, 10000),
    maxMutants: args.flags.max !== undefined ? num(args.flags.max, 0) : undefined,
    budgetSeconds: parseDuration(str(args.flags.budget)),
    maxFiles:
      args.flags["max-files"] !== undefined
        ? num(args.flags["max-files"], 0)
        : undefined,
    ignore: loadIgnore(),
    onFile: json
      ? undefined
      : (f, i, n) => process.stderr.write(`  [${i + 1}/${n}] gating ${f}\n`),
  });

  process.stdout.write(
    (json ? formatSweepJson(result) : formatSweepHuman(result)) + "\n",
  );
  return result.failed > 0 ? 1 : 0;
}

function formatSweepJson(r: SweepResult): string {
  return JSON.stringify(
    {
      summary: {
        gated: r.gated,
        passed: r.passed,
        failed: r.failed,
        noTests: r.noTests,
        deferred: r.deferred,
        elapsedSeconds: r.elapsedSeconds,
      },
      worklist: r.results
        .filter(
          (x) =>
            x.status === "no-tests" ||
            (x.status === "gated" && !x.report!.passed),
        )
        .map((x) => ({
          file: x.file,
          status: x.status,
          tests: x.tests,
          score: x.report?.score ?? null,
          survivors:
            x.report?.survived.map((m) => ({
              id: m.id,
              line: m.line,
              operator: m.operator,
              original: m.original,
              replacement: m.replacement,
            })) ?? [],
        })),
      deferred: r.results.filter((x) => x.status === "deferred").map((x) => x.file),
    },
    null,
    2,
  );
}

function formatSweepHuman(r: SweepResult): string {
  const lines: string[] = [];
  for (const x of r.results) {
    if (x.status === "gated") {
      const rep = x.report!;
      lines.push(
        `  ${rep.passed ? "✓" : "✗"} ${x.file}  ${rep.score}%` +
          (rep.passed ? "" : `  (${rep.survived.length} survivors)`),
      );
    } else if (x.status === "no-tests") {
      lines.push(`  ⚠ ${x.file}  no tests found`);
    } else if (x.status === "deferred") {
      lines.push(`  ⏭ ${x.file}  deferred (budget)`);
    } else {
      lines.push(`  ! ${x.file}  error: ${x.error}`);
    }
  }
  lines.push("");
  lines.push(
    `Swept ${r.gated} file(s) in ${r.elapsedSeconds}s: ` +
      `${r.passed} passed, ${r.failed} below threshold, ` +
      `${r.noTests} without tests, ${r.deferred} deferred.`,
  );
  if (r.failed > 0 || r.noTests > 0) {
    lines.push(`Run /mtt-sweep to have the agent strengthen the flagged files.`);
  }
  return lines.join("\n");
}
