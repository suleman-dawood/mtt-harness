#!/usr/bin/env node
import { join } from "node:path";
import { parseArgs } from "./args";
import { guardCommand } from "./commands/guard";
import { initCommand } from "./commands/init";

const HELP = `mtt — mutation-testing gate for coding agents

Usage:
  mtt guard <file> --test-cmd "<cmd>" [options]   Gate a file's tests
  mtt init [--editor <name>]                       Install the skill into editors
  mtt --version
  mtt help

Run "mtt guard" with no args for guard options.`;

function version(): string {
  try {
    return require(join(__dirname, "..", "package.json")).version as string;
  } catch {
    return "0.0.0";
  }
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const command = argv[0];

  if (!command || command === "help" || command === "--help") {
    process.stdout.write(HELP + "\n");
    return 0;
  }
  if (command === "--version" || command === "-v") {
    process.stdout.write(version() + "\n");
    return 0;
  }

  const rest = parseArgs(argv.slice(1));
  switch (command) {
    case "guard":
      return guardCommand(rest);
    case "init":
      return initCommand(rest);
    default:
      process.stderr.write(`unknown command: ${command}\n\n${HELP}\n`);
      return 2;
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`error: ${err?.message ?? err}\n`);
    process.exit(1);
  },
);
