import { detectLanguage } from "./grammars";
import { generateMutants } from "./operators";
import { checkBaseline, evaluateMutant, readSource } from "./runner";
import { changedLines } from "./scope";
import type { FileMutant, Mutant } from "./types";

export interface GuardOptions {
  file: string;
  testCmd: string;
  cwd?: string;
  threshold: number;
  timeoutMs: number;
  max?: number;
  since?: string;
  extraMutants?: Mutant[];
  ignore?: Set<string>;
  onProgress?: (done: number, total: number) => void;
}

export interface GuardReport {
  file: string;
  language: string | null;
  baselineOk: boolean;
  total: number;
  killed: number;
  survived: FileMutant[];
  score: number;
  skipped: number;
  passed: boolean;
}

export function mutantId(file: string, m: Mutant): string {
  return `${file}:${m.line}:${m.operator}:${m.original}=>${m.replacement}`;
}

function bind(file: string, mutants: Mutant[]): FileMutant[] {
  return mutants.map((m) => ({ ...m, file, id: mutantId(file, m) }));
}

/**
 * Full mutation gate for one file: generate mutants, scope/ignore/cap them,
 * verify the baseline is green, then run each mutant and score survivors.
 */
export async function runGuard(opts: GuardOptions): Promise<GuardReport> {
  const source = readSource(opts.file);
  const language = detectLanguage(opts.file);

  const builtin = language ? await generateMutants(source, language) : [];
  const all = bind(opts.file, [...builtin, ...(opts.extraMutants ?? [])]);

  const before = all.length;
  let mutants = all;

  if (opts.ignore && opts.ignore.size) {
    mutants = mutants.filter((m) => !opts.ignore!.has(m.id));
  }
  if (opts.since) {
    const lines = changedLines(opts.since, opts.file, opts.cwd);
    mutants = mutants.filter((m) => lines.has(m.line));
  }
  if (opts.max !== undefined && mutants.length > opts.max) {
    mutants = mutants.slice(0, opts.max);
  }
  const skipped = before - mutants.length;

  const runOpts = { cwd: opts.cwd, timeoutMs: opts.timeoutMs };
  const baselineOk = await checkBaseline(opts.testCmd, runOpts);
  if (!baselineOk) {
    return {
      file: opts.file,
      language,
      baselineOk: false,
      total: mutants.length,
      killed: 0,
      survived: [],
      score: 0,
      skipped,
      passed: false,
    };
  }

  const survived: FileMutant[] = [];
  let killed = 0;
  for (let i = 0; i < mutants.length; i++) {
    const status = await evaluateMutant(
      opts.file,
      source,
      mutants[i],
      opts.testCmd,
      runOpts,
    );
    if (status === "survived") survived.push(mutants[i]);
    else killed++;
    opts.onProgress?.(i + 1, mutants.length);
  }

  const total = mutants.length;
  const score = total === 0 ? 100 : Math.round((killed / total) * 100);

  return {
    file: opts.file,
    language,
    baselineOk: true,
    total,
    killed,
    survived,
    score,
    skipped,
    passed: score >= opts.threshold,
  };
}
