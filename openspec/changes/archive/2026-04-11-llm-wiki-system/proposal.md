## Why

个人领域学习和研究缺乏持续积累机制——每次问 LLM 都是从零开始，知识无法跨 session 复用。基于 Karpathy 的 LLM Wiki 模式，构建一个以 Claude Code Skill 为核心、Obsidian 为浏览器的本地知识管理系统，让知识随时间复利增长。

## What Changes

- 新增 `llm-wiki` CLI 工具（TypeScript），负责项目初始化、全局注册表管理、skill 部署和 agent 友好的搜索接口
- 新增 Claude Code Skill 集合（SKILL.md），驱动 ingest / query / lint 三个核心 LLM 操作
- 新增 wiki 目录结构规范：项目根同时作为 Claude/Claudian 工作根和 Obsidian Vault 根；`.wiki/` 存元数据，`sources/` 存原始资料，`wiki/` 存知识内容
- 新增 `CLAUDE.md`（Claude Code / Claudian 读取），配合 `.wiki/context.md` 动态工作记忆实现跨 session 持久状态
- 新增 qmd 集成，提供本地 BM25 + vector 混合搜索
- 新增 health 检查命令，验证必需环境依赖（claudian、Obsidian CLI、qmd、claude CLI）和 wiki 实例完整性

## Capabilities

### New Capabilities

- `wiki-init`: 在任意目录初始化一个 wiki 实例，引导生成领域 schema，注册到全局表
- `wiki-ingest`: 两阶段顺序 ingest pipeline（outline → 逐章深读），离线优先，保留引用链
- `wiki-query`: agent 友好的搜索接口，包装 qmd，`--json` 输出供其他 agent 消费
- `wiki-skill`: skill 生命周期管理（生成、安装到 user/project scope、卸载）
- `wiki-registry`: 全局 wiki 注册表，路径存活检测，支持 gc 清理失效条目
- `wiki-schema`: 领域 schema 模板系统（research / engineering / investment / learning），引导式生成 CLAUDE.md
- `wiki-agent-memory`: agent 持久记忆层——CLAUDE.md 定义 agent 身份和能力，`.wiki/context.md` 维护跨 session 的动态工作记忆
- `wiki-health`: 环境和实例健康检查，验证完整工作链路（Obsidian + Claudian + Claude CLI + qmd + wiki 结构），定位缺失环节并给出修复指令

### Modified Capabilities

## Impact

- 新增 CLI 包：`llm-wiki`（TypeScript / Bun）
- 依赖：`qmd`（搜索引擎，TypeScript/Bun）
- 每个 wiki 实例根目录本身就是标准 Obsidian Vault，可直接用 Obsidian 打开；知识页面集中在 `wiki/`
- Skill 安装到 `~/.claude/skills/` 或 `.claude/skills/`，影响 Claude Code 会话上下文
- 全局注册表写入 `~/.llm-wiki/registry.yaml`
