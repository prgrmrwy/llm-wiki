## 1. Spec

- [x] 1.1 修改 `wiki-ingest` spec，定义 URL ingest 的关键图片同步为可选资源同步
- [x] 1.2 在 spec 中补充关键图片保留/忽略规则
- [x] 1.3 在 spec 中补充同步数量上限、落盘位置、命名规范、页面引用和日志要求
- [x] 1.4 在 spec 中补充图片抓取失败不阻塞文本 ingest 的要求

## 2. Prompt

- [x] 2.1 更新 `/wiki-ingest` 指令模板，先提取正文，再按规则判断是否同步关键图片
- [x] 2.2 在 `/wiki-ingest` 指令模板中加入“最多 3 到 5 张关键图片”的限制
- [x] 2.3 在 `/wiki-ingest` 指令模板中加入页面图片引用和用途说明要求
- [x] 2.4 在 `/wiki-ingest` 指令模板中加入 `wiki/log.md` 的图片同步记录要求
- [x] 2.5 在 `/wiki-ingest` 指令模板中加入图片失败不阻塞正文 ingest 的约束

## 3. Follow-up Decision

- [ ] 3.1 评估仅靠 prompt 约束时的稳定性是否足够
- [ ] 3.2 如果 prompt 侧漂移或失败率过高，再单独提案是否新增 CLI 稳定下载器
- [ ] 3.3 评估 Windows 环境下是否默认禁用 qmd GPU embedding，并将本地向量索引设为可选增强能力
