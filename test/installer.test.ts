import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSkill, install, upsertAgentsMd } from "../src/installer/editors";

let dir: string;
beforeEach(() => (dir = mkdtempSync(join(tmpdir(), "mtt-init-"))));
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("loadSkill", () => {
  it("parses frontmatter and body", () => {
    const s = loadSkill();
    expect(s.name).toBe("mtt-harness");
    expect(s.description.length).toBeGreaterThan(0);
    expect(s.body).toContain("Mutation testing");
  });
});

describe("install", () => {
  it("writes AGENTS.md even with no editors detected", () => {
    const res = install(dir, loadSkill());
    expect(res.some((r) => r.editor.includes("AGENTS"))).toBe(true);
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(true);
  });

  it("detects Claude Code and Cursor by marker dirs", () => {
    mkdirSync(join(dir, ".claude"));
    mkdirSync(join(dir, ".cursor"));
    install(dir, loadSkill());
    expect(existsSync(join(dir, ".claude/skills/mtt-harness/SKILL.md"))).toBe(
      true,
    );
    expect(existsSync(join(dir, ".cursor/rules/mtt-harness.mdc"))).toBe(true);
  });

  it("respects --editor to force one target", () => {
    const res = install(dir, loadSkill(), { editor: "windsurf" });
    expect(res).toHaveLength(1);
    expect(existsSync(join(dir, ".windsurf/rules/mtt-harness.md"))).toBe(true);
  });

  it("upserts the AGENTS.md section idempotently", () => {
    writeFileSync(join(dir, "AGENTS.md"), "# My rules\n\nexisting content\n");
    upsertAgentsMd(dir, loadSkill());
    upsertAgentsMd(dir, loadSkill());
    const content = readFileSync(join(dir, "AGENTS.md"), "utf8");
    expect(content).toContain("existing content");
    expect(content.match(/mtt-harness:start/g)).toHaveLength(1);
  });
});
