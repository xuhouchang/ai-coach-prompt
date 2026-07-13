# WorkBuddy adapter

Build the installable package with `ruby scripts/build_workbuddy_installable.rb`.

The generated package adds `workbuddy_install_manifest.yaml` for WorkBuddy installation. Before practice, select the first supported course-map renderer: `course_map_widget.html` through WorkBuddy's HTML/widget mechanism, then `course_map_mermaid.md` when Mermaid is rendered, then `course_map.md` as the Markdown diagram fallback. Do not skip directly to prose just because one richer renderer is unavailable.

## Native entry controls

WorkBuddy allows at most four options in a native choice control. The entry survey
must keep every displayed control at or below that limit. Do not degrade to a
Markdown list or typed-letter response when a source question has more options:
use the entry configuration's predefined hierarchical follow-up instead.
