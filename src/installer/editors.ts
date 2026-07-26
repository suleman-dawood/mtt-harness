import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface Skill {
  name: string;
  description: string;
  body: string;
  raw: string;
}

/** Load the bundled skill markdown (works from both src/ and dist/). */
export function loadSkill(): Skill {
  const path = join(__dirname, "..", "skill", "SKILL.md");
  const raw = readFileSync(path, "utf8");
  return { ...parseFrontmatter(raw), raw };
}

function parseFrontmatter(raw: string): {
  name: string;
  description: string;
  body: string;
} {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { name: "mtt-harness", description: "", body: raw };
  const front = m[1];
  const body = m[2].trimStart();
  const name = /name:\s*(.+)/.exec(front)?.[1].trim() ?? "mtt-harness";
  const description = /description:\s*(.+)/.exec(front)?.[1].trim() ?? "";
  return { name, description, body };
}

export interface EditorDef {
  id: string;
  label: string;
  /** Present when this path exists under the project root. */
  marker: string;
  /** Write the skill; returns the file paths written. */
  install(root: string, skill: Skill): string[];
}

const START = "<!-- mtt-harness:start -->";
const END = "<!-- mtt-harness:end -->";

function write(path: string, content: string): string {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return path;
}

/** Insert or replace the mtt-harness section in a shared AGENTS.md. */
export function upsertAgentsMd(root: string, skill: Skill): string {
  const path = join(root, "AGENTS.md");
  const section = `${START}\n## MTT Harness (mutation-testing gate)\n\n${skill.body}\n${END}`;
  let next: string;
  if (existsSync(path)) {
    const cur = readFileSync(path, "utf8");
    const re = new RegExp(`${START}[\\s\\S]*?${END}`);
    next = re.test(cur)
      ? cur.replace(re, section)
      : cur.trimEnd() + "\n\n" + section + "\n";
  } else {
    next = section + "\n";
  }
  writeFileSync(path, next);
  return path;
}

export const EDITORS: EditorDef[] = [
  {
    id: "claude",
    label: "Claude Code",
    marker: ".claude",
    install: (root, skill) =>
      [write(join(root, ".claude/skills/mtt-harness/SKILL.md"), skill.raw)],
  },
  {
    id: "cursor",
    label: "Cursor",
    marker: ".cursor",
    install: (root, skill) => {
      const mdc = `---\ndescription: ${skill.description}\nalwaysApply: false\n---\n\n${skill.body}`;
      return [write(join(root, ".cursor/rules/mtt-harness.mdc"), mdc)];
    },
  },
  {
    id: "windsurf",
    label: "Windsurf",
    marker: ".windsurf",
    install: (root, skill) =>
      [write(join(root, ".windsurf/rules/mtt-harness.md"), skill.body)],
  },
  {
    id: "opencode",
    label: "OpenCode",
    marker: ".opencode",
    install: (root, skill) => [upsertAgentsMd(root, skill)],
  },
  {
    id: "antigravity",
    label: "Antigravity",
    marker: ".antigravity",
    install: (root, skill) => [upsertAgentsMd(root, skill)],
  },
  {
    id: "agents",
    label: "AGENTS.md (Codex/Copilot/generic)",
    marker: "AGENTS.md",
    install: (root, skill) => [upsertAgentsMd(root, skill)],
  },
];

export interface InstallResult {
  editor: string;
  paths: string[];
}

/**
 * Install into detected editors (or a forced one). AGENTS.md is always written
 * as the universal target. Returns per-editor results (deduped paths).
 */
export function install(
  root: string,
  skill: Skill,
  opts: { editor?: string } = {},
): InstallResult[] {
  const chosen = opts.editor
    ? EDITORS.filter((e) => e.id === opts.editor)
    : EDITORS.filter(
        (e) => e.id === "agents" || existsSync(join(root, e.marker)),
      );

  const results: InstallResult[] = [];
  const writtenPaths = new Set<string>();
  for (const editor of chosen) {
    const paths = editor.install(root, skill).filter((p) => {
      if (writtenPaths.has(p)) return false;
      writtenPaths.add(p);
      return true;
    });
    if (paths.length) results.push({ editor: editor.label, paths });
  }
  return results;
}
