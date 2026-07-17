#!/usr/bin/env python3
"""Render a self-contained Prompt assessment report from JSON.

No third-party dependencies and no network access are required.
"""
from __future__ import annotations

import argparse
import html
import json
import math
import re
from pathlib import Path
from typing import Any

DIMENSIONS = [
    ("task_goal", "任务与目标"),
    ("input_evidence", "输入与依据"),
    ("context_boundaries", "场景与边界"),
    ("output_contract", "输出契约"),
    ("acceptance_stability", "验收与稳定性"),
]
STATUS_META = {
    "complete": ("✅ 已覆盖", "#2f7d5b"),
    "partial": ("⚠️ 部分覆盖", "#b7791f"),
    "missing": ("❌ 缺失", "#b23a48"),
}


def esc(value: Any) -> str:
    return html.escape("" if value is None else str(value), quote=True)


def clamp_score(value: Any) -> int:
    try:
        number = int(round(float(value)))
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Invalid score: {value!r}") from exc
    return max(0, min(100, number))


def point(cx: float, cy: float, radius: float, angle_deg: float) -> tuple[float, float]:
    angle = math.radians(angle_deg)
    return cx + radius * math.cos(angle), cy + radius * math.sin(angle)


def polygon_points(scores: dict[str, int], radius: float, cx: float, cy: float) -> str:
    points = []
    for index, (key, _) in enumerate(DIMENSIONS):
        angle = -90 + index * 72
        r = radius * scores[key] / 100
        x, y = point(cx, cy, r, angle)
        points.append(f"{x:.1f},{y:.1f}")
    return " ".join(points)


def radar_svg(scores: dict[str, int]) -> str:
    cx, cy, radius = 180.0, 155.0, 105.0
    chunks: list[str] = []
    for pct in (20, 40, 60, 80, 100):
        ring = []
        for index in range(5):
            x, y = point(cx, cy, radius * pct / 100, -90 + index * 72)
            ring.append(f"{x:.1f},{y:.1f}")
        chunks.append(
            f'<polygon points="{" ".join(ring)}" fill="none" stroke="#d7e4eb" stroke-width="1"/>'
        )
    for index in range(5):
        x, y = point(cx, cy, radius, -90 + index * 72)
        chunks.append(f'<line x1="{cx}" y1="{cy}" x2="{x:.1f}" y2="{y:.1f}" stroke="#d7e4eb" stroke-width="1"/>')
    chunks.append(
        f'<polygon points="{polygon_points(scores, radius, cx, cy)}" fill="#2b8db2" fill-opacity="0.25" stroke="#1f6f91" stroke-width="2.5"/>'
    )
    for index, (key, label) in enumerate(DIMENSIONS):
        x, y = point(cx, cy, radius * scores[key] / 100, -90 + index * 72)
        chunks.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="#1f6f91"/>')
        lx, ly = point(cx, cy, radius + 35, -90 + index * 72)
        anchor = "middle"
        if lx < cx - 15:
            anchor = "end"
        elif lx > cx + 15:
            anchor = "start"
        chunks.append(
            f'<text x="{lx:.1f}" y="{ly:.1f}" text-anchor="{anchor}" dominant-baseline="middle" font-size="12" fill="#36566c">{esc(label)}</text>'
        )
    return "".join(chunks)


def node_rows(nodes: list[dict[str, Any]]) -> str:
    rows = []
    for node in nodes:
        status = str(node.get("status", "missing"))
        if status not in STATUS_META:
            raise ValueError(f"Unsupported node status: {status}")
        status_label, color = STATUS_META[status]
        rows.append(
            "<tr>"
            f"<td><strong>{esc(node.get('label_zh'))}</strong></td>"
            f"<td class=\"status\" style=\"color:{color}\">{status_label}</td>"
            f"<td>{esc(node.get('evidence_zh') or '—')}</td>"
            f"<td>{esc(node.get('gap_zh') or '—')}</td>"
            "</tr>"
        )
    return "".join(rows)


def metric_rows(scores: dict[str, int], previous: dict[str, int] | None) -> str:
    rows = []
    for key, label in DIMENSIONS:
        score = scores[key]
        delta = ""
        if previous and key in previous:
            d = score - previous[key]
            delta = f" ({d:+d})" if d else " (0)"
        rows.append(
            '<div class="metric">'
            f"<span>{esc(label)}</span>"
            f'<div class="bar"><div class="fill" style="width:{score}%"></div></div>'
            f"<strong>{score}{esc(delta)}</strong>"
            "</div>"
        )
    return "".join(rows)


