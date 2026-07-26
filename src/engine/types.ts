export type Language = "javascript" | "typescript" | "tsx" | "go" | "python";

/** A single-point source change: replace [startIndex, endIndex) with `replacement`. */
export interface Mutant {
  operator: string;
  /** 1-based line of the mutated token. */
  line: number;
  startIndex: number;
  endIndex: number;
  original: string;
  replacement: string;
}

/** A mutant bound to a concrete file, with a stable id for ignore-lists and reports. */
export interface FileMutant extends Mutant {
  file: string;
  id: string;
}

export type MutantStatus = "killed" | "survived" | "timeout" | "error";

export interface MutantResult {
  mutant: FileMutant;
  status: MutantStatus;
}
