import { runGuard, type GuardReport } from "./guard";
import { findTests } from "./testmap";

export interface SweepFileResult {
  file: string;
  tests: string[];
  status: "gated" | "no-tests" | "deferred" | "error";
  report?: GuardReport;
  error?: string;
}

export interface SweepResult {
  results: SweepFileResult[];
  gated: number;
  passed: number;
  failed: number;
  noTests: number;
  deferred: number;
  elapsedSeconds: number;
}

export interface SweepOptions {
  files: string[];
  root: string;
  testCmdTemplate: string;
  threshold: number;
  timeoutMs: number;
  maxMutants?: number;
  budgetSeconds?: number;
  maxFiles?: number;
  ignore?: Set<string>;
  now?: () => number;
  onFile?: (file: string, index: number, total: number) => void;
}

/**
 * Gate each changed source file against its mapped tests, stopping once the
 * time or file budget is spent (remaining files are marked `deferred`).
 */
export async function runSweep(opts: SweepOptions): Promise<SweepResult> {
  const now = opts.now ?? (() => Date.now());
  const start = now();
  const results: SweepFileResult[] = [];
  let gatedCount = 0;

  for (let i = 0; i < opts.files.length; i++) {
    const file = opts.files[i];
    const elapsed = (now() - start) / 1000;
    const overTime =
      opts.budgetSeconds !== undefined && elapsed >= opts.budgetSeconds;
    const overFiles =
      opts.maxFiles !== undefined && gatedCount >= opts.maxFiles;
    if (overTime || overFiles) {
      results.push({ file, tests: [], status: "deferred" });
      continue;
    }

    const tests = findTests(file, opts.root);
    if (tests.length === 0) {
      results.push({ file, tests, status: "no-tests" });
      continue;
    }

    opts.onFile?.(file, i, opts.files.length);
    const testCmd = opts.testCmdTemplate.replace(/\{test\}/g, tests.join(" "));
    try {
      const report = await runGuard({
        file,
        testCmd,
        cwd: opts.root,
        threshold: opts.threshold,
        timeoutMs: opts.timeoutMs,
        max: opts.maxMutants,
        ignore: opts.ignore,
      });
      gatedCount++;
      results.push({ file, tests, status: "gated", report });
    } catch (err) {
      results.push({
        file,
        tests,
        status: "error",
        error: (err as Error).message,
      });
    }
  }

  const gatedReports = results.filter((r) => r.status === "gated");
  return {
    results,
    gated: gatedReports.length,
    passed: gatedReports.filter((r) => r.report!.passed).length,
    failed: gatedReports.filter((r) => !r.report!.passed).length,
    noTests: results.filter((r) => r.status === "no-tests").length,
    deferred: results.filter((r) => r.status === "deferred").length,
    elapsedSeconds: Math.round((now() - start) / 1000),
  };
}