def priority_rows(priorities: list[Any]) -> str:
    if not priorities:
        return "<li>当前没有关键缺口，可以直接执行或保存为模板。</li>"
    rows = []
    for item in priorities[:3]:
        if isinstance(item, dict):
            text = item.get("text_zh") or item.get("gap_zh") or item.get("question_zh")
        else:
            text = item
        rows.append(f"<li>{esc(text)}</li>")
    return "".join(rows)


def mini_badge(total: int) -> str:
    color = "#2f7d5b" if total >= 90 else "#b7791f" if total >= 60 else "#b23a48"
    circumference = 2 * math.pi * 38
    offset = circumference * (1 - total / 100)
    return (
        '<svg width="104" height="104" viewBox="0 0 104 104" role="img" aria-label="总分环形图">'
        '<circle cx="52" cy="52" r="38" fill="none" stroke="#e4edf2" stroke-width="9"/>'
        f'<circle cx="52" cy="52" r="38" fill="none" stroke="{color}" stroke-width="9" stroke-linecap="round" '
        f'stroke-dasharray="{circumference:.1f}" stroke-dashoffset="{offset:.1f}" transform="rotate(-90 52 52)"/>'
        '</svg>'
    )


def render(data: dict[str, Any], template: str) -> str:
    classification = data.get("classification") or {}
    nodes = data.get("node_coverage") or []
    scores_raw = data.get("radar_scores") or {}
    scores = {key: clamp_score(scores_raw.get(key, 0)) for key, _ in DIMENSIONS}
    total = clamp_score(data.get("total_score", round(sum(scores.values()) / 5)))
    previous_total = data.get("previous_total_score")
    previous_scores_raw = data.get("previous_radar_scores")
    previous_scores = None
    if isinstance(previous_scores_raw, dict):
        previous_scores = {key: clamp_score(previous_scores_raw.get(key, 0)) for key, _ in DIMENSIONS}

    secondary = classification.get("secondary_type_zh")
    secondary_html = f'<span class="pill">次类型：{esc(secondary)}</span>' if secondary else ""
    delta_text = "首次评测"
    if previous_total is not None:
        delta = total - clamp_score(previous_total)
        delta_text = f"较首次评测 {delta:+d} 分"

    revised = data.get("revised_prompt")
    revised_section = ""
    if revised:
        revised_section = (
            '<section class="card section"><h2>优化后的 Prompt</h2>'
            f'<div class="revised">{esc(revised)}</div></section>'
        )

    replacements = {
        "{{REPORT_TITLE}}": esc(data.get("report_title_zh") or "Prompt 评测报告"),
        "{{PRIMARY_TYPE}}": esc(classification.get("primary_type_zh") or "待判断"),
        "{{CONFIDENCE}}": esc(classification.get("confidence_zh") or "待判断"),
        "{{SECONDARY_TYPE_HTML}}": secondary_html,
        "{{RATIONALE}}": esc(classification.get("rationale_zh") or ""),
        "{{ORIGINAL_PROMPT}}": esc(data.get("original_prompt") or ""),
        "{{TOTAL_SCORE}}": str(total),
        "{{SCORE_BAND}}": esc(data.get("score_band_zh") or ""),
        "{{SCORE_DELTA}}": esc(delta_text),
        "{{MINI_BADGE}}": mini_badge(total),
        "{{NODE_ROWS}}": node_rows(nodes),
        "{{RADAR_SVG}}": radar_svg(scores),
        "{{METRIC_ROWS}}": metric_rows(scores, previous_scores),
        "{{PRIORITY_ROWS}}": priority_rows(data.get("priorities") or []),
        "{{REVISED_SECTION}}": revised_section,
    }
    output = template
    for placeholder, value in replacements.items():
        output = output.replace(placeholder, value)
    unresolved = re.findall(r"\{\{[A-Z0-9_]+\}\}", output)
    if unresolved:
        raise ValueError(f"Unresolved template placeholders remain: {unresolved}")
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Assessment JSON")
    parser.add_argument("--output", required=True, type=Path, help="Output HTML")
    parser.add_argument(
        "--template",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "locales/zh-CN/prompt_report_template.html",
    )
    args = parser.parse_args()

    data = json.loads(args.input.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Assessment JSON must be an object")
    template = args.template.read_text(encoding="utf-8")
    output = render(data, template)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(output, encoding="utf-8")
    print(args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
