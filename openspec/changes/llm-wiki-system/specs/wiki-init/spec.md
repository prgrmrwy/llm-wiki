## ADDED Requirements

### Requirement: 在当前目录初始化 wiki 实例
`llm-wiki init` SHALL 在执行命令的目录下创建标准 wiki 目录结构，包括 `.wiki/`、`sources/`、`wiki/` 三个顶层目录。

#### Scenario: 在空目录初始化
- **WHEN** 用户在任意空目录执行 `llm-wiki init`
- **THEN** 创建 `.wiki/config.yaml`、`.wiki/schema.md`、`sources/`、`wiki/index.md`、`wiki/log.md`、`wiki/pages/`、`wiki/.obsidian/`

#### Scenario: 目录已有 wiki 实例
- **WHEN** 用户在已包含 `.wiki/` 的目录执行 `llm-wiki init`
- **THEN** 报错提示"当前目录已是 wiki 实例"，不覆盖已有内容

---

### Requirement: 初始化时引导生成领域 schema
`llm-wiki init` SHALL 通过交互式问答引导用户描述领域，并调用 LLM 生成初始 `schema.md`。

#### Scenario: 完整引导流程
- **WHEN** 用户完成领域描述和 page type 确认
- **THEN** `schema.md` 包含：领域描述、page type 列表及各类型模板、命名规范、cross-link 建议规则

#### Scenario: 用户选择跳过引导
- **WHEN** 用户在引导时输入 `--skip`
- **THEN** 使用 `learning` 基础模板写入 `schema.md`，后续可手动修改

---

### Requirement: 初始化时生成 Obsidian Vault 配置
init SHALL 在 `wiki/` 目录下写入最小化 `.obsidian/app.json`，使其可直接被 Obsidian "Open folder as vault" 打开。

#### Scenario: Obsidian 配置生成
- **WHEN** init 完成
- **THEN** `wiki/.obsidian/app.json` 存在，包含基础配置（关闭安全模式、启用 wikilinks）

---

### Requirement: 初始化时生成 CLAUDE.md
init SHALL 根据 schema 内容生成 `CLAUDE.md`，供 Claude Code / Claudian 读取，包含 wiki 操作指令和 schema 引用。

#### Scenario: CLAUDE.md 生成
- **WHEN** init 完成
- **THEN** 项目根目录存在 `CLAUDE.md`，包含 agent 身份定义、可用 skill 说明、启动读取 context.md 的指令

---

### Requirement: 初始化时自动生成 wiki skill 文件
init SHALL 在 `.claude/skills/<wiki-name>/` 生成 `SKILL.md`，包含 wiki 的领域描述和搜索调用指令，供后续 `skill install` 使用。

#### Scenario: Skill 文件生成
- **WHEN** init 完成
- **THEN** `.claude/skills/<wiki-name>/SKILL.md` 存在，description 字段包含领域关键词，allowed-tools 包含 `Bash(llm-wiki *)`
