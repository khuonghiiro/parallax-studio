---
trigger: always_on
---

# Parallax Studio workspace adapter

Read and follow @/AGENTS.md. It is the compact project-wide instruction map.

`docs_vi/` is the canonical specification reviewed by the user. `docs/` is its
English AI-facing translation. Resolve conflicts in favor of the Vietnamese
source and synchronize both copies in the same documentation change.

Use the scoped `AGENTS.md` nearest to every file being changed and load the
`parallax-development` skill for project implementation, refactoring, review,
or architecture work.

Do not copy the full coding policy into this rule. Detailed domain guidance
belongs in the paired documentation, scoped instructions, skill, or custom
agent charter so the always-on context remains small.
