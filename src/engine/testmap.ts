import { execFileSync } from "node:child_process";
import { basename, dirname, sep } from "node:path";
import { detectLanguage } from "./grammars";
import type { Language } from "./types";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Test-file matcher for a given source basename (no extension) and language. */
function testMatcher(base: string, language: Language): (file: string) => boolean {
  const b = escapeRegExp(base);
  if (language === "go") {
    const re = new RegExp(`^${b}_test\\.go$`);
    return (f) => re.test(basename(f));
  }
  if (language === "python") {
    // test_<name>.py, test_<name>_<suffix>.py, <name>_test.py
    const re = new RegExp(`^test_${b}(_.*)?\\.py$|^${b}_test\\.py$`);
    return (f) => re.test(basename(f));
  }
  // JS/TS/TSX: <name>.test.ext / <name>.spec.ext
  const re = new RegExp(`^${b}\\.(test|spec)\\.(js|jsx|ts|tsx|mjs|cjs)$`);
  return (f) => re.test(basename(f));
}

function listRepoFiles(root: string): string[] {
  try {
    return execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** How many leading path segments two files share (for closeness ranking). */
function sharedDepth(a: string, b: string): number {
  const pa = a.split(sep);
  const pb = b.split(sep);
  let n = 0;
  while (n < pa.length && n < pb.length && pa[n] === pb[n]) n++;
  return n;
}

/**
 * Find likely test files for a source file by name convention. `fileList`
 * overrides repo enumeration (for testing). Matches are ranked by directory
 * closeness to the source file.
 */
export function findTests(
  source: string,
  root: string,
  fileList?: string[],
): string[] {
  const language = detectLanguage(source);
  if (!language) return [];
  const base = basename(source).replace(/\.[^.]+$/, "");
  const match = testMatcher(base, language);
  const files = fileList ?? listRepoFiles(root);
  const srcDir = dirname(source);
  return files
    .filter((f) => f !== source && match(f))
    .sort((a, b) => sharedDepth(srcDir, dirname(b)) - sharedDepth(srcDir, dirname(a)));
}
