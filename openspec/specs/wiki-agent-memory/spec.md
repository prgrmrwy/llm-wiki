# wiki-agent-memory Specification

## Purpose
TBD - created by archiving change llm-wiki-system. Update Purpose after archive.
## Requirements
### Requirement: init 时生成 agent 身份定义文件
`llm-wiki init` SHALL 生成 `CLAUDE.md`，供 Claude Code / Claudian 读取，包含：wiki 领域身份、可用 skill 说明、启动时读取 context.md 的指令。

#### Scenario: Claude Code 通过 Claudian 打开 vault
- **WHEN** Claudian 以 wiki 实例根目录为工作目录启动 Claude Code，且 Obsidian 打开的 Vault 根也是该目录
- **THEN** Claude 读取 `CLAUDE.md`，知道自己是该领域 wiki 的专属 agent，读取 `context.md` 了解当前状态

---

### Requirement: init 时生成 context.md 初始模板
`llm-wiki init` SHALL 在 `.wiki/context.md` 生成结构化初始模板，包含固定 sections：当前聚焦、进行中任务、知识空白、上次操作。

#### Scenario: 初始状态
- **WHEN** wiki 刚初始化
- **THEN** `.wiki/context.md` 存在，各 section 为空占位符，agent 首次启动时可直接填写

---

### Requirement: agent 在重要操作后更新 context.md
ingest / query 归档 / lint 修复等操作的 Skill 指令 SHALL 包含"完成后更新 `.wiki/context.md`"的步骤，维护跨 session 的工作状态。

#### Scenario: ingest 完成后更新
- **WHEN** `/wiki-ingest` 完成一批 pages 的创建和更新
- **THEN** `context.md` 的"上次操作"和"进行中"sections 反映最新状态

#### Scenario: 发现知识空白
- **WHEN** ingest 或 query 过程中发现某个概念缺少页面或引用断裂
- **THEN** agent 将其追加到 `context.md` 的"知识空白" section

---

### Requirement: context.md 跨 session 持久可见
`context.md` 的内容 SHALL 在每个新 Claude Code session 启动时通过 CLAUDE.md 指令被读取，确保 agent 能延续上次会话的工作状态。

#### Scenario: 跨 session 状态延续
- **WHEN** 用户关闭 Obsidian 后重新打开，Claudian 启动新 session
- **THEN** Claude 从项目根读取 `CLAUDE.md` 与 `.wiki/context.md`，感知上次留下的进度和未完成项，无需用户重新说明
