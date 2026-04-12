import path from "node:path";
import { getQmdIndexStatePaths, isQmdAvailable } from "../utils/qmd.js";
import { loadInitRenderContext } from "../utils/init-context.js";
import { exists, getUserHome, pathHasWiki } from "../utils/fs.js";
import { checkCommand } from "../utils/process.js";
import { detectWikiRoot } from "../utils/wiki.js";

export interface CheckRow {
  label: string;
  ok: boolean;
  detail: string;
}

export async function runHealthCommand(): Promise<void> {
  const envChecks = await buildEnvironmentChecks();
  const wikiRoot = await detectWikiRoot();

  console.log("Environment");
  printChecks(envChecks);

  if (!wikiRoot) {
    console.log("\nInstance");
    console.log("- ✗ 当前目录不在 wiki 实例内。");
    return;
  }

  const instanceChecks = await buildInstanceChecks(wikiRoot);
  console.log(`\nInstance (${wikiRoot})`);
  printChecks(instanceChecks);

  console.log("\nChain");
  printChain(instanceChecks, envChecks);
}

export async function buildEnvironmentChecks(): Promise<CheckRow[]> {
  const claudeInstalled = checkCommand("claude", ["--version"]);
  const qmdInstalled = await isQmdAvailable();
  const obsidianCliCheck = detectObsidianCli();
  const claudeAuthCandidates = [
    path.join(getUserHome(), ".claude", ".credentials.json"),
    path.join(getUserHome(), ".config", "claude-code", "auth.json"),
  ];
  const claudeLoggedIn = claudeInstalled.ok
    && (await Promise.all(claudeAuthCandidates.map((candidate) => exists(candidate)))).some(Boolean);

  return [
    {
      label: "Claude CLI",
      ok: claudeInstalled.ok,
      detail: claudeInstalled.ok ? "已安装" : "缺失，安装：npm install -g @anthropic-ai/claude-code",
    },
    {
      label: "Claude Login",
      ok: claudeLoggedIn,
      detail: claudeLoggedIn ? "检测到本地 Claude 凭据" : "未检测到登录状态，运行 `claude` 完成登录",
    },
    {
      label: "qmd",
      ok: qmdInstalled,
      detail: qmdInstalled ? "已安装" : "缺失，安装：bun install -g @tobilu/qmd",
    },
    {
      label: "Obsidian CLI",
      ok: obsidianCliCheck.ok,
      detail: obsidianCliCheck.ok
        ? obsidianCliCheck.detail
        : "必需项缺失；请在 Obsidian 中启用官方命令行工具（命令名通常为 `obsidian`）",
    },
    {
      label: "Obsidian App",
      ok: true,
      detail: "无法程序化检测，请手动确认桌面应用已安装",
    },
  ];
}

function detectObsidianCli(): { ok: boolean; detail: string } {
  const officialCli = checkCommand("obsidian", ["--help"]);
  if (officialCli.ok) {
    return { ok: true, detail: "已安装" };
  }

  const legacyCli = checkCommand("obsidian-cli", ["--help"]);
  if (legacyCli.ok) {
    return { ok: true, detail: "已安装（legacy obsidian-cli）" };
  }

  const combinedOutput = `${officialCli.output}\n${legacyCli.output}`.trim();
  if (combinedOutput.includes("The CLI is unable to find Obsidian")) {
    return { ok: true, detail: "已安装；当前需要桌面应用处于运行状态" };
  }

  const whereOfficial = checkCommand("where.exe", ["obsidian"]);
  if (whereOfficial.ok) {
    return { ok: true, detail: "已安装" };
  }

  const whereLegacy = checkCommand("where.exe", ["obsidian-cli"]);
  if (whereLegacy.ok) {
    return { ok: true, detail: "已安装（legacy obsidian-cli）" };
  }

  return { ok: false, detail: "" };
}

