import { checkbox, confirm, input, select } from "@inquirer/prompts";
import path from "node:path";
import { buildEnvironmentChecks, printChecks } from "./health.js";
import { upsertRegistryEntry } from "../registry.js";
import { renderSchemaMarkdown, schemaTemplates, suggestTemplateKey } from "../templates/schema.js";
import {
  renderClaudeMd,
  renderConfigYaml,
  renderContextMarkdown,
  renderIndexMarkdown,
  renderLogMarkdown,
  renderObsidianAppConfig,
  renderAgentsMd,
  renderSkillMd,
  renderWikiIngestCommand,
  renderWikiLintCommand,
  renderWikiQueryCommand,
} from "../templates/wiki.js";
import type { TemplateKey } from "../types.js";
import { ensureDir, writeTextFile } from "../utils/fs.js";
import { ensureNoExistingWiki } from "../utils/wiki.js";

interface InitCommandOptions {
  skipPrompts: boolean;
}

export async function runInitCommand(options: InitCommandOptions): Promise<void> {
  const cwd = process.cwd();
  await ensureNoExistingWiki(cwd);

  await runInitPreflight(options);

  const wikiName = path.basename(cwd);
  const createdAt = new Date().toISOString();
  const description = options.skipPrompts
    ? "General-purpose learning wiki."
    : await input({
        message: "描述这个 wiki 的领域或主题：",
        validate: (value) => (value.trim().length > 0 ? true : "请输入领域描述。"),
      });

  const suggestedTemplate = suggestTemplateKey(description);
  const templateKey = options.skipPrompts
    ? "learning"
    : await select<TemplateKey>({
        message: "选择 schema 基础模板：",
        default: suggestedTemplate,
        choices: Object.values(schemaTemplates).map((template) => ({
          name: `${template.key}${template.key === suggestedTemplate ? " (recommended)" : ""}`,
          value: template.key,
          description: template.description,
        })),
      });

  const template = schemaTemplates[templateKey];
  const selectedPageTypes = options.skipPrompts
    ? template.pageTypes.map((pageType) => pageType.name)
    : await checkbox({
        message: "确认要启用的 page types：",
        choices: template.pageTypes.map((pageType) => ({
          name: pageType.name,
          value: pageType.name,
          description: pageType.summary,
          checked: true,
        })),
        validate: (values) => (values.length > 0 ? true : "至少选择一个 page type。"),
      });

  if (!options.skipPrompts) {
    const accepted = await confirm({
      message: `用 ${templateKey} 模板初始化 ${wikiName}？`,
      default: true,
    });
    if (!accepted) {
      throw new Error("初始化已取消。");
    }
  }

  await createWikiStructure(cwd, wikiName, description, template, selectedPageTypes, createdAt);

  await upsertRegistryEntry({
    name: wikiName,
    path: cwd,
    description,
    created: createdAt,
  });

  console.log(`Initialized wiki: ${wikiName}`);
  console.log(`Template: ${templateKey}`);
  console.log(`Path: ${cwd}`);
  printGettingStarted(wikiName);
}

async function runInitPreflight(options: InitCommandOptions): Promise<void> {
  console.log("Preflight");
  const envChecks = await buildEnvironmentChecks();
  printChecks(envChecks);

  const failedChecks = envChecks.filter((check) => !check.ok);
  if (failedChecks.length === 0) {
    return;
  }

  const shouldShowGuidance = options.skipPrompts
    ? true
    : await confirm({
        message: "是否查看初始化前的修复建议和手动步骤？",
        default: true,
      });

  if (shouldShowGuidance) {
    console.log("\nSetup Guidance");
    printSetupGuidance(failedChecks);
  }

  if (!options.skipPrompts) {
    const shouldContinue = await confirm({
      message: "是否继续初始化 wiki？",
      default: failedChecks.length === 0,
    });
    if (!shouldContinue) {
      throw new Error("初始化已取消；请先完成环境修复。");
    }
  }
}

