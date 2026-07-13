# WorkBuddy adapter

Build the installable package with `ruby scripts/build_workbuddy_installable.rb`.

The generated package adds `workbuddy_install_manifest.yaml` for WorkBuddy installation. The portable core remains unchanged: WorkBuddy-only widgets are optional and the learner flow must remain usable as plain Markdown.

## Native entry controls

WorkBuddy allows at most four options in a native choice control. The entry survey
must keep every displayed control at or below that limit. Do not degrade to a
Markdown list or typed-letter response when a source question has more options:
use the entry configuration's predefined hierarchical follow-up instead.
