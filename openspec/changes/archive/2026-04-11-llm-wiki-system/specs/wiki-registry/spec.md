## ADDED Requirements

### Requirement: init 时自动注册到全局注册表
`llm-wiki init` 完成后 SHALL 将 wiki 信息写入 `~/.llm-wiki/registry.yaml`，包含 name、path、description、created 字段。

#### Scenario: 首次注册
- **WHEN** `~/.llm-wiki/registry.yaml` 不存在
- **THEN** 创建文件并写入第一条 wiki 记录

#### Scenario: 追加注册
- **WHEN** registry.yaml 已存在
- **THEN** 追加新条目，不影响已有记录

---

### Requirement: list 命令显示所有 wiki 并检测路径存活
`llm-wiki list` SHALL 读取注册表，对每条记录检测 `.wiki/` 目录是否存在，以不同状态标识展示。

#### Scenario: 正常显示
- **WHEN** 所有 wiki 路径均存在
- **THEN** 以表格格式显示 name、status(active)、path、description

#### Scenario: 路径已删除
- **WHEN** 某 wiki 的目录不再存在
- **THEN** 该条目标记 status 为 `missing`，提示用户运行 `llm-wiki gc`

---

### Requirement: gc 命令清理失效条目
`llm-wiki gc` SHALL 从注册表中移除所有 status 为 missing 的条目，并提示用户确认。

#### Scenario: 确认清理
- **WHEN** 用户确认
- **THEN** 从 registry.yaml 中删除失效条目，输出清理数量
