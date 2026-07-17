#!/usr/bin/env python3
"""Generate compatibility files from task_types.en.yaml.

Edit task_types.en.yaml only. This script keeps legacy filenames aligned.
"""
from __future__ import annotations

from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "task_types.en.yaml"


def main() -> int:
    data = yaml.safe_load(SOURCE.read_text(encoding="utf-8"))
    types = data["task_type_catalog"]["types"]

    node_walk = {"generated_from": "task_types.en.yaml", "do_not_edit": True, "node_walk": {}}
    variables = {"generated_from": "task_types.en.yaml", "do_not_edit": True, "task_type_variables": []}

    for task_id, spec in types.items():
        nodes = spec["nodes"]
        node_walk["node_walk"][task_id] = {
            "label_zh": spec["label_zh"],
            "node_count": len(nodes),
            "nodes": nodes,
        }
        variables["task_type_variables"].append(
            {
                "task_type": task_id,
                "label_zh": spec["label_zh"],
                "expected_missing_information": [node["id"] for node in nodes],
                "min_missing_count_for_diagnosis": max(3, len(nodes) - 2),
            }
        )

    (ROOT / "node_walk.en.yaml").write_text(
        yaml.safe_dump(node_walk, allow_unicode=True, sort_keys=False, width=100), encoding="utf-8"
    )
    (ROOT / "task_type_variables.en.yaml").write_text(
        yaml.safe_dump(variables, allow_unicode=True, sort_keys=False, width=100), encoding="utf-8"
    )
    print("Synchronized node_walk.en.yaml and task_type_variables.en.yaml")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
