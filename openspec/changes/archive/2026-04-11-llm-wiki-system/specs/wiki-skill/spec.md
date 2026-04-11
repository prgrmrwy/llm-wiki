## ADDED Requirements

### Requirement: 手动安装 skill 并选择 scope
`llm-wiki skill install <wiki-name>` SHALL 交互式询问安装范围（user scope 或 project scope），并将 skill 文件复制到对应位置。

#### Scenario: 安装到 user scope
- **WHEN** 用户选择 user scope
- **THEN** skill 复制到 `~/.claude/skills/<wiki-name>/SKILL.md`，所有 Claude Code 会话可用

#### Scenario: 安装到 project scope
- **WHEN** 用户选择 project scope
- **THEN** skill 复制到当前目录 `.claude/skills/<wiki-name>/SKILL.md`，仅当前项目可用

#### Scenario: wiki-name 不在注册表中
- **WHEN** 指定的 wiki-name 不存在
- **THEN** 报错并列出可用的 wiki 名称

---

### Requirement: skill 文件包含必要的元数据和调用指令
生成的 `SKILL.md` SHALL 包含：`name`、`description`（领域关键词）、`allowed-tools: Bash(llm-wiki *)`、`user-invocable: false`，以及 query 调用指令模板。

#### Scenario: skill 内容完整性
- **WHEN** skill 被 Claude Code 加载
- **THEN** Claude 知道：这个 wiki 的主题、如何调用 `llm-wiki query --json`、如何解读返回结果
