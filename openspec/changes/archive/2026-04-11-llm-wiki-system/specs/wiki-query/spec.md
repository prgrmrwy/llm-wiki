## ADDED Requirements

### Requirement: CLI query 返回相关 pages（纯检索，不生成）
`llm-wiki query <question> --json` SHALL 调用 qmd 对 `wiki/pages/` 执行混合搜索，返回相关页面列表，不调用 LLM 生成回答。

#### Scenario: agent 调用 JSON 输出
- **WHEN** 外部 agent 执行 `llm-wiki query "attention mechanism" --json`
- **THEN** 返回 JSON 数组，每项包含 `path`、`score`、`excerpt`

#### Scenario: 无结果
- **WHEN** 查询词在 wiki 中无匹配
- **THEN** 返回空数组 `[]`，exit code 0

---

### Requirement: Skill query 在 Claude Code 内执行 LLM 综合回答
`/wiki-query` Skill SHALL 先调用 `llm-wiki query --json` 获取相关 pages，再读取页面内容，综合回答并附带 `[[wikilinks]]` 引用。

#### Scenario: 有相关 pages 的查询
- **WHEN** 用户在 Claude Code 中执行 `/wiki-query "holistic evaluation 和 benchmark 的关系"`
- **THEN** 回答中包含引用来源的 `[[wikilinks]]`，并提示是否将回答归档为新 analysis page

#### Scenario: 归档查询结果
- **WHEN** 用户选择归档
- **THEN** 在 `wiki/pages/analyses/` 创建新页面，内容为综合回答，更新 index.md

---

### Requirement: Skill 自动感知领域相关问题
wiki Skill 的 description SHALL 包含足够的领域关键词，使 Claude Code 在处理相关问题时自动激活，无需用户手动调用。

#### Scenario: 自动激活
- **WHEN** 用户在安装了 harness-wiki skill 的 session 中提问 harness 相关问题
- **THEN** Claude 自动调用 `llm-wiki query --json` 并将 wiki 内容纳入回答上下文
