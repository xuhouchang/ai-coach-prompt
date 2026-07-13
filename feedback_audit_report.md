# AI-coach-prompt 反馈提示词审计报告

> 审计范围：本项目所有「面向学员的反馈 / 提示词」逻辑、策略与质量
> 审计时间：2026-07-12
> 说明：本报告只评估、不改动任何代码与配置。所有问题附 `文件:行号` 证据，便于后续修复。

---

## 一、总体结论

反馈体系整体设计水准较高：认知模型统一（"Prompt = 任务规格书"）、五槽位框架贯穿始终、失败模式库（15 条）写得具体可执行、体验模块（玄学检测 / X-Ray / 压力测试 / 升级判断）各有清晰的心智钩子与隐藏内部字段的规则。

但存在 **1 个功能性断点 + 2 个高优先级逻辑矛盾 + 若干中低优先级一致性问题**，集中在「反馈判定规则」与「实际编排」的衔接处。最严重的一条：**玄学检测器对外宣称能识别"万能质量词堆砌"，但引擎根本没有对应的检测条目**——属于"承诺了但做不到"。

---

## 二、审计覆盖的反馈面

| # | 反馈面 | 主文件 |
|---|--------|--------|
| 1 | 评分后教练卡（strengths / focus / replacement / next） | `locales/zh-CN/feedback_templates.md` + `rubric.en.yaml` + `system_instructions.en.md` 规则 6–8 |
| 2 | 失败模式诊断反馈 | `failure_patterns.en.yaml`（feedback_zh / repair_action_zh） |
| 3 | 重做引导反馈 | `retry_rule.en.yaml`（localized_instruction_zh） |
| 4 | 玄学检测反馈 | `modules/module0_myth_detector.en.yaml` + `locales/zh-CN/myth_detector.md` |
| 5 | X-Ray 扫描反馈 | `modules/module1_xray.en.yaml` + `locales/zh-CN/xray.md` + `xray_widget.html` |
| 6 | 压力测试反馈 | `modules/module2_crash_test.en.yaml` + `locales/zh-CN/crash_test.md` |
| 7 | 升级判断反馈 | `modules/module3_upgrade_judgment.en.yaml` + `locales/zh-CN/upgrade_judgment.md` |
| 8 | 存档反馈 | `save_spec.en.yaml` + `locales/zh-CN/save_template.md` |
| 9 | 关卡流转反馈 | `locales/zh-CN/next_step.md` |

---

## 三、发现清单（按优先级）

| 编号 | 问题 | 严重度 | 位置 |
|------|------|--------|------|
| F1 | 玄学检测器无法识别"万能质量词堆砌"(F12)，但对外宣称能检测 | 🔴 高 | `module0_myth_detector.en.yaml:19-103` 缺 F12 条目；`myth_detector.md:38` 公开宣称 |
| F2 | "高分值缺陷必须重做"原则与 retry_rule 冲突：system 指令要求高 severity 即重做，retry_rule 仅按分数 | 🔴 高 | `system_instructions.en.md:64` vs `retry_rule.en.yaml:6-15` |
| F3 | 存档门槛 `no_high_severity_failure_patterns` 与 `high_severity_blockers` 列表矛盾，漏掉 F09（指令冲突） | 🟠 中高 | `save_spec.en.yaml:39-42` vs `failure_patterns.en.yaml:88-97` |
| F4 | 文档化 pass_line=70，运行实际用 75，三处阈值口径不一 | 🟡 中 | `framework/scoring_policy.en.md:57` vs `retry_rule/rubric/save_spec` 用 75 |
| F5 | X-Ray 就绪分档位语义与 rubric / retry 阈值冲突（同一 0-100 标尺两种解读） | 🟡 中 | `module1_xray.en.yaml:187-202` vs `rubric.en.yaml:132-148` |
| F6 | 失败模式库未显式接入教练卡生成，repair_action 未被强制使用 | 🟡 中 | `rubric.en.yaml:121-126` + `system_instructions.en.md:204-205` |
| F7 | 重做聚焦优先级漏掉高 severity 的 F09，却包含中/低 severity 项 | 🟡 中 | `retry_rule.en.yaml:17-25` 缺 F09 |
| F8 | 五槽位术语漂移："背景" vs "上下文/使用场景/给谁用" | 🟢 低 | `failure_patterns.en.yaml:87` vs `save_template.md`/`render_policy.en.yaml` |
| F9 | `next_action` 占位符无内容规范 | 🟢 低 | `feedback_templates.md:13-15` |

