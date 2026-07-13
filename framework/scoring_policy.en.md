# Scoring Policy

## Core Rules

1. Round 1 and Round 2 are scored independently.
2. Round 2 must resubmit `task_type_selection`, `missing_information_list`, and `rewritten_prompt`, plus a `revision_note`.
3. `final_score_after_retry = round_2.total_score`.
4. No Round 1 dimension score is automatically reused in Round 2.
5. The total score is the weighted sum of all scoring dimensions that count toward the total score.
6. `workflow_readiness` is displayed as observation-only and does not count toward total score.

## Scored Dimensions

The scoring dimensions for `AI_coach_prompt` are:

- `task_type_diagnosis`
- `missing_information_diagnosis`
- `task_clarity`
- `input_definition`
- `context_completion`
- `output_contract`
- `acceptance_criteria`
- `prompt_executability`

The sum of these scoring weights must equal `100`.

## Formula-Based Thresholds

Component thresholds must be formula-based, not hard-coded by ad hoc exceptions.

For any dimension:

`dimension_min_score = dimension_weight * component_threshold_ratio`

Where:

- `dimension_weight` is the maximum weighted points for that dimension.
- `component_threshold_ratio` is the minimum performance ratio required by policy for that dimension.

Example:

- If `output_contract.weight = 12`
- and `component_threshold_ratio = 0.60`
- then `dimension_min_score = 12 * 0.60 = 7.2`

This allows the policy to calculate pass requirements consistently without freezing every component to a fixed point cutoff.

## Recommended Threshold Terms

- `pass_line = total_possible_score * pass_ratio`
- `excellence_line = total_possible_score * excellence_ratio`
- `dimension_min_score = dimension_weight * component_threshold_ratio`

Suggested policy values for this package:

- `total_possible_score = 100`
- `pass_ratio = 0.70`
- `excellence_ratio = 0.90`
- `component_threshold_ratio = 0.60`

These values can be tuned at the module or deployment layer without changing the skill logic.

> **Deployment override (current package):** the deployed thresholds are
> `pass_line = 75` and `excellence_line = 90` (see `retry_rule.en.yaml` and
> `save_spec.en.yaml`). If you change these, update all three files together.

## Round 2 Evaluation

Round 2 uses the same rubric and weight map as Round 1.

The evaluator must:

1. Ignore prior numeric scores when scoring Round 2.
2. Re-evaluate the new task type diagnosis.
3. Re-evaluate the new missing information diagnosis.
4. Re-evaluate the rewritten prompt end to end.
5. Compute a new total score.
6. Report `final_score_after_retry` using the Round 2 total only.

## Reporting Format

Each round should report:

- dimension scores
- total score
- retry mode
- triggered failure patterns
- observation-only `workflow_readiness`
- save eligibility

## Save Eligibility Dependency

A reusable template should only be saved when:

- the learner completes Round 2
- the final score meets or exceeds the pass line
- no critical failure pattern remains unresolved
- the rewritten output has stable variable slots suitable for reuse
