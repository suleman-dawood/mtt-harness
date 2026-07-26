import type Parser from "web-tree-sitter";
import { parse } from "./grammars";
import type { Language, Mutant } from "./types";

/** Symbolic binary operator swaps (JS/TS, Go, and Python comparison/arithmetic). */
const SYMBOL_SWAP: Record<string, string> = {
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

/** Word operator swaps (Python `and`/`or`). */
const WORD_SWAP: Record<string, string> = { and: "or", or: "and" };

/** Boolean literal swaps, case-aware across languages (`True`/`False` in Python). */
const BOOL_LITERAL: Record<string, string> = {
  true: "false",
  false: "true",
  True: "False",
  False: "True",
};

const CONDITION_HOLDERS = new Set(["if_statement", "while_statement"]);

const STRING_NODE_TYPES = new Set([
  "string",
  "concatenated_string",
  "template_string",
]);

/** True when a statement is just a string literal (a docstring). */
function isStringStatement(node: Parser.SyntaxNode): boolean {
  const child = node.namedChild(0);
  return (
    node.namedChildCount === 1 &&
    child !== null &&
    STRING_NODE_TYPES.has(child.type)
  );
}

/** First unnamed child whose text is a key in `map` (Python operator token). */
function operatorChild(
  node: Parser.SyntaxNode,
  map: Record<string, string>,
): Parser.SyntaxNode | null {
  for (let i = 0; i < node.childCount; i++) {
    const c = node.child(i);
    if (c && !c.isNamed && map[c.text] !== undefined) return c;
  }
  return null;
}

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

  const negatePrefix = language === "python" ? "not (" : "!(";

  const pushSwap = (op: Parser.SyntaxNode, map: Record<string, string>) => {
    mutants.push({
      operator: "binary-op",
      line: line(op),
      startIndex: op.startIndex,
      endIndex: op.endIndex,
      original: op.text,
      replacement: map[op.text],
    });
  };

  walk(root, (node) => {
    // 1. Binary operator swaps
    if (node.type === "binary_expression") {
      // JS/TS, Go: operator is a named field
      const op = node.childForFieldName("operator");
      if (op && SYMBOL_SWAP[op.text] !== undefined) pushSwap(op, SYMBOL_SWAP);
    } else if (
      node.type === "comparison_operator" ||
      node.type === "binary_operator"
    ) {
      // Python: operator is an unnamed child token
      const op = operatorChild(node, SYMBOL_SWAP);
      if (op) pushSwap(op, SYMBOL_SWAP);
    } else if (node.type === "boolean_operator") {
      // Python: `and` / `or`
      const op = operatorChild(node, WORD_SWAP);
      if (op) pushSwap(op, WORD_SWAP);
    }

    // 2. Boolean literal swap (case-aware)
    if (
      (node.type === "true" || node.type === "false") &&
      BOOL_LITERAL[node.text] !== undefined
    ) {
      mutants.push({
        operator: "boolean-literal",
        line: line(node),
        startIndex: node.startIndex,
        endIndex: node.endIndex,
        original: node.text,
        replacement: BOOL_LITERAL[node.text],
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
          replacement: `${negatePrefix}${cond.text})`,
        });
      }
    }

    // 4. Remove an expression statement (e.g. a side-effecting call).
    // Skip string-only statements (docstrings) — removing them never changes
    // behavior, so they are always equivalent mutants and pure noise.
    // Python needs a `pass` so a sole-statement block stays valid.
    if (node.type === "expression_statement" && !isStringStatement(node)) {
      mutants.push({
        operator: "remove-statement",
        line: line(node),
        startIndex: node.startIndex,
        endIndex: node.endIndex,
        original: node.text,
        replacement: language === "python" ? "pass" : "",
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