---

## 四、逐项详述

### 🔴 F1 — 玄学检测器"检测万能质量词"是空头承诺

**证据**
- `modules/module0_myth_detector.en.yaml` 的 `myth_catalog` 共 6 个条目，映射到的失败码为：F10、F10、F11、F15、F14、F13 —— **完全没有 `maps_to_failure_pattern: F12`**。
- 同一文件 `failure_pattern_refs`（行 10–16）却列了 F10–F15，包含 F12。
- 同一文件 `in_loop_usage.output_flags`（行 121–128）含 `recognizes_generic_quality_words`（对应质量词）。
- 公开材料 `locales/zh-CN/myth_detector.md:38` 的表格明确列出"堆砌质量词"为可检测类型。
- `system_instructions.en.md:146-152` Module 0 列出的 6 类中也含 `quality_padding`。

**影响**
- 引擎永远无法命中"万能质量词堆砌"，学员粘贴带"全面、深入、专业"的 Prompt 时，检测器沉默。
- 公开的 `myth_detector.md` 与 `system_instructions` 都承诺能检测，属"承诺了做不到"，损害可信度。
- `recognizes_generic_quality_words` 标志永远置不上，导致 `module0` 设计的"Round1 改写重复玄学时显式点出"逻辑对该类失效（死代码路径）。

**建议**
- 在 `myth_catalog` 补一条 `id: quality_padding`，`maps_to_failure_pattern: F12`，含关键词（全面、深入、高质量、专业、详尽、完美等）与替换示例，映射到 `acceptance_criteria` 槽位（与 F12 的 repair_action 一致：改成具体维度/字数/结构）。

---

### 🔴 F2 — "高 severity 缺陷必须重做"与 retry_rule 自相矛盾

**证据**
- `system_instructions.en.md:64`：*"A retry is required only when the first submission has one or more high-severity gaps, or when it is below the usable threshold."*（高 severity 缺口 **或** 低于可用阈值 → 必须重做）
- `retry_rule.en.yaml:6-15` 的三档只按分数：`>=90` 可选、`>=75` 定向优化、`<75` 修复重做。**没有任何"高 severity 即重做"分支。**

**影响**
- 一份得分 80 但含 F09（指令冲突，high）或 F02（任务对象缺失，high）的提交，按 system 指令必须重做，按 retry_rule 只是"targeted_improvement"（重做可选）。
- 编排层（state_flow `retry_required`）只认 retry_rule，于是高 severity 缺陷可能被放过、不强制重做。
- 而存档门槛又要求 `no_high_severity_failure_patterns`，结果学员**既不重做、也存不了档**，卡在一个尴尬态（只能"完成"但不存档）。原则与执行脱节。

**建议**
- 在 `retry_rule.round_1_score_rules` 增加显式分支：若命中任一 high-severity 失败模式，则 `retry_mode: repair_retry`（与分数无关）；或在 `retry_required` 判定中明确 `high_severity_gap == true → retry_required`。
- 同步澄清 system 指令第 64 行的"usable threshold"应定义为 75，消除"低于可用阈值"的模糊表述。

---

### 🟠 F3 — 存档"无高 severity"门槛自相矛盾，漏 F09

