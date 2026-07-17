#!/usr/bin/env python3
"""Build the WorkBuddy plugin package and source archive for v3.1.2."""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
PLUGIN = DIST / "workbuddy-plugin" / "ai-coach-prompt"
SKILL_TARGET = PLUGIN / "skills" / "ai-coach-prompt"
EXCLUDE_TOP = {"dist", ".git", ".github", ".workbuddy", "learner_profiles", "__pycache__"}
EXCLUDE_NAMES = {".DS_Store"}
EXCLUDE_SUFFIXES = {".pyc"}


def package_version() -> str:
    manifest = yaml.safe_load((ROOT / "workbuddy_install_manifest.yaml").read_text(encoding="utf-8"))
    return str(manifest["package"]["version"])


def should_copy_to_skill(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    if rel.parts and rel.parts[0] in EXCLUDE_TOP:
        return False
    if path.name in EXCLUDE_NAMES or path.suffix in EXCLUDE_SUFFIXES:
        return False
    return True


def zip_tree(source: Path, zip_path: Path, archive_root: str) -> None:
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(source.rglob("*")):
            if path.is_file():
                archive.write(path, Path(archive_root) / path.relative_to(source))


def main() -> int:
    subprocess.run([sys.executable, str(ROOT / "scripts/sync_task_compat.py")], check=True)
    subprocess.run([sys.executable, str(ROOT / "scripts/validate_skill.py")], check=True)

    if PLUGIN.exists():
        shutil.rmtree(PLUGIN)
    SKILL_TARGET.mkdir(parents=True, exist_ok=True)

    for path in ROOT.rglob("*"):
        if not path.is_file() or not should_copy_to_skill(path):
            continue
        target = SKILL_TARGET / path.relative_to(ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)

    # Plugin-level MCP server and verification corpus.
    (PLUGIN / "servers").mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / "servers/profile-store.mjs", PLUGIN / "servers/profile-store.mjs")
    (PLUGIN / "tests").mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / "tests/test_profile_store.mjs", PLUGIN / "tests/test_profile_store.mjs")
    shutil.copy2(ROOT / "tests/test_text_interaction_contract.mjs", PLUGIN / "tests/test_text_interaction_contract.mjs")
    shutil.copy2(ROOT / "tests/adversarial_cases.yaml", PLUGIN / "tests/adversarial_cases.yaml")

    version = package_version()
    plugin_manifest = {
        "name": "ai-coach-prompt",
        "version": version,
        "description": "Prompt teaching and assessment with a bounded local profile store; learner Prompts are never executed.",
        "author": {"name": "Shanghai Zero One Engine Technology Co., Ltd."},
        "license": "Proprietary",
        "keywords": ["prompt", "training", "assessment", "workbuddy", "safe-agent"],
        "skills": "./skills/",
        "mcpServers": "./.mcp.json",
    }
    manifest_dir = PLUGIN / ".workbuddy-plugin"
    manifest_dir.mkdir(parents=True, exist_ok=True)
    (manifest_dir / "plugin.json").write_text(json.dumps(plugin_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    mcp_config = {
        "mcpServers": {
            "ai-coach-profile": {
                "command": "node",
                "args": ["${CODEBUDDY_PLUGIN_ROOT}/servers/profile-store.mjs"],
                "env": {"AI_COACH_DATA_DIR": "${CODEBUDDY_PLUGIN_DATA}"},
            }
        }
    }
    (PLUGIN / ".mcp.json").write_text(json.dumps(mcp_config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # Root-level operator documentation.
    shutil.copy2(ROOT / "README.md", PLUGIN / "README.md")
    shutil.copy2(ROOT / "CHANGELOG.md", PLUGIN / "CHANGELOG.md")
    shutil.copy2(ROOT / "AUDIT_REPORT.md", PLUGIN / "SECURITY.md")

    install_zip = DIST / f"ai-coach-prompt-workbuddy-plugin-v{version}.zip"
    zip_tree(PLUGIN, install_zip, "ai-coach-prompt")

    source_root = DIST / "source" / "ai-coach-prompt-source"
    if source_root.exists():
        shutil.rmtree(source_root)
    source_root.mkdir(parents=True, exist_ok=True)
    for path in ROOT.rglob("*"):
        if not path.is_file() or "dist" in path.parts or path.name in EXCLUDE_NAMES or path.suffix in EXCLUDE_SUFFIXES:
            continue
        target = source_root / path.relative_to(ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
    source_zip = DIST / f"ai-coach-prompt-source-v{version}.zip"
    zip_tree(source_root, source_zip, "ai-coach-prompt-source")

    print(PLUGIN)
    print(install_zip)
    print(source_zip)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
