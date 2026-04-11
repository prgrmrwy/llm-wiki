## Context

基于 Karpathy LLM Wiki 模式的个人领域知识管理系统。用户已有 Claude Code 订阅，核心诉求是知识跨 session 持续积累，而非每次从零推理。

当前状态：空白项目，从头构建。

主要约束：
- 纯本地，不依赖外部服务
- 复用已有 Claude Code 订阅，不引入独立 API 调用
- 用户是前端背景，主力技术栈 TypeScript

## Goals / Non-Goals

**Goals:**
- `llm-wiki init` 在任意目录创建独立 wiki 实例，引导生成领域 schema
- wiki pages 符合 Obsidian Vault 格式，可直接用 Obsidian + Claudian 打开操作
- Skill 驱动 LLM 操作（ingest / query / lint），复用 Claude Code 订阅
- CLI 提供元操作（init、注册表、skill 部署、agent 友好搜索）
- qmd 提供本地混合搜索，`--json` 输出供其他 agent 消费

**Non-Goals:**
- 不构建独立 Web UI
- 不自行调用 LLM API（不引入 API key 和 token 计费）
- 不做 wiki 间的知识同步或合并
- 不做云端备份或多设备同步

## Decisions

### D1：LLM 集成用 Skill 而非子进程

**决策**：wiki 的 ingest / query / lint 操作实现为 Claude Code Skill（SKILL.md），不通过 `claude -p` 子进程调用。

**原因**：社区已收敛此方案。Skill 运行在用户已有的 Claude Code 会话中，无需额外认证，无 token 计费。子进程方案增加复杂度且无额外收益。

**替代方案**：`claude -p` + Monitor 后台调用 → 需要管理进程生命周期，增加错误处理复杂度，放弃。

---

### D2：wiki 层采用 Obsidian Vault 格式

**决策**：wiki 实例根目录初始化为标准 Obsidian Vault（根目录含 `.obsidian/` 基础配置），知识内容集中存放在 `wiki/` 子目录，页面使用 `[[wikilinks]]`。

**原因**：Obsidian + Claudian 提供免费的图谱浏览、双向链接、全文搜索和 Claude Code 侧栏操作，覆盖原本计划自建的 Web UI 的全部需求。将 Vault 根、Claude/Claudian 工作根、CLI wiki 根统一到实例根目录，可以让 agent 稳定读取 `CLAUDE.md`、`.wiki/context.md`、`.claude/` 等控制层文件，同时把知识内容继续收敛到 `wiki/` 目录。`[[wikilinks]]` 是 Obsidian 原生格式，图关系自动建立。

**替代方案**：自建 Web UI → 开发成本高，功能不如 Obsidian 成熟，放弃。

---

### D2.1：根目录作为工作根，`wiki/` 作为内容根

**决策**：Claude/Claudian 的工作目录、Obsidian Vault 根目录、`llm-wiki` CLI 的 wiki 根目录统一为实例根目录；`wiki/` 只承担知识内容区职责。

**原因**：如果只把 `wiki/` 当作 Vault/工作目录，而把 `CLAUDE.md`、`.wiki/`、`.claude/`、`sources/` 留在上层，agent 指令发现、跨 session 记忆读取和相对路径心智模型都会变得不稳定。统一根目录后，环境感知最稳定；Obsidian 即使看到非内容目录，也只是轻微界面成本。

**替代方案**：只将 `wiki/` 打开为 Vault，并通过桥接文件回溯上层环境 → 可行但更脆弱，放弃。

---

### D3：搜索层用 qmd，不自建

**决策**：`llm-wiki query --json` 包装 qmd（BM25 + vector 混合搜索），不自行实现搜索。

**原因**：qmd 是 TypeScript/Bun 实现，与 CLI 技术栈一致，本地运行无外部依赖，支持 `--json` 输出，有 MCP server 版本（`ehc-io/qmd`）可选。自建搜索无法在短期内达到同等质量。

**替代方案**：纯全文搜索（grep）→ 无语义理解，效果差，放弃。

---

### D4：index.md 作为跨 session 记忆桥梁

**决策**：维护轻量的 `wiki/index.md`（每页一行摘要），Skill 在每次操作前强制读取，作为 LLM 感知现有知识的唯一入口。

**原因**：每个 Claude Code session 上下文独立，无法感知历史。index.md 是成本最低的持久化方案——LLM 读一个文件即可了解全部 wiki 现状，决定创建新页面还是更新已有页面。

**替代方案**：向量数据库持久化嵌入 → 引入重型依赖，过度工程化，放弃。

---

### D5：page type 由 domain schema 定义

**决策**：wiki 目录结构中 `wiki/pages/[type]/xxx.md` 的 type 列表在 init 时引导生成，写入 `schema.md`，不硬编码。

**原因**：不同领域需要不同的实体类型（harness engineering 需要 `papers/` `frameworks/`；investment 需要 `companies/` `theses/`）。只有 `analyses/` 是所有 wiki 通用的 type（LLM 综合产物）。

---

### D6：全局注册表用 YAML 文件 + 路径存活检测

**决策**：`~/.llm-wiki/registry.yaml` 记录所有 wiki 实例的名称、路径、描述、创建时间。`llm-wiki list` 时检测路径是否存在，标记 missing 条目。

**原因**：Windows 软链需要管理员权限，跨平台兼容性差。YAML 注册文件简单可靠，路径检测足以满足"感知目录是否删除"的需求。

## Risks / Trade-offs

**[Skill 指令漂移]** → LLM 在不同 session 可能对相同指令产生不同解读，导致页面格式不一致。
缓解：schema.md 提供严格的页面模板，lint 操作定期检测格式偏差。

**[index.md 规模上限]** → wiki 页面数量极多时（>1000 页），index.md 可能超出上下文窗口。
缓解：index.md 每条控制在 1 行以内；超出时可分级为 `index/[type].md`；此问题在 MVP 阶段不会出现。

**[qmd 冷启动成本]** → qmd 首次建立索引需要时间，本地模型下载耗时。
缓解：init 时提示用户，后台异步建立索引，不阻塞 ingest 操作。

**[Obsidian 依赖]** → 用户需要安装 Obsidian 才能获得完整浏览体验。
缓解：wiki 层是纯 markdown，任何编辑器均可打开；Obsidian 是推荐但非必须。

## Open Questions

- Obsidian CLI 的关系查询能力是否值得在 MVP 后集成，作为 qmd 的补充（图关系查询 vs 语义搜索）？
- schema 模板的四个基础类型（research / engineering / investment / learning）是否覆盖主要场景，还是需要更多？
