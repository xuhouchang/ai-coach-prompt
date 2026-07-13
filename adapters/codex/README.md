# Codex adapter

Install the complete skill folder as a Codex skill with `SKILL.md` at its root. The core keeps all supporting files UTF-8 and relative-path based.

Read supporting YAML and Markdown lazily using the relative paths in `SKILL.md`.

## Choice questions

Use Codex's native interactive-question control for `single_choice` and
`multi_choice` only when the current Codex session exposes that control. Do not
render a Markdown list as though it were clickable.

When the native control is unavailable, render a keyboard fallback: label every
option `[A]`, `[B]`, `[C]` and ask for one letter (single choice) or
comma-separated letters such as `A,C,E` (multi choice). Never require the
learner to retype a full option.

## Visual course map

Before practice, detect the current Codex session's rendering capability: use
`course_map_widget.html` only if a safe HTML/widget renderer is exposed; else
use `course_map_mermaid.md` if Mermaid renders; otherwise use `course_map.md`.
Do not assume HTML is available merely because Codex can display Markdown.