**证据**
- `save_spec.en.yaml:39-42` `high_severity_blockers` 仅 3 项：missing_task_object(F02)、missing_source_material(F03)、missing_task_specific_variables(F04)。
- `save_spec.en.yaml:8-13` `save_condition` 含 `no_high_severity_failure_patterns == true`（泛指"没有任何高 severity 残留"）。
- 但 `failure_patterns.en.yaml:88-97` F09 `conflicting_instructions` 的 `severity: high`。

**影响**
- 两条规则冲突：泛指条款会拦截 F09，但显式 blockers 列表不会。模型/执行若读 blockers 列表，则带"指令互相打架"的 Prompt 可被存档——而这是严重的可执行性缺陷，不该放行。
- 与 F2 叠加：F09 既不在 retry 聚焦优先级（见 F7），也不在存档 blockers，是整条反馈链里被"双重忽视"的高 severity 项。

**建议**
- 将 F09 加入 `high_severity_blockers`；或把 `no_high_severity_failure_patterns` 改为"指 blockers 列表内任一项未解决"，二选一统一口径，避免歧义。

---

### 🟡 F4 — pass_line 文档 70 / 运行 75 口径不一

**证据**
- `framework/scoring_policy.en.md:57` 建议 `pass_ratio = 0.70` → pass_line = 70；`excellence_ratio = 0.90`。
- 实际编排：`retry_rule` 在 75 处分档、`rubric.score_bands` 75–89 为"通过"、`save_spec` 与 `state_flow.gating_rules` 均用 `final_score_after_retry >= 75`。

**影响**
- 读 `scoring_policy` 的人会以为 70 即过关，但系统 70–74 段实际是"部分达标"且触发 `repair_retry`、且不能存档。
- `scoring_policy` 虽注明"可在部署层调参"，但文档未标注"实际已调为 75"，读者无从得知，属文档漂移。
- 间接放大 F2：system 指令第 64 行的"usable threshold"因此无明确数字来源。

**建议**
- 在 `scoring_policy.en.md` 加一行"实际部署阈值：pass=75、excellence=90（见 retry_rule / save_spec）"，或把建议值直接改为 75，使文档与运行一致。

---

### 🟡 F5 — X-Ray 就绪分档位与 rubric/retry 阈值语义冲突

**证据**
- `module1_xray.en.yaml:187-202` 档位：90–100 可执行 / 60–89 基本可执行 / 0–59 未充分定义。
- `locales/zh-CN/xray.md:31-35` 同口径（60–89 "基本可执行"听起来"还行"）。
- `rubric.en.yaml:132-148` 档位：75–89 通过 / 60–74 部分达标（"仍需 WorkBuddy 猜关键变量"）/ 0–59 需要重做。
- `retry_rule` 在 75 触发重做。

**影响**
- 同一 0–100 标尺、同一学员，X-Ray 给 65 标"基本可执行"，评分给 65 标"部分达标"+ 强制重做。两套反馈对同一个数字给出相反的情绪信号，学员易困惑。
- X-Ray 只覆盖 5 个维度、rubric 覆盖 8 个，二者无显式换算/说明，分数可能大幅背离（如 X-Ray 85 但 rubric 60），却无任何"为何不同"的解释。

**建议**
- 在 X-Ray 反馈或认知层明确：X-Ray 是"执行就绪（少猜多少）"诊断分，与正式评分（含任务类型判断、缺失信息诊断）不是同一把尺；或把 X-Ray 的 60–89 改称"有缺口，需补槽位"，弱化"基本可执行"的过关暗示，与 retry 阈值对齐。

---

### 🟡 F6 — 失败模式库未显式接入教练卡生成

**证据**
- `rubric.en.yaml:121-126` 只枚举了教练卡 4 个区块（strengths/focus/replacement/next），未要求这些区块内容来自 `detected_failure_patterns`。
- `system_instructions.en.md:204-205` 规则 7 仅说"选最多 2 个真正缺失/冲突的项，按阻塞程度排序"，靠模型自行推断。
- `failure_patterns.en.yaml` 每条都写了 `feedback_zh` 与 `repair_action_zh`，但没有任何指令强制把 `repair_action_zh` 填入教练卡的 `replacement_skeleton`。

