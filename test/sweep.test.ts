import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSweep } from "../src/engine/sweep";
import { parseDuration } from "../src/commands/sweep";

describe("parseDuration", () => {
  it("parses seconds, minutes, hours, and bare numbers", () => {
    expect(parseDuration("90s")).toBe(90);
    expect(parseDuration("15m")).toBe(900);
    expect(parseDuration("2h")).toBe(7200);
    expect(parseDuration("120")).toBe(120);
    expect(parseDuration(undefined)).toBeUndefined();
    expect(parseDuration("nonsense")).toBeUndefined();
  });
});

describe("runSweep", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mtt-sweep-"));
    execFileSync("git", ["init", "-q"], { cwd: dir });
    writeFileSync(join(dir, "add.js"), "exports.add = (a, b) => a + b;\n");
    writeFileSync(
      join(dir, "add.test.js"),
      `const {add}=require("./add"); if(add(2,3)!==5) process.exit(1); process.exit(0);`,
    );
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("maps a changed file to its test and gates it", async () => {
    execFileSync("git", ["add", "-A"], { cwd: dir });
    const r = await runSweep({
      files: [join(dir, "add.js")],
      root: dir,
      testCmdTemplate: "node {test}",
      threshold: 80,
      timeoutMs: 10000,
    });
    expect(r.gated).toBe(1);
    expect(r.results[0].tests).toEqual(["add.test.js"]);
    expect(r.passed).toBe(1);
  });

  it("defers files once the file budget is hit", async () => {
    const r = await runSweep({
      files: ["a.js", "b.js", "c.js"],
      root: dir,
      testCmdTemplate: "node {test}",
      threshold: 80,
      timeoutMs: 10000,
      maxFiles: 0,
      now: () => 0,
    });
    expect(r.deferred).toBe(3);
    expect(r.gated).toBe(0);
  });

  it("marks files with no discoverable tests", async () => {
    const r = await runSweep({
      files: ["orphan.js"],
      root: dir,
      testCmdTemplate: "node {test}",
      threshold: 80,
      timeoutMs: 10000,
    });
    expect(r.noTests).toBe(1);
  });
});
