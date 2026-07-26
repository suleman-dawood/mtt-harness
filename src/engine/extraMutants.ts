import type { Mutant } from "./types";

/** Agent-authored mutant: locate `find` on `line` and replace with `replace`. */
interface ExtraSpec {
  line: number;
  find: string;
  replace: string;
  operator?: string;
}

function lineStartOffsets(source: string): number[] {
  const offsets = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "\n") offsets.push(i + 1);
  }
  return offsets;
}

/**
 * Convert agent-friendly `{line, find, replace}` specs into positional mutants
 * by locating `find` within the given 1-based line. Specs that don't match are
 * skipped (returned in `skipped`).
 */
export function parseExtraMutants(
  json: string,
  source: string,
): { mutants: Mutant[]; skipped: ExtraSpec[] } {
  const specs = JSON.parse(json) as ExtraSpec[];
  if (!Array.isArray(specs)) {
    throw new Error("--mutants file must contain a JSON array");
  }
  const starts = lineStartOffsets(source);
  const mutants: Mutant[] = [];
  const skipped: ExtraSpec[] = [];

  for (const spec of specs) {
    const lineStart = starts[spec.line - 1];
    if (lineStart === undefined || !spec.find) {
      skipped.push(spec);
      continue;
    }
    const lineEnd = starts[spec.line] ?? source.length;
    const idxInLine = source.slice(lineStart, lineEnd).indexOf(spec.find);
    if (idxInLine < 0) {
      skipped.push(spec);
      continue;
    }
    const startIndex = lineStart + idxInLine;
    mutants.push({
      operator: spec.operator ?? "agent",
      line: spec.line,
      startIndex,
      endIndex: startIndex + spec.find.length,
      original: spec.find,
      replacement: spec.replace,
    });
  }
  return { mutants, skipped };
}
