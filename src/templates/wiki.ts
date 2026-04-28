import path from "node:path";
import type { SchemaTemplate } from "../types.js";

export interface InitRenderContext {
  wikiName: string;
  absoluteRoot: string;
  cliCommand: string;
  domainDescription: string;
  languagePreference: string;
  template: SchemaTemplate;
  pageTypeNames: string[];
  createdAt: string;
  skillDescription?: string;
}

function prefersChinese(languagePreference: string): boolean {
  return /中文|汉语|汉文|chinese|zh/i.test(languagePreference);
}

export function renderConfigYaml(context: InitRenderContext): string {
  const lines = [
    `name: ${context.wikiName}`,
    `root: ${context.absoluteRoot.replace(/\\/g, "/")}`,
    `template: ${context.template.key}`,
    `created: ${context.createdAt}`,
    `languagePreference: ${context.languagePreference}`,
    `vault: .`,
    `contentDir: wiki`,
  ];
  if (context.skillDescription && context.skillDescription.trim().length > 0) {
    lines.push(`skillDescription: ${JSON.stringify(context.skillDescription)}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function defaultSkillDescription(
  context: Pick<InitRenderContext, "domainDescription" | "pageTypeNames" | "languagePreference">,
): string {
  if (prefersChinese(context.languagePreference)) {
    const pageTypeHint = context.pageTypeNames.join("、");
    return `${context.domainDescription} 领域知识库 skill；当用户询问该领域的概念、框架、经验或分析（涉及 ${pageTypeHint} 等内容）时调用，会先查询本地 wiki 再作答。`;
  }
  return `Domain knowledge base skill for ${context.domainDescription}. Use when the user asks about concepts, frameworks, experiments, or analyses in this domain (covering ${context.pageTypeNames.join(", ")}); queries the local wiki before answering.`;
}

export function resolveSkillDescription(context: InitRenderContext): string {
  if (context.skillDescription && context.skillDescription.trim().length > 0) {
    return context.skillDescription.trim();
  }
  return defaultSkillDescription(context);
}

function renderLanguagePolicy(context: InitRenderContext): string[] {
  return prefersChinese(context.languagePreference)
    ? [
        "## 语言偏好",
        `- 默认输出语言：${context.languagePreference}`,
        "- 除非用户明确要求其他语言，否则新建页面、更新页面、摘要、日志、上下文和分析都必须使用该语言。",
      ]
    : [
        "## Language Preference",
        `- Default output language: ${context.languagePreference}`,
        "- Unless the user explicitly requests another language, all new pages, updates, summaries, logs, context, and analyses must use this language.",
      ];
}

export function renderContextMarkdown(context: InitRenderContext): string {
  if (prefersChinese(context.languagePreference)) {
    return [
      "# Context",
      "",
      "## 语言偏好",
      `- 默认输出语言：${context.languagePreference}`,
      "- 除非用户明确要求其他语言，否则本文件及后续归档都使用该语言。",
      "",
      "## 当前聚焦",
      "- 待填写",
      "",
      "## 进行中任务",
      "- 待填写",
      "",
      "## 知识空白",
      "- 待填写",
      "",
      "## 上次操作",
      "- 初始化 wiki",
      "",
    ].join("\n");
  }

  return [
    "# Context",
    "",
    "## Language Preference",
    `- Default output language: ${context.languagePreference}`,
    "- Unless the user explicitly requests another language, this file and future archival content must use this language.",
    "",
    "## Current Focus",
    "- TBD",
    "",
    "## In Progress",
    "- TBD",
    "",
    "## Knowledge Gaps",
    "- TBD",
    "",
    "## Last Action",
    "- Initialized wiki",
    "",
  ].join("\n");
}

export function renderIndexMarkdown(context: InitRenderContext): string {
  return prefersChinese(context.languagePreference)
    ? [
        "# Index",
        "",
        `<!-- 默认输出语言：${context.languagePreference} -->`,
        "<!-- 每页一行摘要；由 wiki-ingest / wiki-query 归档维护 -->",
        "",
      ].join("\n")
    : [
        "# Index",
        "",
        `<!-- Default output language: ${context.languagePreference} -->`,
        "<!-- One-line summary per page; maintained by wiki-ingest / wiki-query archival flows -->",
        "",
      ].join("\n");
}

export function renderLogMarkdown(context: InitRenderContext): string {
  return prefersChinese(context.languagePreference)
    ? [
        "# Log",
        "",
        `<!-- 默认输出语言：${context.languagePreference} -->`,
        "<!-- 记录 ingest、query 归档、lint 修复等重要操作 -->",
        "",
      ].join("\n")
    : [
        "# Log",
        "",
        `<!-- Default output language: ${context.languagePreference} -->`,
        "<!-- Record important operations such as ingest, query archival, and lint fixes -->",
        "",
      ].join("\n");
}

export function renderClaudeMd(context: InitRenderContext): string {
  const pageTypes = context.pageTypeNames.join(", ");

  return [
    "# Claude Wiki Agent",
    "",
    `你是 \`${context.wikiName}\` 的专属领域 agent。领域说明：${context.domainDescription}`,
    ...renderLanguagePolicy(context),
    "",
    "## Startup",
    "- 工作目录固定为项目根目录，不要把 `wiki/` 单独当作工作根。",
    "- Obsidian Vault 根目录就是当前项目根；知识内容主要位于 `wiki/`。",
    `- 启动后优先读取 \`${path.posix.join(".wiki", "context.md")}\`，理解当前聚焦、进行中任务、知识空白和上次操作。`,
    `- 在创建或更新页面前，先阅读 \`${path.posix.join(".wiki", "schema.md")}\` 和 \`${path.posix.join("wiki", "index.md")}\`。`,
    `- 默认按“${context.languagePreference}”整理新内容和改写已有内容；只有在源材料或用户要求使其他语言更合适时再切换。`,
    "",
    "## Skills",
    "- `/wiki-ingest`: 两阶段 ingest pipeline，创建或更新 pages，并同步 index.md、log.md、context.md。",
    `- \`/wiki-query\`: 调用 \`${context.cliCommand} query --json\` 检索相关页面，读取页面后综合回答；需要时归档到 analyses。`,
    "- `/wiki-lint`: 检查死链、孤儿页、index 偏差，并在修复后更新 context.md。",
    "",
    "## Schema Reference",
    `- 当前基础模板：\`${context.template.key}\``,
    `- 当前 page types：${pageTypes}`,
    "- 页面创建必须遵循 `.wiki/schema.md` 中对应类型的模板与 cross-link 规则。",
    "",
  ].join("\n");
}

export function renderAgentsMd(context: InitRenderContext): string {
  return renderClaudeMd(context);
}

export function renderSkillMd(context: InitRenderContext): string {
  const rootArg = JSON.stringify(context.absoluteRoot.replace(/\\/g, "/"));
  const queryCommand = `${context.cliCommand} query "<question>" --root ${rootArg} --json`;
  const description = resolveSkillDescription(context);

  if (prefersChinese(context.languagePreference)) {
    return [
      "---",
      `name: ${context.wikiName}`,
      `description: ${description}`,
      "allowed-tools: Bash(node *)",
      "user-invocable: true",
      "---",
      "",
      `# ${context.wikiName}`,
      "",
      `这个 skill 覆盖的领域是：${context.domainDescription}`,
      "",
      ...renderLanguagePolicy(context),
      "",
      "## Query Flow",
      `1. 先运行 \`${queryCommand}\`。\`--root\` 已锁定到本 wiki 的绝对路径，可在任意 cwd 下调用。`,
      "2. 读取返回的页面后再回答，不要只看摘要。",
      "3. 回答里尽量使用 `[[wikilinks]]` 引用相关页面。",
      "4. 如果答案值得沉淀，就归档到 `wiki/pages/analyses/`，并更新 `wiki/index.md`、`wiki/log.md`、`.wiki/context.md`。",
      "",
      "> 调整 skill 触发文案：编辑本 wiki `.wiki/config.yaml` 中的 `skillDescription` 字段，然后运行 `llm-wiki skill install <wiki-name>` 让改动落到 user/project scope。",
      "",
    ].join("\n");
  }

  return [
    "---",
    `name: ${context.wikiName}`,
    `description: ${description}`,
    "allowed-tools: Bash(node *)",
    "user-invocable: true",
    "---",
    "",
    `# ${context.wikiName}`,
    "",
    `This skill covers the domain: ${context.domainDescription}`,
    "",
    ...renderLanguagePolicy(context),
    "",
    "## Query Flow",
    `1. Run \`${queryCommand}\`. The \`--root\` flag pins this wiki, so the command works from any cwd.`,
    "2. Read the returned pages before answering.",
    "3. Cite relevant pages using `[[wikilinks]]` in the response when possible.",
    "4. If the answer should persist, archive it into `wiki/pages/analyses/` and update `wiki/index.md`, `wiki/log.md`, `.wiki/context.md`.",
    "",
    "> Tweak the skill trigger description: edit the `skillDescription` field in this wiki's `.wiki/config.yaml`, then run `llm-wiki skill install <wiki-name>` to push the change to user/project scope.",
    "",
  ].join("\n");
}

export function renderObsidianAppConfig(): string {
  return JSON.stringify(
    {
      legacyEditor: false,
      promptDelete: false,
      showUnsupportedFiles: true,
      useMarkdownLinks: false,
      newLinkFormat: "relative",
      attachmentFolderPath: "wiki/attachments",
    },
    null,
    2,
  );
}

export function renderWikiIngestCommand(context: InitRenderContext): string {
  return [
    "# /wiki-ingest",
    "",
    `你正在维护 wiki \`${context.wikiName}\`。目标领域：${context.domainDescription}`,
    "",
    "工作约定：当前项目根目录就是 Obsidian Vault 和 Claude/Claudian 的工作根，知识内容位于 `wiki/`。",
    `默认语言偏好：${context.languagePreference}。除非用户明确要求其他语言，否则新建页面、更新页面、索引摘要、日志和上下文都使用该语言。`,
    "",
    "处理输入 source 时严格遵循以下流程：",
    "1. 先读取 `wiki/index.md`、`.wiki/schema.md`、`.wiki/context.md`，理解已有 pages、当前 schema 和当前工作状态。",
    "2. 判断 source 是 URL 还是本地文件。",
    "3. 如果是 URL，先提取正文并保存为纯文本 Markdown 副本 `sources/downloaded/<domain>-<timestamp>.md`，后续只基于该本地副本处理；不要把下载副本保存成无后缀文件。",
    "4. URL ingest 默认以正文为主，不要抓取页面全部图片；只有当图片对理解正文确实必要时，才进行关键图片同步。",
    "5. 关键图片最多同步 3 到 5 张；优先保留图表、架构图、流程图、表格截图、正文强依赖的示意图；忽略头像、装饰图、品牌横幅、无信息量配图。",
    "6. 需要保留的图片保存到 `wiki/attachments/` 或 `sources/downloaded/assets/`，文件名要规范化、可读、稳定，避免随机串或无意义名称。",
    "7. 在对应 wiki 页面中用标准 Markdown 图片引用或 Obsidian 可识别链接引用本地图片，并在图片附近附一句用途说明，解释为什么保留这张图。",
    "8. 如果文档有明显章节，先提取大纲和章节结构，再按顺序逐章深读。",
    "9. 第 N 章处理时，要复用前 N-1 章已经创建或更新的 pages，优先更新已有页面，避免重复实体。",
    "10. 新页面放到 `wiki/pages/<type>/`，type 必须来自 `.wiki/schema.md`；找不到合适类型时归入 `analyses/` 并在 `wiki/log.md` 记录。",
    "11. 所有新旧页面都尽量使用 `[[wikilinks]]` 连接相关概念、资源、分析或实体。",
    "12. ingest 完成后更新 `wiki/index.md`，每个受影响页面保持一行摘要：`- [[page-name]]: 一句话描述`。",
    "13. 在 `wiki/log.md` 末尾追加本次 ingest 的时间、source、创建页数、更新页数；如果同步或尝试同步了关键图片，也要记录图片数量、落盘位置或失败摘要。",
    "14. 如果某张关键图片抓取、复制或引用失败，只记录失败并继续完成文本 ingest；不要因为单张图片失败而放弃页面创建、页面更新或文本副本保存。",
    "15. 最后更新 `.wiki/context.md`，至少同步“进行中任务”“知识空白”“上次操作”三个 section。",
    "",
  ].join("\n");
}

export function renderWikiQueryCommand(context: InitRenderContext): string {
  return [
    "# /wiki-query",
    "",
    `你正在为 wiki \`${context.wikiName}\` 回答领域问题。`,
    "",
    "工作约定：当前项目根目录就是 Obsidian Vault 和 Claude/Claudian 的工作根，知识内容位于 `wiki/`。",
    `默认语言偏好：${context.languagePreference}。除非用户明确要求其他语言，否则回答、归档分析、索引摘要和日志都使用该语言。`,
    "",
    "处理查询时严格遵循以下流程：",
    `1. 先运行 \`${context.cliCommand} query "<question>" --json\` 获取相关 pages。`,
    "2. 如果返回为空数组，明确说明 wiki 当前没有直接命中内容，并指出可能需要 ingest 的主题。",
    "3. 读取检索返回的页面内容，再综合回答，不要只基于摘要作答。",
    "4. 回答中尽量引用相关 `[[wikilinks]]`，让用户能回到原页面。",
    "5. 如果用户要求归档，或这次回答明显值得沉淀，就在 `wiki/pages/analyses/` 新建分析页，并同步更新 `wiki/index.md` 和 `wiki/log.md`。",
    "6. 归档分支结束后，更新 `.wiki/context.md`，至少同步“当前聚焦”“上次操作”，并把新暴露的知识空白写进去。",
    "",
  ].join("\n");
}

export function renderWikiLintCommand(): string {
  return [
    "# /wiki-lint",
    "",
    "工作约定：当前项目根目录就是 Obsidian Vault 和 Claude/Claudian 的工作根，知识内容位于 `wiki/`。",
    "",
    "执行 wiki 结构和内容自检：",
    "1. 检查 `wiki/pages/` 下的死链、孤儿页，以及 `wiki/index.md` 与实际页面的偏差。",
    "2. 死链：指出引用存在但目标页面不存在的 `[[wikilinks]]`。",
    "3. 孤儿页：指出没有任何入链且未被 index 提及的页面。",
    "4. index 偏差：指出 index 中缺失的页面、已删除但仍保留的条目、摘要明显失真的条目。",
    "5. 输出修复建议；如果用户要求直接修复，再修改页面、index、log。",
    "6. 修复后更新 `.wiki/context.md` 的“上次操作”和“进行中任务”。",
    "",
  ].join("\n");
}
