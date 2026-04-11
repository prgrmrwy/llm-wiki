# wiki-ingest Specification

## Purpose
TBD - created by archiving change llm-wiki-system. Update Purpose after archive.
## Requirements
### Requirement: 两阶段顺序 ingest pipeline
`/wiki-ingest` Skill SHALL 以两阶段方式处理 source：第一阶段提取大纲和章节结构，第二阶段按顺序逐章深读并写入 wiki pages。

#### Scenario: 顺序深读保留引用链
- **WHEN** ingest 一个多章节文档
- **THEN** 第 N 章处理时，前 N-1 章生成的 wiki pages 已存在，LLM 可建立跨章节的 `[[wikilinks]]`

#### Scenario: 单章节或短文档
- **WHEN** source 无明显章节结构（短文、单页 URL）
- **THEN** 跳过大纲阶段，直接一次性处理

---

### Requirement: ingest 前读取 index.md 感知现有知识
`/wiki-ingest` SHALL 在处理任何 source 内容前，先读取 `wiki/index.md`，识别已有 pages，避免重复创建并建立正确的跨引用。

#### Scenario: 新 source 引用已有概念
- **WHEN** 新 source 提到 wiki 中已有的概念或实体
- **THEN** 更新已有 page 而非创建重复页面，并在新 pages 中使用 `[[已有页面名]]`

#### Scenario: 首次 ingest（index.md 为空）
- **WHEN** wiki 尚无任何 pages
- **THEN** 正常创建新 pages，index.md 从空白开始积累

---

### Requirement: 离线优先，ingest 时立即下载远端内容
`/wiki-ingest <url>` SHALL 在处理前将 URL 正文提取并保存为 `sources/downloaded/` 下的 Markdown 本地副本，后续处理基于该本地文件。

#### Scenario: URL ingest
- **WHEN** 用户传入 HTTP/HTTPS URL
- **THEN** 正文内容保存为 `sources/downloaded/<domain>-<timestamp>.md`
- **AND** 该副本为可直接阅读的纯文本 Markdown，而不是无后缀文件
- **AND** 后续 ingest pipeline 只基于该本地副本继续处理

#### Scenario: 本地文件 ingest
- **WHEN** 用户传入本地文件路径
- **THEN** 直接处理，不复制（sources 已是本地）

---

### Requirement: ingest 完成后更新 index.md 和 log.md
每次 ingest 完成 SHALL 追加新 pages 条目到 `wiki/index.md`，并在 `wiki/log.md` 追加一条操作记录。

#### Scenario: index.md 更新
- **WHEN** ingest 创建或更新了 pages
- **THEN** index.md 中每个受影响的 page 有一行摘要（格式：`- [[page-name]]: 一句话描述`）

#### Scenario: log.md 追加
- **WHEN** ingest 完成
- **THEN** log.md 末尾追加：时间戳、source 名称、新建 pages 数、更新 pages 数

