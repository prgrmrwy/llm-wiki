## Why

当前 `wiki-ingest` 只定义了 URL 正文的离线 Markdown 副本，没有规定图片资源如何处理。实际 URL 资料里，部分图表、架构图、流程图和信息性截图对理解正文是必要的，但头像、品牌横幅和装饰图并不值得默认抓取。

如果继续保持“文本之外一概不管”，会导致 wiki 页面在阅读时丢失关键上下文；如果反过来默认抓全站图片，又会让 ingest 变成高噪音、高失败率的资源同步流程。

需要把 URL ingest 的图片处理明确为“可选的关键资源同步”，先约束 skill 行为和 spec，再决定是否补 CLI 级稳定下载器。

## What Changes

- 修改 `wiki-ingest` 能力定义：URL ingest 默认只提取正文文本，图片同步是可选步骤
- 新增关键图片筛选规则，只保留对理解内容确实必要的图片
- 新增图片同步上限、落盘位置、命名规范、页面引用方式和日志要求
- 新增失败降级要求：图片抓取失败不得阻塞文本 ingest
- 在 design 中记录阶段策略：先做 spec/prompt 约束，再决定是否引入 CLI 稳定下载器

## Capabilities

### Modified Capabilities

- `wiki-ingest`: URL ingest 支持“可选关键图片同步”，最多同步少量高价值图片，并将其插入页面供 Obsidian/Markdown 直接查看

## Impact

- 影响 `wiki-ingest` 的规范和 prompt 约束
- 后续实现可能涉及 `wiki/attachments/` 或 `sources/downloaded/assets/` 的资源落盘
- `wiki/log.md` 将需要记录图片同步结果
- 本变更不要求立即实现新的 CLI 下载命令
