# 从 v3.0 迁移到 v3.1

## 权限变化

v3.0 的 `allowed-tools: Read, Write` 已删除。v3.1 只允许：

- `mcp__ai-coach-profile__course_resource_get`
- `mcp__ai-coach-profile__profile_get`
- `mcp__ai-coach-profile__profile_patch`

旧的 `learner_profiles/<id>.json` 不再由模型直接读写。需要迁移历史数据时，由管理员离线映射到 v2 schema，随后放入插件私有数据目录；不要临时恢复通用 Write 权限。

## 测试链路变化

旧链路：`Prompt 输入 → 分类`。

新链路：`Prompt 捕获 → 学习材料确认 → 分类 → 节点覆盖 → 雷达评分`。

任何直接测试请求也必须经过确认页。

## 安装方式

v3.1 按 WorkBuddy Plugin 方式分发，插件同时提供 Skill 和 bounded MCP profile server。
