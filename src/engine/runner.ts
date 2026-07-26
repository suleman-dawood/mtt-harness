import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { applyMutant } from "./operators";
import type { Mutant, MutantStatus } from "./types";

export interface RunResult {
  code: number;
  timedOut: boolean;
}

/** Run a shell command with a hard timeout; output is discarded. */
export function runCommand(
  cmd: string,
  opts: { cwd?: string; timeoutMs: number },
): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, {
      cwd: opts.cwd,
      shell: true,
      stdio: "ignore",
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, opts.timeoutMs);
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, timedOut });
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve({ code: 1, timedOut });
    });
  });
}

/**
 * Apply one mutant to `file`, run the test command, then restore the file.
 * Suite passed ⇒ survived; failed ⇒ killed; timeout ⇒ killed via timeout.
 */
export async function evaluateMutant(
  file: string,
  source: string,
  mutant: Mutant,
  testCmd: string,
  opts: { cwd?: string; timeoutMs: number },
): Promise<MutantStatus> {
  writeFileSync(file, applyMutant(source, mutant));
  try {
    const { code, timedOut } = await runCommand(testCmd, opts);
    if (timedOut) return "timeout";
    return code === 0 ? "survived" : "killed";
  } finally {
    writeFileSync(file, source);
  }
}

/** True if the test command passes on unmutated source. */
export async function checkBaseline(
  testCmd: string,
  opts: { cwd?: string; timeoutMs: number },
): Promise<boolean> {
  const { code, timedOut } = await runCommand(testCmd, opts);
  return code === 0 && !timedOut;
}

/** Re-read a file from disk (used to snapshot original source before mutating). */
export function readSource(file: string): string {
  return readFileSync(file, "utf8");
}
