# Changelog

## 3.1.2

- 默认交互改为 `text_nonblocking`：所有选择页使用可输入的编号文字选项，不再授予或调用 `AskUserQuestion`。
- 新增“一页一回合”屏障：页面状态须在输出前保存；页面输出后立即结束回合，只有新的非空用户消息才能迁移。
- Profile 增加当前页面、待用户动作、允许动作及交互模式字段，并对旧 v2 Profile 自动补齐安全默认值。
- 新增文本交互契约测试，覆盖默认零面板调用、独立回合、模糊输入不推进和 Prompt 原样捕获。

## 3.1.1

- Restored WorkBuddy native multiple-choice panels by explicitly allowing and requiring `AskUserQuestion`.
- Added deterministic mapping from `single_choice` and `multi_choice` pages to native controls.
- Prevented duplicate Markdown bullet options when native controls are available.
- Kept the external-side-effect boundary unchanged: only profile MCP tools can persist data.

## 3.1.0

- 移除通用 Read/Write 权限，改为三个 bounded MCP tools。
- 新增插件私有 profile store，工具不接受路径或 learner ID。
- 新增测试 Prompt 原样捕获与确认状态，禁止直接进入分类。
- 新增严格 learner profile schema、原子写入和长度限制。
- 新增 MCP 协议测试、路径穿越测试与安全静态校验。
- 修复 resources 未完整声明、validator 与审计报告不一致的问题。

## 3.0.0

- 将交互改为严格的一页一目标状态机。
- 将 Prompt 定义、提示词玄学、五维质量模型拆成三个独立页面。
- 六类 Prompt 改为 N 节点对应 N 个输入页面。
- 新增自由输入、采用建议、不太明白、跳过节点的统一响应语义。
- 新增节点解释子页面，解释时保持原节点序号。
- 新增多类型学习循环、学习进度和中断恢复机制。
- 最终测试拆分为分类、节点覆盖和雷达评分三个页面。
- 新增 `learning_scenarios.en.yaml` 和确定性 Prompt 合并脚本。
- 构建脚本改为从 manifest 自动读取版本。
- 更新验证器与回归测试，检查评估型必须生成 6 个节点页面。

## 2.0.0

- 重构正常教学状态机，真实 Prompt 进入主线。
- 个性化问卷由 7 题压缩为 4 题。
- 六类任务及节点统一到单一事实源。
- 八维内部评分替换为五维公开雷达评分。
- 新增静态 HTML 雷达报告生成器。
