# llm-wiki

[English README](README.md)

- [设计理念](#设计理念)
- [你会得到什么](#你会得到什么)
- [快速开始](#快速开始)
- [理想依赖组合](#理想依赖组合)
- [llm-wiki 用法](#llm-wiki-用法)
- [Roadmap](#roadmap)

`llm-wiki` 是一个本地 CLI，用来构建基于 Obsidian 的知识工作区，既面向人类使用，也面向 AI 使用。

这个项目的核心思路来自 Andrej Karpathy 的 LLM wiki：

- https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f

同时在工程实现上借鉴了社区已经相对收敛的技术方案：

- 本地 markdown 作为唯一事实来源
- Obsidian 作为工作区和图谱 UI
- Claude Code / Claudian 作为 agent 入口
- 用轻量本地检索，而不是自建托管系统

## 设计理念

核心理念很简单：

- 知识以本地 markdown 文件保存
- 人类在 Obsidian 中浏览和编辑
- AI agent 在同一个工作区里读取、更新、ingest、query

也就是说，这个 wiki 不只是一个笔记库，它还是一个带有控制文件、schema、持久记忆和本地检索能力的 agent 工作环境。

## 你会得到什么

运行 `init` 之后，你会得到一个单一项目根目录，它同时承担：

- Obsidian vault 根目录
- Claude / Claudian 工作根目录
- `llm-wiki` 实例根目录

预期目录结构：

```text
my-wiki/
├─ .wiki/
│  ├─ config.yaml
│  ├─ context.md
│  ├─ qmd.yaml
│  └─ schema.md
├─ .obsidian/
│  └─ app.json
├─ .claude/
│  ├─ commands/
│  │  ├─ wiki-ingest.md
│  │  ├─ wiki-query.md
│  │  └─ wiki-lint.md
│  └─ skills/
│     └─ my-wiki/
│        └─ SKILL.md
├─ sources/
│  └─ downloaded/
├─ wiki/
│  ├─ index.md
│  ├─ log.md
│  └─ pages/
│     ├─ concepts/
│     ├─ resources/
│     └─ analyses/
├─ AGENTS.md
└─ CLAUDE.md
```

你还会得到：

- 一个 schema 驱动的 wiki 结构
- agent 启动时会读取的指令文件
- 存放在 `.wiki/context.md` 里的持久工作记忆
- 基于 `qmd` 的本地 query 能力
- 一套能同时服务人类和 AI 的工程布局

效果预览：

![Preview](preview.png)

## 工程设计

项目根目录被刻意设计成唯一工作根。

原因是：

- Obsidian 看到的工作区应当和 agent 看到的是同一份
- Claude / Claudian 应该读取和人类维护的是同一套控制文件
- wiki 必须保持本地化、可检查、可手工编辑，而不是依赖额外基础设施

知识内容集中放在 `wiki/` 里。控制层和环境文件放在根目录以及 `.wiki/` / `.claude/` 下。

## 快速开始

最小从零到可用的步骤：

```bash
mkdir my-wiki
cd my-wiki
node /path/to/llm-wiki/dist/index.js init
node /path/to/llm-wiki/dist/index.js skill install my-wiki
```

然后：

1. 用 Obsidian 将 `my-wiki` 打开为 vault
2. 如果还没安装 Claudian，先安装：`https://github.com/YishenTu/claudian`
3. 开始使用 `/wiki-ingest`、`/wiki-query`、`/wiki-lint`

关于 `init`：

- `preflight`：真正创建 wiki 之前，先检查本机环境
- `auto fix`：对 `Claude CLI`、`Claude Login`、`qmd` 等可自动处理项，`init` 会在交互模式下提供自动修复
- `setup guidance`：只有发现缺项时才出现，用来解释要安装什么、需要手动做什么
- `init`：随后才真正创建 wiki 文件和目录

## 理想依赖组合

如果按完整设计使用，这几部分会组合在一起：

- Obsidian
  负责 vault UI、图谱浏览和人类编辑。
- Claudian
  负责在 Obsidian 里接入 Claude Code。
- Claude Code CLI
  负责 agent 运行时。
- `llm-wiki`
  负责初始化工作区、生成控制文件，并提供本地 wiki 工作流命令。
- `qmd`
  负责可选的本地 markdown 加速检索。

理想链路大致是：

```text
Obsidian -> Claudian -> Claude Code -> llm-wiki -> qmd
```

创建 wiki 本身并不要求这条链全部就绪。`qmd` 是可选增强；如果未安装，CLI 会退回本地文本搜索。

## llm-wiki 用法

主要命令：

```bash
llm-wiki init
llm-wiki health
llm-wiki repair
llm-wiki list
llm-wiki gc
llm-wiki index
llm-wiki query "<question>" --json
llm-wiki skill install <wiki-name>
```

如果没有全局安装 `llm-wiki`，可以直接使用：

```bash
node /path/to/llm-wiki/dist/index.js <command>
```

各命令用途：

- `init`：先做环境预检，再在当前目录创建新 wiki
- `health`：检查当前环境和实例状态
- `repair`：在已有 wiki 中补齐缺失元文件
- `list`：列出全局注册表中已记录的 wiki 实例
- `gc`：清理全局注册表里已经失效的实例路径
- `index`：为当前 wiki 建立或刷新本地 qmd 索引
- `skill install`：把生成的 wiki skill 安装到 Claude Code scope
- `query`：通过 `qmd` 查询 wiki，在 embedding 不可用时自动降级

环境说明：

- Node.js 20+
- `@tobilu/qmd`（可选）
- Obsidian
- Claudian
- Claude Code CLI

跨平台说明：

- 主测平台为 Windows 和 macOS
- `Claude Login` 优先通过 `claude auth status` 检测，兼容 macOS Keychain
- `qmd` 会同时探测 PATH、`npm root -g` 和常见全局安装目录
- 仓库根 `.npmrc` 已固定使用 npm 官方 registry
- 如需手动安装 `qmd`，优先使用 `npm install -g @tobilu/qmd --registry=https://registry.npmjs.org/`

当前搜索行为：

- 如果 `qmd` 可用，就优先使用它
- 如果 `qmd` 未安装，CLI 会自动退回本地文本搜索
- 如果 `qmd` embedding 失败，CLI 会自动退回本地文本搜索
- 在 Windows 上，GPU/CUDA embedding 是否稳定取决于本机的 `qmd` / `node-llama-cpp` 组合
- GPU embedding 应视为可选加速，不应视为硬依赖

## Roadmap

当前主线 MVP 已完成，后续主要继续做这些内容：

- URL ingest 的关键图片可选同步
- Windows 下将 GPU embedding 明确为可选增强能力
- 补强 `gc`、`repair`、`lint` skill 的整体体验
- 支持用户在 Claudian 中直接记录 `llm-wiki` 待办，并落到本地 `llm-wiki` 仓库中持续迭代
- 验证某个 wiki skill 在不同模型和 Claude Code 会话中的安装、识别与调用一致性

## License

MIT
