import type Parser from "web-tree-sitter";
import { parse } from "./grammars";
import type { Language, Mutant } from "./types";

/** Binary operator swaps. Same token spellings across JS/TS and Go. */
const BINARY_SWAP: Record<string, string> = {
  ">": ">=",
  ">=": ">",
  "<": "<=",
  "<=": "<",
  "+": "-",
  "-": "+",
  "*": "/",
  "/": "*",
  "&&": "||",
  "||": "&&",
  "==": "!=",
  "!=": "==",
  "===": "!==",
  "!==": "===",
};

const CONDITION_HOLDERS = new Set(["if_statement", "while_statement"]);

function walk(root: Parser.SyntaxNode, visit: (n: Parser.SyntaxNode) => void) {
  const stack: Parser.SyntaxNode[] = [root];
  while (stack.length) {
    const node = stack.pop()!;
    visit(node);
    for (let i = node.childCount - 1; i >= 0; i--) {
      const child = node.child(i);
      if (child) stack.push(child);
    }
  }
}

function line(node: Parser.SyntaxNode): number {
  return node.startPosition.row + 1;
}

/**
 * Produce single-point mutants for a source string using deterministic
 * tree-sitter operators. Mutant offsets index into `source`.
 */
export async function generateMutants(
  source: string,
  language: Language,
): Promise<Mutant[]> {
  const root = await parse(source, language);
  const mutants: Mutant[] = [];

  walk(root, (node) => {
    // 1. Binary operator swaps
    if (node.type === "binary_expression") {
      const op = node.childForFieldName("operator");
      if (op && BINARY_SWAP[op.text] !== undefined) {
        mutants.push({
          operator: "binary-op",
          line: line(op),
          startIndex: op.startIndex,
          endIndex: op.endIndex,
          original: op.text,
          replacement: BINARY_SWAP[op.text],
        });
      }
    }

    // 2. Boolean literal swap
    if (node.type === "true" || node.type === "false") {
      mutants.push({
        operator: "boolean-literal",
        line: line(node),
        startIndex: node.startIndex,
        endIndex: node.endIndex,
        original: node.text,
        replacement: node.type === "true" ? "false" : "true",
      });
    }

    // 3. Negate condition of if/while
    if (CONDITION_HOLDERS.has(node.type)) {
      const cond = node.childForFieldName("condition");
      if (cond) {
        mutants.push({
          operator: "negate-condition",
          line: line(cond),
          startIndex: cond.startIndex,
          endIndex: cond.endIndex,
          original: cond.text,
          replacement: `!(${cond.text})`,
        });
      }
    }

    // 4. Remove an expression statement (e.g. a side-effecting call)
    if (node.type === "expression_statement") {
      mutants.push({
        operator: "remove-statement",
        line: line(node),
        startIndex: node.startIndex,
        endIndex: node.endIndex,
        original: node.text,
        replacement: "",
      });
    }
  });

  return dedupe(mutants);
}

function dedupe(mutants: Mutant[]): Mutant[] {
  const seen = new Set<string>();
  const out: Mutant[] = [];
  for (const m of mutants) {
    const key = `${m.startIndex}:${m.endIndex}:${m.replacement}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out.sort((a, b) => a.startIndex - b.startIndex);
}

/** Apply a single mutant to source text. */
export function applyMutant(
  source: string,
  mutant: Pick<Mutant, "startIndex" | "endIndex" | "replacement">,
): string {
  return (
    source.slice(0, mutant.startIndex) +
    mutant.replacement +
    source.slice(mutant.endIndex)
  );
}
