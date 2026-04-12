import { checkbox, confirm, input, select } from "@inquirer/prompts";
import { spawn } from "node:child_process";
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
import { checkCommand } from "../utils/process.js";
import { ensureNoExistingWiki } from "../utils/wiki.js";

interface InitCommandOptions {
  skipPrompts: boolean;
}

const DEFAULT_LANGUAGE_PREFERENCE = "中文";
const CLAUDIAN_RELEASE_BASE_URL = "https://github.com/YishenTu/claudian/releases/latest/download";
const CLAUDIAN_PLUGIN_FILES = ["main.js", "manifest.json", "styles.css"] as const;

export async function runInitCommand(options: InitCommandOptions): Promise<void> {
  const cwd = process.cwd();
  printInitBanner(cwd, options);
  await ensureNoExistingWiki(cwd);

  await runInitPreflight(options, cwd);

  console.log("\nStep 2/4 采集 wiki 信息");
  if (!options.skipPrompts) {
    console.log("将进入引导式交互，逐步确认 wiki 描述、模板和 page types。");
  }

  const wikiName = path.basename(cwd);
  const createdAt = new Date().toISOString();
  const description = options.skipPrompts
    ? "General-purpose learning wiki."
    : await input({
        message: "描述这个 wiki 的领域或主题：",
        validate: (value) => (value.trim().length > 0 ? true : "请输入领域描述。"),
      });
  const languagePreference = options.skipPrompts
    ? DEFAULT_LANGUAGE_PREFERENCE
    : await input({
        message: "默认语言偏好（Claude 将默认用它整理内容）：",
        default: DEFAULT_LANGUAGE_PREFERENCE,
        validate: (value) => (value.trim().length > 0 ? true : "请输入默认语言偏好。"),
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

  console.log("\nStep 3/4 写入 wiki 目录结构和控制文件");
  await createWikiStructure(cwd, wikiName, description, languagePreference.trim(), template, selectedPageTypes, createdAt);

  console.log("Step 4/4 安装集成并更新全局注册表");
  await maybeInstallClaudian(cwd, options);
  await upsertRegistryEntry({
    name: wikiName,
    path: cwd,
    description,
    created: createdAt,
  });

  console.log(`Initialized wiki: ${wikiName}`);
  console.log(`Template: ${templateKey}`);
  console.log(`Path: ${cwd}`);
  await maybeOpenObsidian(cwd, wikiName, options);
  printGettingStarted(wikiName);
}

async function runInitPreflight(options: InitCommandOptions, cwd: string): Promise<void> {
  console.log("\nStep 1/4 环境预检");
  console.log(`目标目录: ${cwd}`);
  console.log("先检查当前机器是否具备推荐运行条件，再继续初始化。");
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

function printInitBanner(cwd: string, options: InitCommandOptions): void {
  console.log("llm-wiki init");
  console.log(`将在当前目录初始化 wiki: ${cwd}`);
  console.log(options.skipPrompts ? "模式: 快速初始化 (--skip)" : "模式: 引导式交互初始化");
}

function printSetupGuidance(failedChecks: Array<{ label: string; detail: string }>): void {
  for (const check of failedChecks) {
    console.log(`- ${check.label}: ${check.detail}`);
    for (const step of getRepairSteps(check.label)) {
      console.log(`  ${step}`);
    }
  }

  console.log("- `llm-wiki repair`: 仅用于 init 之后补齐缺失的 wiki 元文件，不负责安装环境依赖。");
  console.log("- Claudian: init 阶段可直接安装到 `.obsidian/plugins/claudian/`；如跳过，也可稍后手动安装。");
  console.log("  GitHub: https://github.com/YishenTu/claudian");
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
  console.log("3. 用 Obsidian 打开当前目录作为 vault；如未安装 Claudian，可重新运行 init 或手动安装。");
  console.log("   如果刚在 Obsidian 中启用官方 CLI，但当前终端仍识别不到 `obsidian`，请重新打开一个终端 tab / 窗口后再试。");
  console.log(`4. 运行 \`llm-wiki skill install ${wikiName}\`，然后开始使用 \`/wiki-ingest\`、\`/wiki-query\`、\`/wiki-lint\`。`);
}

async function maybeInstallClaudian(rootDir: string, options: InitCommandOptions): Promise<void> {
  const pluginDir = path.join(rootDir, ".obsidian", "plugins", "claudian");
  const shouldInstall = options.skipPrompts
    ? false
    : await confirm({
        message: "是否下载并安装 Claudian 到当前 vault？",
        default: true,
      });

  if (!shouldInstall) {
    console.log("Claudian: 跳过安装。");
    return;
  }

  console.log("Claudian: 开始下载 GitHub release...");

  try {
    await ensureDir(pluginDir);

    for (const fileName of CLAUDIAN_PLUGIN_FILES) {
      const response = await fetch(`${CLAUDIAN_RELEASE_BASE_URL}/${fileName}`);
      if (!response.ok) {
        throw new Error(`下载 ${fileName} 失败（HTTP ${response.status}）`);
      }

      const content = Buffer.from(await response.arrayBuffer());
      await writeTextFile(path.join(pluginDir, fileName), content.toString("utf8"));
    }

    console.log(`Claudian: 已安装到 ${pluginDir}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`Claudian: 安装失败，已保留 wiki 初始化结果。${message}`);
    console.log("可稍后手动安装，或重新运行 init / 未来的独立安装命令。");
  }
}

async function maybeOpenObsidian(rootDir: string, wikiName: string, options: InitCommandOptions): Promise<void> {
  const obsidianCli = resolveObsidianCliCommand();
  if (!obsidianCli) {
    console.log("\nObsidian");
    console.log("未检测到官方 `obsidian` CLI，跳过自动打开。");
    console.log("如果你刚在 Obsidian 里启用了官方 CLI，当前终端可能还没有拿到新的 PATH；请重新打开一个终端 tab / 窗口后再试。");
    return;
  }

  const shouldOpen = options.skipPrompts
    ? false
    : await confirm({
        message: `是否立即在 Obsidian 中打开当前 wiki（${wikiName}）？`,
        default: true,
      });

  if (!shouldOpen) {
    return;
  }

  const child = spawn(obsidianCli.command, obsidianCli.args, {
    cwd: rootDir,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();

  console.log("\nObsidian");
  console.log("已请求按当前目录打开 Obsidian，并脱离 init 进程运行。");
  console.log("后续即使中断终端里的 init 进程，Obsidian 也不会随之关闭。");
}

function resolveObsidianCliCommand(): { command: string; args: string[] } | null {
  const officialCli = checkCommand("obsidian", ["--help"]);
  if (officialCli.ok) {
    return {
      command: "obsidian",
      args: ["open", "path=wiki/index.md"],
    };
  }

  return null;
}

async function createWikiStructure(
  rootDir: string,
  wikiName: string,
  description: string,
  languagePreference: string,
  template: (typeof schemaTemplates)[TemplateKey],
  pageTypeNames: string[],
  createdAt: string,
): Promise<void> {
  const context = {
    wikiName,
    absoluteRoot: rootDir,
    cliCommand: `node ${JSON.stringify((process.argv[1] || "dist/index.js").replace(/\\/g, "/"))}`,
    domainDescription: description,
    languagePreference,
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
