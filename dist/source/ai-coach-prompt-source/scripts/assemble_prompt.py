#!/usr/bin/env python3
"""Assemble one complete Prompt from per-node learning answers."""
from __future__ import annotations
import argparse
import json
import re
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
    catalog = yaml.safe_load((ROOT / "task_types.en.yaml").read_text(encoding="utf-8"))["task_type_catalog"]["types"]
    task_type = payload.get("task_type")
    if task_type not in catalog:
        raise SystemExit(f"Unknown task_type: {task_type}")

    spec = catalog[task_type]
    answers = payload.get("answers") or {}
    canonical = {node["id"]: node for node in spec["nodes"]}
    unknown = set(answers) - set(canonical)
    if unknown:
        raise SystemExit(f"Unknown node ids: {sorted(unknown)}")

    text = spec["assembly_template_zh"]
    for node_id, node in canonical.items():
        value = str(answers.get(node_id, "")).strip() or f"【待补充：{node['label_zh']}】"
        text = text.replace("{{" + node_id + "}}", value)

    unresolved = re.findall(r"\{\{[^}]+\}\}", text)
    if unresolved:
        raise SystemExit(f"Unresolved placeholders: {unresolved}")

    Path(args.output).write_text(text.strip() + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
