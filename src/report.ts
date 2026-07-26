import type { GuardReport } from "./engine/guard";

export function formatJson(r: GuardReport): string {
  return JSON.stringify(
    {
      file: r.file,
      language: r.language,
      baselineOk: r.baselineOk,
      score: r.score,
      threshold_passed: r.passed,
      total: r.total,
      killed: r.killed,
      skipped: r.skipped,
      survived: r.survived.map((m) => ({
        id: m.id,
        line: m.line,
        operator: m.operator,
        original: m.original,
        replacement: m.replacement,
      })),
    },
    null,
    2,
  );
}

export function formatHuman(r: GuardReport, threshold: number): string {
  if (!r.baselineOk) {
    return [
      `✗ ${r.file}`,
      `  Baseline is red — the test command fails on unmutated code.`,
      `  Fix the failing tests before gating; a broken baseline can't be measured.`,
    ].join("\n");
  }

  const lines: string[] = [];
  lines.push(`${r.file}${r.language ? `  (${r.language})` : ""}`);
  lines.push(`  Baseline: green`);

  if (r.total === 0) {
    lines.push(`  No mutants in scope — nothing to gate.`);
    return lines.join("\n");
  }

  const verdict = r.passed
    ? `✓ passes`
    : `✗ below threshold ${threshold}%`;
  lines.push(
    `  Mutation score: ${r.score}%  (${r.killed}/${r.total} killed)  ${verdict}`,
  );
  if (r.skipped > 0) lines.push(`  Skipped: ${r.skipped} (ignored / out of scope)`);

  if (r.survived.length) {
    lines.push(`  Survivors (tests did not catch these):`);
    for (const m of r.survived) {
      const change =
        m.replacement === ""
          ? `removed \`${truncate(m.original)}\``
          : `\`${truncate(m.original)}\` → \`${truncate(m.replacement)}\``;
      lines.push(`    ${m.file}:${m.line}  ${m.operator}  ${change}`);
    }
  }
  return lines.join("\n");
}

function truncate(s: string, n = 40): string {
  const flat = s.replace(/\s+/g, " ");
  return flat.length > n ? flat.slice(0, n - 1) + "…" : flat;
}
