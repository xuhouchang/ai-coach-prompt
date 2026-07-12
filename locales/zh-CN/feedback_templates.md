## 评分结果

总分: {{total_score}} / 100  
评级: {{score_band_zh}}

### 维度评分

| 维度 | 分数 | 判断 |
|---|---:|---|
| 任务类型判断 | {{task_type_diagnosis_score}} / 10 | {{task_type_diagnosis_comment}} |
| 缺失信息诊断 | {{missing_information_diagnosis_score}} / 10 | {{missing_information_diagnosis_comment}} |
| 任务目标清晰 | {{task_clarity_score}} / 12 | {{task_clarity_comment}} |
| 输入材料明确 | {{input_definition_score}} / 13 | {{input_definition_comment}} |
| 上下文完整 | {{context_completion_score}} / 13 | {{context_completion_comment}} |
| 输出约定明确 | {{output_contract_score}} / 15 | {{output_contract_comment}} |
| 验收标准明确 | {{acceptance_criteria_score}} / 17 | {{acceptance_criteria_comment}} |
| Prompt 可执行性 | {{prompt_executability_score}} / 10 | {{prompt_executability_comment}} |

### 你做对了什么

{{strengths}}

### 当前主要问题

{{weaknesses}}

### 检测到的错误模式

{{detected_failure_patterns}}

### 第二轮修改重点

{{retry_instruction_zh}}

请直接修复下面 {{retry_focus_count}} 个问题：

{{retry_focus}}

### 修改建议

{{revision_advice}}

---

## 扩展观察：工作流沉淀潜力

{{workflow_readiness_note}}

这个观察不计入总分，用来判断这条 Prompt 后续是否适合沉淀成模板、Skill 或 Workflow 节点。
