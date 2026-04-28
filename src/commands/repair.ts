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

interface RepairCommandOptions {
  force?: boolean;
}

export async function runRepairCommand(options: RepairCommandOptions = {}): Promise<void> {
  const wikiRoot = await detectWikiRoot();
  if (!wikiRoot) {
    throw new Error("未找到 wiki 根目录；请在 wiki 实例内运行 repair。");
  }

  const context = await loadInitRenderContext(wikiRoot);
  const force = Boolean(options.force);
  const repaired: string[] = [];

  await ensureDir(path.join(wikiRoot, ".wiki"));
  await ensureDir(path.join(wikiRoot, ".obsidian"));
  await ensureDir(path.join(wikiRoot, ".claude", "skills", context.wikiName));
  await ensureDir(path.join(wikiRoot, ".claude", "commands"));

  const managedFiles: Array<{ targetPath: string; content: string; managed: boolean }> = [
    { targetPath: path.join(wikiRoot, ".wiki", "config.yaml"), content: renderConfigYaml(context), managed: true },
    {
      targetPath: path.join(wikiRoot, ".wiki", "schema.md"),
      content: renderSchemaMarkdown(context.domainDescription, context.template, context.pageTypeNames, context.languagePreference),
      managed: true,
    },
    { targetPath: path.join(wikiRoot, ".wiki", "context.md"), content: `${renderContextMarkdown(context)}\n`, managed: false },
    { targetPath: path.join(wikiRoot, "wiki", "index.md"), content: renderIndexMarkdown(context), managed: false },
    { targetPath: path.join(wikiRoot, "wiki", "log.md"), content: renderLogMarkdown(context), managed: false },
    { targetPath: path.join(wikiRoot, ".obsidian", "app.json"), content: `${renderObsidianAppConfig()}\n`, managed: true },
    { targetPath: path.join(wikiRoot, "CLAUDE.md"), content: `${renderClaudeMd(context)}\n`, managed: true },
    { targetPath: path.join(wikiRoot, "AGENTS.md"), content: `${renderAgentsMd(context)}\n`, managed: true },
    { targetPath: path.join(wikiRoot, ".claude", "skills", context.wikiName, "SKILL.md"), content: `${renderSkillMd(context)}\n`, managed: true },
    { targetPath: path.join(wikiRoot, ".claude", "commands", "wiki-ingest.md"), content: `${renderWikiIngestCommand(context)}\n`, managed: true },
    { targetPath: path.join(wikiRoot, ".claude", "commands", "wiki-query.md"), content: `${renderWikiQueryCommand(context)}\n`, managed: true },
    { targetPath: path.join(wikiRoot, ".claude", "commands", "wiki-lint.md"), content: `${renderWikiLintCommand()}\n`, managed: true },
  ];

  for (const file of managedFiles) {
    const overwrite = force && file.managed;
    repaired.push(...await writeIfMissingOrForce(file.targetPath, file.content, overwrite));
  }

  if (repaired.length === 0) {
    console.log(force ? "No managed files changed." : "No missing metadata files.");
    return;
  }

  console.log(force ? "Updated files:" : "Repaired files:");
  for (const item of repaired) {
    console.log(`- ${item}`);
  }
  if (!force) {
    console.log("Tip: 用 `llm-wiki repair --force` 强制按当前模板重写受管文件（CLAUDE.md / AGENTS.md / SKILL.md / 各 slash command / schema.md / config.yaml / app.json）。`context.md`、`index.md`、`log.md` 始终不会被覆盖。");
  }
}

async function writeIfMissingOrForce(targetPath: string, content: string, force: boolean): Promise<string[]> {
  if (!force && await exists(targetPath)) {
    return [];
  }

  await writeTextFile(targetPath, content);
  return [targetPath];
}
