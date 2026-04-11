## ADDED Requirements

### Requirement: 在当前目录初始化 wiki 实例
`llm-wiki init` SHALL 在执行命令的目录下创建标准 wiki 目录结构，并将该目录本身设为 Obsidian Vault 根和 Claude/Claudian 工作根，包括 `.wiki/`、`.obsidian/`、`sources/`、`wiki/` 四个顶层区域。

#### Scenario: 在空目录初始化
- **WHEN** 用户在任意空目录执行 `llm-wiki init`
- **THEN** 创建 `.wiki/config.yaml`、`.wiki/schema.md`、`.obsidian/app.json`、`sources/`、`wiki/index.md`、`wiki/log.md`、`wiki/pages/`

#### Scenario: 目录已有 wiki 实例
- **WHEN** 用户在已包含 `.wiki/` 的目录执行 `llm-wiki init`
- **THEN** 报错提示"当前目录已是 wiki 实例"，不覆盖已有内容

#### Scenario: init 前执行引导式预检
- **WHEN** 用户执行 `llm-wiki init`
- **THEN** 在 schema 问答前先执行环境 health 检查
- **AND** 输出缺失项和修复建议
- **AND** 在继续初始化前征询用户是否继续

#### Scenario: 需要手动修复的依赖
- **WHEN** health 检测到缺失项或存在无法自动修复的环境步骤
- **THEN** init 明确说明手动修复方法
- **AND** 对 Claudian 插件提供安装指引，包含 `https://github.com/YishenTu/claudian`

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
init SHALL 在项目根目录写入最小化 `.obsidian/app.json`，使实例根可直接被 Obsidian "Open folder as vault" 打开，同时知识内容保留在 `wiki/` 子目录。

#### Scenario: Obsidian 配置生成
- **WHEN** init 完成
- **THEN** `.obsidian/app.json` 存在，包含基础配置（关闭安全模式、启用 wikilinks），Obsidian 打开的 Vault 根是项目根而不是 `wiki/` 子目录

---

### Requirement: 初始化时生成 CLAUDE.md
init SHALL 根据 schema 内容生成 `CLAUDE.md`，供 Claude Code / Claudian 读取，包含 wiki 操作指令和 schema 引用。

#### Scenario: CLAUDE.md 生成
- **WHEN** init 完成
- **THEN** 项目根目录存在 `CLAUDE.md`，包含 agent 身份定义、可用 skill 说明、启动读取 context.md 的指令，并明确要求以项目根为工作目录

---

### Requirement: 初始化时自动生成 wiki skill 文件
init SHALL 在 `.claude/skills/<wiki-name>/` 生成 `SKILL.md`，包含 wiki 的领域描述和搜索调用指令，供后续 `skill install` 使用。

#### Scenario: Skill 文件生成
- **WHEN** init 完成
- **THEN** `.claude/skills/<wiki-name>/SKILL.md` 存在，description 字段包含领域关键词，allowed-tools 允许通过 Node 调用当前 `llm-wiki` CLI

---

### Requirement: init 完成后提供开始使用指引
init SHALL 在完成结构创建后，输出下一步操作说明，覆盖 health、repair、Obsidian/Claudian 和 skill install。

#### Scenario: 输出开始使用步骤
- **WHEN** init 完成
- **THEN** 控制台输出按顺序说明：health 检查、repair 用途、Obsidian/Claudian 手动步骤、skill install 与后续 `/wiki-*` 使用方式
