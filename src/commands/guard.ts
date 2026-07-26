import { existsSync, readFileSync, statSync } from "node:fs";
import { num, str, type ParsedArgs } from "../args";
import { runGuard } from "../engine/guard";
import { parseExtraMutants } from "../engine/extraMutants";
import { readSource } from "../engine/runner";
import { loadIgnore } from "../ignore";
import { formatHuman, formatJson } from "../report";

const USAGE = `Usage: mtt guard <file> --test-cmd "<cmd>" [options]

Options:
  --test-cmd <cmd>     Command that runs the tests (required)
  --threshold <n>      Min mutation score to pass (default 80)
  --timeout <ms>       Per-mutant timeout in ms (default 10000)
  --max <n>            Cap mutants evaluated
  --since <ref>        Only mutate lines changed vs a git ref
  --mutants <file>     Merge agent-authored mutants (JSON)
  --json               Machine-readable output
  --all --i-mean-it    Required to run against a directory (slow)`;

export async function guardCommand(args: ParsedArgs): Promise<number> {
  const target = args.positional[0];
  const testCmd = str(args.flags["test-cmd"]);
  const json = args.flags.json === true;

  if (!target || !testCmd) {
    process.stderr.write(USAGE + "\n");
    return 2;
  }
  if (!existsSync(target)) {
    process.stderr.write(`error: file not found: ${target}\n`);
    return 2;
  }
  if (statSync(target).isDirectory()) {
    if (!(args.flags.all === true && args.flags["i-mean-it"] === true)) {
      process.stderr.write(
        `refusing to mutate a whole directory — that runs the suite once per\n` +
          `mutant across every file and can take hours.\n\n` +
          `Gate one file:      mtt guard ${target}/foo.ts --test-cmd "..."\n` +
          `Gate a PR's changes: mtt guard <file> --test-cmd "..." --since origin/main\n`,
      );
      return 2;
    }
    process.stderr.write(
      `error: directory mutation (--all) is not implemented in this version.\n`,
    );
    return 2;
  }

  const threshold = num(args.flags.threshold, 80);
  const timeoutMs = num(args.flags.timeout, 10000);
  const max = args.flags.max !== undefined ? num(args.flags.max, 0) : undefined;
  const since = str(args.flags.since);

  let extraMutants;
  const mutantsFile = str(args.flags.mutants);
  if (mutantsFile) {
    if (!existsSync(mutantsFile)) {
      process.stderr.write(`error: --mutants file not found: ${mutantsFile}\n`);
      return 2;
    }
    const source = readSource(target);
    const parsed = parseExtraMutants(readFileSync(mutantsFile, "utf8"), source);
    extraMutants = parsed.mutants;
    if (parsed.skipped.length && !json) {
      process.stderr.write(
        `warning: ${parsed.skipped.length} agent mutant(s) did not match source and were skipped\n`,
      );
    }
  }

  const report = await runGuard({
    file: target,
    testCmd,
    threshold,
    timeoutMs,
    max,
    since,
    extraMutants,
    ignore: loadIgnore(),
  });

  process.stdout.write(
    (json ? formatJson(report) : formatHuman(report, threshold)) + "\n",
  );

  if (!report.baselineOk) return 2;
  return report.passed ? 0 : 1;
}
