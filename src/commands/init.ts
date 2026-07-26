import { relative } from "node:path";
import { str, type ParsedArgs } from "../args";
import { EDITORS, install, loadSkill } from "../installer/editors";

export async function initCommand(args: ParsedArgs): Promise<number> {
  const editor = str(args.flags.editor);
  if (editor && !EDITORS.some((e) => e.id === editor)) {
    process.stderr.write(
      `unknown editor: ${editor}\nknown: ${EDITORS.map((e) => e.id).join(", ")}\n`,
    );
    return 2;
  }

  const root = process.cwd();
  const skill = loadSkill();
  const results = install(root, skill, { editor });

  if (!results.length) {
    process.stdout.write("No editors written.\n");
    return 0;
  }

  process.stdout.write("Installed mtt-harness skill:\n");
  for (const r of results) {
    for (const p of r.paths) {
      process.stdout.write(`  ✓ ${r.editor} → ${relative(root, p)}\n`);
    }
  }
  process.stdout.write(`\nTry: "/mtt <file>" in your agent.\n`);
  return 0;
}