async function buildInstanceChecks(wikiRoot: string): Promise<CheckRow[]> {
  const context = await loadInitRenderContext(wikiRoot);
  const wikiName = context.wikiName;
  const projectSkill = path.join(wikiRoot, ".claude", "skills", wikiName, "SKILL.md");
  const userSkill = path.join(getUserHome(), ".claude", "skills", wikiName, "SKILL.md");
  const projectSkillInstalled = await exists(projectSkill);
  const userSkillInstalled = await exists(userSkill);
  const skillInstalled = projectSkillInstalled || userSkillInstalled;

  const qmdIndexCandidates = getQmdIndexStatePaths(wikiRoot);
  const hasQmdIndex = (await Promise.all(qmdIndexCandidates.map((candidate) => exists(candidate)))).every(Boolean);
  const hasObsidianConfig = await exists(path.join(wikiRoot, ".obsidian", "app.json"));
  const hasClaudianPlugin = await exists(path.join(wikiRoot, ".obsidian", "plugins", "claudian", "manifest.json"));

  return [
    {
      label: ".wiki/",
      ok: await pathHasWiki(wikiRoot),
      detail: "wiki 根目录标记",
    },
    {
      label: ".wiki/schema.md",
      ok: await exists(path.join(wikiRoot, ".wiki", "schema.md")),
      detail: "schema 定义",
    },
    {
      label: ".wiki/context.md",
      ok: await exists(path.join(wikiRoot, ".wiki", "context.md")),
      detail: "跨 session 工作记忆；缺失可运行 `llm-wiki repair`",
    },
    {
      label: "CLAUDE.md",
      ok: await exists(path.join(wikiRoot, "CLAUDE.md")),
      detail: "Claude Code/Claudian 指令入口",
    },
    {
      label: "AGENTS.md",
      ok: await exists(path.join(wikiRoot, "AGENTS.md")),
      detail: "兼容其他 agent 客户端；缺失可运行 `llm-wiki repair`",
    },
    {
      label: "Obsidian config",
      ok: hasObsidianConfig,
      detail: "Vault 根目录下的 Obsidian 最小配置",
    },
    {
      label: "Claudian plugin",
      ok: hasClaudianPlugin,
      detail: "已检测到 Claudian 插件；缺失时请安装到 `.obsidian/plugins/claudian`",
    },
    {
      label: "Skill install",
      ok: skillInstalled,
      detail: skillInstalled
        ? "已安装到 project 或 user scope"
        : `未安装，运行 \`llm-wiki skill install ${wikiName}\``,
    },
    {
      label: "qmd index",
      ok: hasQmdIndex,
      detail: hasQmdIndex
        ? "检测到 qmd 索引 marker"
        : "未检测到完整索引状态，运行 `llm-wiki index`",
    },
  ];
}

export function printChecks(checks: CheckRow[]): void {
  for (const check of checks) {
    console.log(`- ${check.ok ? "✓" : "✗"} ${check.label}: ${check.detail}`);
  }
}

function printChain(instanceChecks: CheckRow[], envChecks: CheckRow[]): void {
  const envMap = new Map(envChecks.map((check) => [check.label, check.ok]));
  const instanceMap = new Map(instanceChecks.map((check) => [check.label, check.ok]));

  const claudianReady = Boolean(instanceMap.get("Claudian plugin"));
  const claudeReady = Boolean(envMap.get("Claude CLI")) && Boolean(envMap.get("Claude Login"));
  const skillReady = Boolean(instanceMap.get("Skill install"));
  const qmdReady = Boolean(envMap.get("qmd")) && Boolean(instanceMap.get("qmd index"));

  const chain = [
    ["Obsidian", true],
    ["Claudian", claudianReady],
    ["Claude CLI", claudeReady],
    ["Wiki Skills", skillReady],
    ["qmd", qmdReady],
  ] as const;

  let upstreamBlocked = false;
  for (const [label, ok] of chain) {
    const available = !upstreamBlocked && ok;
    console.log(`- ${label}: ${available ? "✓" : "✗"}${upstreamBlocked && ok ? " (上游未就绪)" : ""}`);
    upstreamBlocked ||= !ok;
  }
}
