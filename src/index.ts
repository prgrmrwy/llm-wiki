#!/usr/bin/env node

import { Command } from "commander";
import { runGcCommand } from "./commands/gc.js";
import { runHealthCommand } from "./commands/health.js";
import { runIndexCommand } from "./commands/index-command.js";
import { runInitCommand } from "./commands/init.js";
import { runListCommand } from "./commands/list.js";
import { runQueryCommand } from "./commands/query.js";
import { runRepairCommand } from "./commands/repair.js";
import { runSkillInstallCommand } from "./commands/skill-install.js";

const program = new Command();

program
  .name("llm-wiki")
  .description("Local wiki workflow CLI for Claude Code and Obsidian.")
  .version("0.1.0");

program
  .command("init")
  .description("Run preflight health guidance, then initialize a wiki instance in the current directory.")
  .option("--skip", "Skip interactive schema guidance and use the default learning template.")
  .action(async (options: { skip?: boolean }) => {
    await runInitCommand({
      skipPrompts: Boolean(options.skip),
    });
  });

program
  .command("list")
  .description("List wiki instances in the global registry.")
  .action(async () => {
    await runListCommand();
  });

program
  .command("gc")
  .description("Remove missing wiki instances from the global registry.")
  .action(async () => {
    await runGcCommand();
  });

program
  .command("query")
  .description("Search wiki content with qmd.")
  .argument("<question>", "Question or keywords to search.")
  .option("--json", "Emit machine-readable JSON output.")
  .option("--root <path>", "Wiki instance root (absolute path); bypasses cwd-based detection.")
  .action(async (question: string, options: { json?: boolean; root?: string }) => {
    await runQueryCommand({
      question,
      json: Boolean(options.json),
      root: options.root,
    });
  });

program
  .command("index")
  .description("Build or refresh the qmd index for the current wiki.")
  .action(async () => {
    await runIndexCommand();
  });

program
  .command("health")
  .description("Check environment and current wiki health.")
  .action(async () => {
    await runHealthCommand();
  });

program
  .command("repair")
  .description("Regenerate missing wiki metadata files in the current wiki.")
  .action(async () => {
    await runRepairCommand();
  });

const skillProgram = program.command("skill").description("Manage wiki skills.");

skillProgram
  .command("install")
  .description("Install a wiki skill into a Claude Code scope.")
  .argument("<wiki-name>", "Wiki name from the global registry.")
  .action(async (wikiName: string) => {
    await runSkillInstallCommand({
      wikiName,
    });
  });

await program.parseAsync(process.argv);
