## 1. CLI 项目初始化

- [x] 1.1 初始化 TypeScript/Bun 项目结构，配置 `package.json`、`tsconfig.json`、入口 `src/index.ts`
- [x] 1.2 集成 CLI 框架（推荐 `commander` 或 `citty`），注册顶层命令：`init`、`list`、`query`、`skill`、`gc`
- [x] 1.3 实现全局注册表读写模块（`~/.llm-wiki/registry.yaml`），含创建、追加、读取、删除操作
- [x] 1.4 实现路径存活检测工具函数

## 2. wiki-init

- [x] 2.1 实现目录结构创建逻辑（`.wiki/`、`.obsidian/`、`sources/`、`wiki/pages/`）
- [x] 2.2 生成 `.obsidian/app.json` 最小化 Obsidian 配置
- [x] 2.3 实现交互式引导问答（领域描述、page type 选择/确认）
- [x] 2.4 实现四种基础 schema 模板（research / engineering / investment / learning）
- [x] 2.5 基于用户输入和模板生成 `schema.md`
- [x] 2.6 生成 `wiki/index.md`（空模板）和 `wiki/log.md`（空模板）
- [x] 2.7 生成 `CLAUDE.md`（引用 schema，包含 agent 身份定义和 wiki 操作指令）
- [x] 2.8 生成 `.claude/skills/<wiki-name>/SKILL.md`（含领域关键词 description 和 query 调用指令）
- [x] 2.9 将 wiki 信息写入全局注册表

## 3. wiki-registry（list / gc）

- [x] 3.1 实现 `llm-wiki list`：读取注册表、检测路径存活、格式化表格输出
- [x] 3.2 实现 `llm-wiki gc`：过滤 missing 条目、用户确认、写回注册表

## 4. wiki-skill（install）

- [x] 4.1 实现 `llm-wiki skill install <wiki-name>`：从注册表读取 wiki 路径，找到 SKILL.md
- [x] 4.2 实现 scope 交互式选择（user: `~/.claude/skills/` / project: `.claude/skills/`）
- [x] 4.3 复制 SKILL.md 到目标 scope 目录，处理目录不存在的情况

## 5. wiki-query（CLI 搜索层）

- [x] 5.1 集成 qmd，封装为 `llm-wiki query <question>` 命令
- [x] 5.2 实现 `--json` 输出模式（path、score、excerpt 数组）
- [x] 5.3 实现 qmd 索引初始化（init 时后台建立，或首次 query 时触发）
- [x] 5.4 实现 wiki 路径自动检测（向上查找 `.wiki/`，类 git 模式）

## 6. Skill 内容开发（LLM 操作层）

- [x] 6.1 编写 `/wiki-ingest` Skill 指令：两阶段 pipeline、读 index.md、创建/更新 pages、更新 index.md 和 log.md
- [x] 6.2 编写 `/wiki-query` Skill 指令：调用 `llm-wiki query --json`、读取相关 pages、综合回答、可选归档
- [x] 6.3 编写 `/wiki-lint` Skill 指令：检测死链、孤儿页、index.md 与实际 pages 的偏差
- [x] 6.4 在 CLAUDE.md 模板中集成三个 Skill 的调用说明和 schema 引用

## 7. Schema 模板完善

- [x] 7.1 完善 `research` 模板（page types: papers / concepts / analyses，含页面模板）
- [x] 7.2 完善 `engineering` 模板（page types: frameworks / concepts / experiments / analyses）
- [x] 7.3 完善 `investment` 模板（page types: companies / theses / events / concepts / analyses）
- [x] 7.4 完善 `learning` 模板（page types: concepts / resources / analyses，最通用）

## 8. Agent 持久记忆

- [x] 8.1 设计 `CLAUDE.md` 模板：wiki 身份声明、skill 能力列表、启动读取 context.md 的指令、schema 引用
- [x] 8.2 设计 `.wiki/context.md` 初始模板：当前聚焦、进行中、知识空白、上次操作四个 section
- [x] 8.3 在 `/wiki-ingest` Skill 指令末尾添加更新 context.md 的步骤
- [x] 8.4 在 `/wiki-query` 归档分支添加更新 context.md 的步骤
- [x] 8.5 验证：关闭并重新打开 Claudian 后，新 session 能正确读取上次 context.md 状态

## 9. Health 检查

- [x] 9.1 实现 `llm-wiki health` 命令框架，分环境层和实例层两个检查组
- [x] 9.2 实现环境层检查：claude CLI 安装 + 登录状态、qmd 安装、Obsidian CLI 安装
- [x] 9.3 实现实例层检查：`.wiki/` 目录结构、CLAUDE.md、AGENTS.md、context.md、schema.md
- [x] 9.4 实现 Claudian 插件检测（`.obsidian/plugins/claudian/manifest.json`）
- [x] 9.5 实现 skill 安装状态检测（user scope + project scope 双路径检查）
- [x] 9.6 实现 qmd 索引状态检测
- [x] 9.7 实现链路形式输出，断点标注下游不可用
- [x] 9.8 实现 `llm-wiki repair` 命令，重新生成缺失的元文件（context.md、index.md 等）

## 10. 端到端验证

- [x] 10.1 在 `D:/research/harness-engineering` 执行 `llm-wiki init`，完整走通引导流程
- [x] 10.2 ingest 一个 URL，验证两阶段 pipeline、pages 创建、index.md 更新
- [x] 10.3 ingest 一个 URL，验证离线下载和处理
- [x] 10.4 执行 `llm-wiki skill install harness-engineering`，验证 skill 安装到两种 scope
- [x] 10.5 在另一个 Claude Code session 中验证 skill 自动激活和 query 调用
- [x] 10.6 执行 `llm-wiki list` 和 `llm-wiki gc`，验证注册表管理
- [x] 10.7 用 Obsidian 打开 wiki 实例根目录，验证 `wiki/` 内容区中的 [[wikilinks]] 图谱正常渲染
- [x] 10.8 执行 `llm-wiki health`，验证完整链路输出和缺失项提示
- [x] 10.9 验证关闭重开 Claudian 后，context.md 跨 session 状态延续正常
