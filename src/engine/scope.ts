import { execFileSync } from "node:child_process";

/**
 * Line numbers (1-based) added/changed in `file` vs `ref`, from git diff hunks.
 * Throws if git fails (e.g. not a repo / bad ref) — callers decide how to react.
 */
export function changedLines(
  ref: string,
  file: string,
  cwd?: string,
): Set<number> {
  const out = execFileSync(
    "git",
    ["diff", "--unified=0", ref, "--", file],
    { cwd, encoding: "utf8" },
  );
  const lines = new Set<number>();
  const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm;
  let m: RegExpExecArray | null;
  while ((m = hunk.exec(out))) {
    const start = Number(m[1]);
    const count = m[2] === undefined ? 1 : Number(m[2]);
    for (let i = 0; i < count; i++) lines.add(start + i);
  }
  return lines;
}
