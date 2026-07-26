import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runGuard } from "../src/engine/guard";

let dir: string;
const SRC = `exports.add = (a, b) => a + b;
exports.isAdult = (age) => age >= 18;
`;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mtt-"));
  writeFileSync(join(dir, "calc.js"), SRC);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const base = (testFile: string) => ({
  file: join(dir, "calc.js"),
  testCmd: `node ${testFile}`,
  cwd: dir,
  threshold: 80,
  timeoutMs: 10000,
});

describe("runGuard", () => {
  it("scores 0 when tests assert nothing (all mutants survive)", async () => {
    writeFileSync(join(dir, "weak.js"), `require("./calc"); process.exit(0);`);
    const r = await runGuard(base("weak.js"));
    expect(r.baselineOk).toBe(true);
    expect(r.total).toBeGreaterThan(0);
    expect(r.score).toBe(0);
    expect(r.passed).toBe(false);
    expect(r.survived.length).toBe(r.total);
  });

  it("scores 100 when tests catch every mutant", async () => {
    writeFileSync(
      join(dir, "strong.js"),
      `const c = require("./calc");
if (c.add(2, 3) !== 5) process.exit(1);
if (c.isAdult(18) !== true) process.exit(1);
if (c.isAdult(17) !== false) process.exit(1);
process.exit(0);`,
    );
    const r = await runGuard(base("strong.js"));
    expect(r.score).toBe(100);
    expect(r.passed).toBe(true);
    expect(r.survived.length).toBe(0);
  });

  it("restores the original file after running", async () => {
    writeFileSync(join(dir, "weak.js"), `require("./calc"); process.exit(0);`);
    await runGuard(base("weak.js"));
    expect(readFileSync(join(dir, "calc.js"), "utf8")).toBe(SRC);
  });

  it("aborts on a red baseline", async () => {
    writeFileSync(join(dir, "red.js"), `process.exit(1);`);
    const r = await runGuard(base("red.js"));
    expect(r.baselineOk).toBe(false);
    expect(r.passed).toBe(false);
  });

  it("honors the ignore list", async () => {
    writeFileSync(join(dir, "weak.js"), `require("./calc"); process.exit(0);`);
    const full = await runGuard(base("weak.js"));
    const firstId = full.survived[0].id;
    const filtered = await runGuard({
      ...base("weak.js"),
      ignore: new Set([firstId]),
    });
    expect(filtered.total).toBe(full.total - 1);
  });
});
