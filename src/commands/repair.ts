import path from "node:path";
import { loadInitRenderContext } from "../utils/init-context.js";
import { ensureDir, exists, writeTextFile } from "../utils/fs.js";
import { detectWikiRoot } from "../utils/wiki.js";
import { renderSchemaMarkdown } from "../templates/schema.js";
import {
  renderAgentsMd,
  renderClaudeMd,
  renderConfigYaml,
  renderContextMarkdown,
  renderIndexMarkdown,
  renderLogMarkdown,
  renderObsidianAppConfig,
  renderSkillMd,
  renderWikiIngestCommand,
  renderWikiLintCommand,
  renderWikiQueryCommand,
} from "../templates/wiki.js";

export async function runRepairCommand(): Promise<void> {
  const wikiRoot = await detectWikiRoot();
  if (!wikiRoot) {
    throw new Error("未找到 wiki 根目录；请在 wiki 实例内运行 repair。");
  }

  const context = await loadInitRenderContext(wikiRoot);
  const repaired: string[] = [];

  await ensureDir(path.join(wikiRoot, ".wiki"));
  await ensureDir(path.join(wikiRoot, ".obsidian"));
  await ensureDir(path.join(wikiRoot, ".claude", "skills", context.wikiName));
  await ensureDir(path.join(wikiRoot, ".claude", "commands"));

  repaired.push(...await writeIfMissing(path.join(wikiRoot, ".wiki", "config.yaml"), renderConfigYaml(context)));
  repaired.push(...await writeIfMissing(
    path.join(wikiRoot, ".wiki", "schema.md"),
    renderSchemaMarkdown(context.domainDescription, context.template, context.pageTypeNames, context.languagePreference),
  ));
  repaired.push(...await writeIfMissing(path.join(wikiRoot, ".wiki", "context.md"), `${renderContextMarkdown(context)}\n`));
  repaired.push(...await writeIfMissing(path.join(wikiRoot, "wiki", "index.md"), renderIndexMarkdown(context)));
  repaired.push(...await writeIfMissing(path.join(wikiRoot, "wiki", "log.md"), renderLogMarkdown(context)));
  repaired.push(...await writeIfMissing(path.join(wikiRoot, ".obsidian", "app.json"), `${renderObsidianAppConfig()}\n`));
  repaired.push(...await writeIfMissing(path.join(wikiRoot, "CLAUDE.md"), `${renderClaudeMd(context)}\n`));
  repaired.push(...await writeIfMissing(path.join(wikiRoot, "AGENTS.md"), `${renderAgentsMd(context)}\n`));
  repaired.push(...await writeIfMissing(path.join(wikiRoot, ".claude", "skills", context.wikiName, "SKILL.md"), `${renderSkillMd(context)}\n`));
  repaired.push(...await writeIfMissing(path.join(wikiRoot, ".claude", "commands", "wiki-ingest.md"), `${renderWikiIngestCommand(context)}\n`));
  repaired.push(...await writeIfMissing(path.join(wikiRoot, ".claude", "commands", "wiki-query.md"), `${renderWikiQueryCommand(context)}\n`));
  repaired.push(...await writeIfMissing(path.join(wikiRoot, ".claude", "commands", "wiki-lint.md"), `${renderWikiLintCommand()}\n`));

  if (repaired.length === 0) {
    console.log("No missing metadata files.");
    return;
  }

  console.log("Repaired files:");
  for (const item of repaired) {
    console.log(`- ${item}`);
  }
}

async function writeIfMissing(targetPath: string, content: string): Promise<string[]> {
  if (await exists(targetPath)) {
    return [];
  }

  await writeTextFile(targetPath, content);
  return [targetPath];
}
