import { extname } from "node:path";
import type { Language } from "./types";

// Default-interop drops statics added after init() (e.g. Parser.Language), so
// pull in the real module.exports class via import = require.
import Parser = require("web-tree-sitter");

const WASM_NAME: Record<Language, string> = {
  javascript: "javascript",
  typescript: "typescript",
  tsx: "tsx",
  go: "go",
};

const EXT_TO_LANG: Record<string, Language> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".tsx": "tsx",
  ".go": "go",
};

/** Map a file path to a supported built-in grammar, or null if unsupported. */
export function detectLanguage(file: string): Language | null {
  return EXT_TO_LANG[extname(file).toLowerCase()] ?? null;
}

let initPromise: Promise<void> | null = null;
const langCache = new Map<Language, Parser.Language>();

async function ensureInit(): Promise<void> {
  if (!initPromise) initPromise = Parser.init();
  await initPromise;
}

async function loadLanguage(language: Language): Promise<Parser.Language> {
  const cached = langCache.get(language);
  if (cached) return cached;
  const wasmPath = require.resolve(
    `tree-sitter-wasms/out/tree-sitter-${WASM_NAME[language]}.wasm`,
  );
  const lang = await Parser.Language.load(wasmPath);
  langCache.set(language, lang);
  return lang;
}

/** Parse `source` for `language` and return the tree's root node. */
export async function parse(
  source: string,
  language: Language,
): Promise<Parser.SyntaxNode> {
  await ensureInit();
  const lang = await loadLanguage(language);
  const parser = new Parser();
  parser.setLanguage(lang);
  const tree = parser.parse(source);
  return tree.rootNode;
}
