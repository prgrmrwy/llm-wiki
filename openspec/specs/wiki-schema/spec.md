# wiki-schema Specification

## Purpose
TBD - created by archiving change llm-wiki-system. Update Purpose after archive.
## Requirements
### Requirement: 提供四种基础领域模板
系统 SHALL 内置 `research`、`engineering`、`investment`、`learning` 四种 schema 模板，init 引导时根据用户描述自动选择最近的模板作为起点。

#### Scenario: 自动匹配模板
- **WHEN** 用户描述领域为"AI 评估框架研究"
- **THEN** 选择 `research` 模板，其 page types 包含 `papers/`、`concepts/`、`analyses/`

#### Scenario: 用户覆盖模板选择
- **WHEN** 用户在引导中手动选择不同模板
- **THEN** 使用用户指定的模板，忽略自动匹配结果

---

### Requirement: schema 定义 page types 和页面模板
`schema.md` SHALL 包含该 wiki 的 page type 列表，每种 type 有对应的页面模板（必填字段、推荐结构、cross-link 规则）。

#### Scenario: LLM 遵循 schema 创建页面
- **WHEN** ingest 时需要创建新页面
- **THEN** LLM 读取 schema.md 中对应 type 的模板，按模板结构创建页面

#### Scenario: schema 中无匹配 type
- **WHEN** ingest 遇到 schema 未定义的内容类型
- **THEN** 归入 `analyses/` 并在 log.md 中记录，提示用户考虑更新 schema

---

### Requirement: schema 可迭代更新
用户 SHALL 能直接编辑 `schema.md` 来调整 page types 和模板，更新后的 schema 在下次 ingest 时自动生效。

#### Scenario: 新增 page type
- **WHEN** 用户在 schema.md 中添加新 type（如 `experiments/`）
- **THEN** 下次 ingest 时 LLM 可使用新 type 创建页面，无需其他操作

