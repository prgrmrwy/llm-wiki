## MODIFIED Requirements

### Requirement: 离线优先，ingest 时立即下载远端内容
`/wiki-ingest <url>` SHALL 在处理前将 URL 正文提取并保存为 `sources/downloaded/` 下的 Markdown 本地副本，后续处理基于该本地文件；对于图片资源，系统 SHALL 将其视为可选的关键资源同步，而不是默认全量抓取页面图片。

#### Scenario: URL ingest 默认只同步正文
- **WHEN** 用户传入 HTTP/HTTPS URL
- **THEN** 正文内容保存为 `sources/downloaded/<domain>-<timestamp>.md`
- **AND** 该副本为可直接阅读的纯文本 Markdown，而不是无后缀文件
- **AND** 后续 ingest pipeline 只基于该本地副本继续处理
- **AND** 不要求默认抓取页面全部图片资源

#### Scenario: 仅同步理解正文确实必要的图片
- **WHEN** URL 页面中存在图片
- **THEN** 只同步对理解正文确实必要的关键图片本地副本
- **AND** 优先保留图表、架构图、流程图、表格截图、正文强依赖的示意图
- **AND** 默认忽略头像、装饰图、品牌横幅、无信息量配图

#### Scenario: 关键图片数量受限
- **WHEN** 单个 URL 页面中存在多个候选关键图片
- **THEN** 单次 ingest 最多同步 3 到 5 张关键图片
- **AND** 超出上限时优先保留信息密度最高、与正文联系最强的图片

#### Scenario: 图片落盘并在页面中引用
- **WHEN** 关键图片被判定需要同步
- **THEN** 图片保存到 `wiki/attachments/` 或 `sources/downloaded/assets/`
- **AND** 文件名使用规范化命名，避免随机串或不可读名称
- **AND** 对应 wiki 页面使用标准 Markdown 图片引用或 Obsidian 可识别链接引用本地副本
- **AND** 每张插入的图片附近附一行用途说明，解释该图为何被保留

#### Scenario: 图片失败不阻塞正文 ingest
- **WHEN** 某张关键图片下载、复制或引用失败
- **THEN** 文本 ingest 仍然完成
- **AND** 失败情况记录到 `wiki/log.md`
- **AND** 不因为单张图片失败而放弃页面创建、页面更新或文本副本保存

#### Scenario: 记录图片同步结果
- **WHEN** URL ingest 同步了关键图片，或尝试同步但出现失败
- **THEN** `wiki/log.md` 记录本次同步的图片数量、目标页面或 source，以及失败项摘要