**影响**
- 精心编写的 15 条失败反馈与修复话术，**未被强制使用**，实际教练卡质量依赖模型临场发挥，可能偏离规范 taxonomy。
- 失败库与反馈生成之间是"软连接"，存在话术漂移风险（不同会话给出不一致的诊断措辞）。

**建议**
- 在 `system_instructions` 规则 7 末尾加一句：*"focus_repairs 与 replacement_skeleton 必须直接取自本回合 detected_failure_patterns 的 feedback_zh / repair_action_zh，不得另起炉灶。"*

---

### 🟡 F7 — 重做聚焦优先级漏掉高 severity 的 F09

**证据**
- `retry_rule.en.yaml:17-25` `priority_order`：missing_source_material(F03) → missing_task_specific_variables(F04) → missing_task_object(F02) → missing_acceptance_criteria(F07) → missing_output_contract(F06) → missing_audience_or_use_case(F05) → wrong_task_type(F01) → overexpanded_without_structure(F08)。
- **F09（conflicting_instructions, high）不在列表中。**

**影响**
- 聚焦逻辑会优先呈现中/低 severity 项，却可能忽略"指令互相冲突"这一高 severity 缺陷——与"按阻塞程度排序、先修最关键"的原则背道而驰。与 F3 叠加，F09 在整条反馈链里最被忽视。

**建议**
- 在 `priority_order` 顶部加入 `conflicting_instructions`（F09），置于 high-severity 组内（紧随 F02/F03/F04 之后）。

---

### 🟢 F8 — 五槽位术语漂移（"背景" vs "上下文/使用场景"）

**证据**
- `failure_patterns.en.yaml:87` F08 repair：*"按任务、输入、背景、输出、验收五段重新组织"* —— 用"背景"。
- 规范五槽位：`save_template.md` 用【使用场景/读者对象】；`render_policy.en.yaml` 短标签为 做什么/基于什么/给谁用/交付什么/怎样算好；`module0` 的 `replacement_slot` 用 `context_completion`；`goal.en.yaml` 用 "context"。

**影响**
- "背景"偏向"来龙去脉"，而真实第三槽位是"受众 / 业务用途 / 给谁看"。术语不一致会让学员误解该填什么。

**建议**
- F08 的 repair_action 改为"任务、输入、使用场景（给谁看）、输出、验收"五段，与规范对齐。

---

### 🟢 F9 — `next_action` 占位符无内容规范

**证据**
- `feedback_templates.md:13-15` 有 `{{next_action}}`，但全仓库无该占位符的内容约定；system 指令规则 8 仅暗示"进入迁移练习或完成"。

**影响**
- 低。但不同回合的"下一步"可能口径不一（有时说迁移、有时说重做、有时说完成），缺少统一措辞约束。

**建议**
- 在 `rubric.review_output_format` 或 system 指令补一句：next_action 按当前 retry_mode 给出（可选优化 / 定向修复 / 修复重做 / 迁移练习 / 完成），保持与 retry_rule 一致。

---

## 五、做得好的地方（应在修复时保留）

1. **统一心智模型**："Prompt = 任务规格书，不是咒语"贯穿 cognition / myth / xray / crash / upgrade，认知一致性强。
2. **失败模式库质量高**：F01–F15 的 `feedback_zh` 与 `repair_action_zh` 具体、可操作、不空泛，是中英双语里少见的"既指出问题又给替换"的写法。
3. **内部字段隐藏规则严密**：`system_instructions` 规则 1–10 明确禁止暴露字段名、维度分、权重、workflow_readiness，防泄漏做得到位。
4. **X-Ray HUD 安全处理**：`xray_widget.html` 明确要求先 HTML 转义再注入 `{{PROMPT}}`，避免 XSS，且是 one-shot 揭示而非循环动画，工程细节到位。
5. **难度分层反馈策略**：`routing.en.yaml` 的 `feedback_style`（more_explanatory / balanced / direct）与 `max_retry_focus_items`（2/2/3）分层合理。
6. **教练卡结构克制**：4 段式（做对什么 / 重点 / 直接改 / 下一步）+ 末尾"保留已清楚的部分"，符合"一次只改 1–2 处"的教学节奏。

