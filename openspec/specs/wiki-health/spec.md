# wiki-health Specification

## Purpose
TBD - created by archiving change llm-wiki-system. Update Purpose after archive.
## Requirements
### Requirement: 环境层健康检查
`llm-wiki health` SHALL 检查全局工具依赖，对每项给出 ✓ / ✗ 状态和修复指令。

#### Scenario: 所有依赖已就绪
- **WHEN** claude CLI、Obsidian CLI 均已安装且 claude 已登录，且可选的 qmd 已安装
- **THEN** 环境层所有项显示 ✓

#### Scenario: 缺少 qmd
- **WHEN** qmd 未安装
- **THEN** 显示其为可选增强项，而不是阻塞错误
- **AND** 明确说明查询将退回本地文本搜索
- **AND** 如用户需要安装，输出安装命令：`npm install -g @tobilu/qmd --registry=https://registry.npmjs.org/`

#### Scenario: claude CLI 未登录
- **WHEN** claude 已安装但未认证
- **THEN** 显示 ✗ 并提示先执行 `claude auth status`，未登录时再执行 `claude auth login`

#### Scenario: Obsidian App 检测
- **WHEN** 执行 health 检查
- **THEN** 对 Obsidian App 本身标注"无法程序化检测"，并对 Obsidian CLI 提示用户在应用内启用官方命令行工具

#### Scenario: 缺少 Obsidian CLI
- **WHEN** Obsidian CLI 不可用
- **THEN** 显示 ✗，并明确标注其为必需环境项；不应将 wiki 视为 fully ready

---

### Requirement: Wiki 实例层健康检查
`llm-wiki health` SHALL 检查当前 wiki 实例的文件结构完整性，涵盖目录结构、配置文件、Obsidian 配置、Claudian 插件、skill 安装状态、qmd 索引。

#### Scenario: Claudian 插件检测
- **WHEN** 执行 health 检查
- **THEN** 检查 `.obsidian/plugins/claudian/manifest.json` 是否存在，存在则 ✓，否则 ✗ 并给出 BRAT 安装指引

#### Scenario: skill 未安装
- **WHEN** user scope 和 project scope 均未找到该 wiki 的 skill
- **THEN** 显示 ✗ 并输出：`llm-wiki skill install <wiki-name>`

#### Scenario: qmd 索引未建立
- **WHEN** `wiki/pages/` 有内容但 qmd 索引不存在
- **THEN** 显示 ✗ 并输出：`llm-wiki index`

#### Scenario: context.md 缺失
- **WHEN** `.wiki/context.md` 不存在（如手动删除）
- **THEN** 显示 ✗ 并输出：`llm-wiki repair`（重新生成缺失的元文件）

---

### Requirement: health 输出完整工作链路状态
health 检查结果 SHALL 以链路形式展示，清晰表达从 Obsidian → Claudian → Claude CLI → wiki skills → qmd 的每个环节状态。

#### Scenario: 链路中断定位
- **WHEN** 链路中某环节失败
- **THEN** 该环节及其下游标记为不可用，帮助用户快速定位瓶颈

#### Scenario: qmd 缺失但主链路可用
- **WHEN** qmd 未安装，但 Obsidian、Claudian、Claude CLI 和 wiki skills 均已就绪
- **THEN** 主链路仍视为可用
- **AND** qmd 仅标记为 optional

#### Scenario: 全部通过
- **WHEN** 所有检查项均 ✓
- **THEN** 输出"Wiki 已就绪，可通过项目根目录启动的 Obsidian + Claudian 或 Codex CLI 开始使用"
