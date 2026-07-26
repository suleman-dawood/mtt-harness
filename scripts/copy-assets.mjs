import { cpSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// Bundle the skill markdown into dist so the installer can read it at runtime.
const targets = [["src/skill/SKILL.md", "dist/skill/SKILL.md"]];

for (const [from, to] of targets) {
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to);
  console.log(`copied ${from} -> ${to}`);
}