---

## 六、修复优先级建议（仅排序，未改动代码）

| 顺序 | 编号 | 动作 | 工作量 |
|------|------|------|--------|
| P0 | F1 | 补 `myth_catalog` 的 quality_padding 条目（含关键词+替换示例） | 小 |
| P0 | F2 | retry_rule 增加"高 severity 即重做"分支，统一 retry_required 判定 | 小 |
| P1 | F3 | F09 纳入 `high_severity_blockers` 或统一 no_high_severity 口径 | 小 |
| P1 | F7 | retry 聚焦优先级加入 F09 | 极小 |
| P2 | F4 | 对齐 scoring_policy 文档与实际阈值（75/90） | 极小 |
| P2 | F5 | X-Ray 档位措辞与 rubric/retry 对齐，说明两把尺不同 | 小 |
| P2 | F6 | system 指令显式要求教练卡取自 detected_failure_patterns | 极小 |
| P3 | F8 | F08 repair 术语改"使用场景/给谁看" | 极小 |
| P3 | F9 | 补 `next_action` 内容规范 | 极小 |

> 注：P0 两项（F1、F2）建议本轮必须修——F1 是"承诺了做不到"的可信度问题，F2 是判定逻辑直接矛盾、会导致高 severity 缺陷被放过。

---

## 修复记录（2026-07-12，已应用并复测通过）

用户确认后已直接修复，源文件、执行器与安装包均已同步。旧的“12 项全绿”只是配置层专项检查，不能证明真实交付可运行；现已从源码重建并通过标准自动评估（101/101、0 失败）。

| 项 | 文件 | 改动 |
|---|---|---|
| F1 P0 | `modules/module0_myth_detector.en.yaml` | 在 `myth_catalog` 新增 `quality_padding` 条目（命中"全面/深入/专业/高质量"等万能质量词，替换示例改为具体可执行表述），`maps_to_failure_pattern: F12`；`recognizes_generic_quality_words` 标志与 Round1 强化逻辑现在可真正触发 |
| F2 P0 | `retry_rule.en.yaml` | 新增顶层 `high_severity_override` 块：`any_high_severity_failure_pattern_present == true` 即 `repair_retry` 且 `overrides_score_rules: true` |
| F3 P1 | `save_spec.en.yaml` | `high_severity_blockers` 增加 `conflicting_instructions`（对应高 severity 的 F09 指令冲突） |
| F7 P1 | `retry_rule.en.yaml` | `retry_focus_selection.priority_order` 增加 `conflicting_instructions` |
| F4 P2 | `framework/scoring_policy.en.md` | 文档补注实际运行阈值统一为 75/90（与 retry_rule、rubric 一致） |
| F5 P2 | `modules/module1_xray.en.yaml` + `locales/zh-CN/xray.md` | 60–89 档位措辞与 rubric「部分达标/触发重做」对齐，说明 X-Ray 标尺与评分标尺不同 |
| F6 P2 | `system_instructions.en.md` + `rubric.en.yaml` | 显式要求教练卡取自 `detected_failure_patterns`；rubric 增加 `next_action` 引导 |
| F8 P3 | `failure_patterns.en.yaml` | F08 repair 术语统一为"使用场景/给谁看"，消除"背景"漂移 |
| F9 P3 | `rubric.en.yaml` | 补充 `next_action` 内容规范 |

> 验证：标准 `automated-eval` 101/101 通过，包含新增回归：`retry_high_severity_override_01`（95 分但命中 F09 必须 `repair_retry`）与 `save_fail_conflicting_instructions`（F09 禁止存档）。

---

*报告结束。*