function printSetupGuidance(failedChecks: Array<{ label: string; detail: string }>): void {
  for (const check of failedChecks) {
    console.log(`- ${check.label}: ${check.detail}`);
    for (const step of getRepairSteps(check.label)) {
      console.log(`  ${step}`);
    }
  }

  console.log("- `llm-wiki repair`: 仅用于 init 之后补齐缺失的 wiki 元文件，不负责安装环境依赖。");
  console.log("- Claudian: `llm-wiki init` 不会自动下载插件。请在 Obsidian 中手动安装 Claudian。");
  console.log("  GitHub: https://github.com/YishenTu/claudian");
  console.log("  安装后确认插件位于 `.obsidian/plugins/claudian/`。");
}

function getRepairSteps(label: string): string[] {
  switch (label) {
    case "Claude CLI":
      return ["安装命令：`npm install -g @anthropic-ai/claude-code`"];
    case "Claude Login":
      return ["运行 `claude` 完成登录。"];
    case "qmd":
      return ["安装命令：`bun install -g @tobilu/qmd`", "Windows 上如 GPU embedding 不稳定，可先走 CPU 或 text-only fallback。"];
    case "Obsidian CLI":
      return ["打开 Obsidian 桌面应用，在应用内启用官方命令行工具（命令通常为 `obsidian`）。"];
    default:
      return [];
  }
}

function printGettingStarted(wikiName: string): void {
  console.log("\nGetting Started");
  console.log("1. 运行 `llm-wiki health`，确认环境和实例状态。");
  console.log("2. 如果 health 或使用中发现元文件缺失，运行 `llm-wiki repair`。");
  console.log("3. 用 Obsidian 打开当前目录作为 vault；如未安装 Claudian，请参考 https://github.com/YishenTu/claudian 。");
  console.log(`4. 运行 \`llm-wiki skill install ${wikiName}\`，然后开始使用 \`/wiki-ingest\`、\`/wiki-query\`、\`/wiki-lint\`。`);
}

async function createWikiStructure(
  rootDir: string,
  wikiName: string,
  description: string,
  template: (typeof schemaTemplates)[TemplateKey],
  pageTypeNames: string[],
  createdAt: string,
): Promise<void> {
  const context = {
    wikiName,
    absoluteRoot: rootDir,
    cliCommand: `node ${JSON.stringify((process.argv[1] || "dist/index.js").replace(/\\/g, "/"))}`,
    domainDescription: description,
    template,
    pageTypeNames,
    createdAt,
  };

  const dirs = [
    ".wiki",
    ".obsidian",
    ".claude",
    path.join(".claude", "commands"),
    path.join(".claude", "skills"),
    path.join(".claude", "skills", wikiName),
    "sources",
    "wiki",
    path.join("wiki", "pages"),
  ];

  for (const relativeDir of dirs) {
    await ensureDir(path.join(rootDir, relativeDir));
  }

  for (const pageTypeName of pageTypeNames) {
    await ensureDir(path.join(rootDir, "wiki", "pages", pageTypeName));
  }

  await writeTextFile(path.join(rootDir, ".wiki", "config.yaml"), renderConfigYaml(context));
  await writeTextFile(path.join(rootDir, ".wiki", "schema.md"), renderSchemaMarkdown(description, template, pageTypeNames));
  await writeTextFile(path.join(rootDir, ".wiki", "context.md"), `${renderContextMarkdown()}\n`);
  await writeTextFile(path.join(rootDir, "wiki", "index.md"), renderIndexMarkdown());
  await writeTextFile(path.join(rootDir, "wiki", "log.md"), renderLogMarkdown());
  await writeTextFile(path.join(rootDir, ".obsidian", "app.json"), `${renderObsidianAppConfig()}\n`);
  await writeTextFile(path.join(rootDir, "CLAUDE.md"), `${renderClaudeMd(context)}\n`);
  await writeTextFile(path.join(rootDir, "AGENTS.md"), `${renderAgentsMd(context)}\n`);
  await writeTextFile(path.join(rootDir, ".claude", "skills", wikiName, "SKILL.md"), `${renderSkillMd(context)}\n`);
  await writeTextFile(path.join(rootDir, ".claude", "commands", "wiki-ingest.md"), `${renderWikiIngestCommand(context)}\n`);
  await writeTextFile(path.join(rootDir, ".claude", "commands", "wiki-query.md"), `${renderWikiQueryCommand(context)}\n`);
  await writeTextFile(path.join(rootDir, ".claude", "commands", "wiki-lint.md"), `${renderWikiLintCommand()}\n`);
}
