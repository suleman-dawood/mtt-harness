import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const IGNORE_FILE = ".mtt-ignore";

/** Read `.mtt-ignore` mutant ids from `cwd`; blank lines and `#` comments skipped. */
export function loadIgnore(cwd = process.cwd()): Set<string> {
  const path = join(cwd, IGNORE_FILE);
  if (!existsSync(path)) return new Set();
  const ids = readFileSync(path, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  return new Set(ids);
}
