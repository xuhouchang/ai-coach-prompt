# AI Coach Prompt v3.1 安全审计摘要

## 结论

v3.1 已将安全边界从自然语言约束升级为 capability allowlist。教学 Skill 无通用业务执行工具，测试 Prompt 即使包含文件、邮件、浏览器、Shell、Agent 或 Connector 指令，也没有对应能力可调用。

## 关键控制

| 控制项 | 状态 |
|---|---|
| 通用 Read / Write / Bash | 已移除 |
| 浏览器、消息、日历、任务、Connector | 未授权 |
| Agent / Skill 委派 | 未授权 |
| 课程资源读取 | MCP 服务端白名单 |
| Profile 身份与路径 | 服务端绑定，模型不可传入 |
| Profile 写入 | Schema 校验 + 原子替换 |
| 测试 Prompt | 原样捕获 + 独立确认页 |
| Prompt 中控制词 | 捕获状态下不解析 |
| 持久化失败 | 会话状态 / 恢复胶囊，禁止扩权 |

## 剩余风险

- 宿主必须正确执行 `allowed-tools` 白名单并加载插件 MCP server。
- 安装后应在 WorkBuddy 权限界面核对该 Skill 仅显示三个 MCP 工具。
- 任何宿主级“绕过权限”或全局自动执行模式都应关闭。


## Non-blocking interaction control

Choice pages use ordinary numbered text and do not grant `AskUserQuestion`. The default configuration is `text_nonblocking` with native question panels disabled, so the Skill does not create a host-managed interruption that can lock the input box.
