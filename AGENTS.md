# Parallax Studio — Project instructions

Read this file before changing the project. It applies to Codex, Antigravity
and other coding agents working in this workspace.

## Read the relevant source of truth

1. `docs/PLAN.vi.md` — current proposed product scope and implementation status.
2. `docs/CODING_RULES.vi.md` — mandatory source structure and readability rules.
3. `docs/MODULE_MAP.vi.md` — ownership of shared logic and allowed dependencies.
4. `.agents/skills/parallax-development/SKILL.md` — workflow for implementing,
   refactoring or reviewing code. Read directly if skill discovery is unavailable.

The current user request is planning and project guidance. A plan is not permission
to resume feature development. A later explicit request to implement is permission
to proceed; do not request duplicate approval because a document still says pending.

## Essential constraints

- Focus on image-based 2D assets and 2.5D filmmaking. The proposed first release
  does not depend on Blender, Godot or full 3D model authoring.
- Image creation uses the AI client's available image tool followed by MCP asset
  ingestion. See `docs/IMAGE_WORKFLOW.vi.md`; no app-owned model/API is required.
- Output must support 2K/4K at 60/120 FPS. See `docs/RENDER_PROFILES.vi.md` for exact
  dimensions and GPU targets; export FPS is separate from real-time preview speed.
- Every handwritten source file must contain at most 800 physical lines,
  including comments and blank lines. Never compress code to bypass the limit.
- Split by cohesive responsibility. Shared algorithms and business rules belong
  to the domain module named in the module map, not a generic dumping-ground file.
- UI and MCP call the same application commands. Preview and export use the
  same animation sampling and deformation pipeline.
- Use descriptive identifiers, multiline function bodies and formatted code.
  The existing compressed draft is not a style precedent.
- Search for an existing owner before adding logic. Reuse genuine shared logic;
  do not implement duplicate UI/MCP or browser/native algorithms.
- Explain results to the user in Vietnamese unless requested otherwise.
- Do not create subagents unless the user explicitly requests delegation.

## Current verification commands

These commands do not require installing dependencies:

```sh
node scripts/quality/check-source-limits.mjs
node --test scripts/quality/source-limits.test.mjs
```

The source check should expose readability problems in the old draft. Do not hide
those files with exclusions or claim the app passed validation. For planning-only
changes, report the findings without starting a full refactor. For authorized
implementation, apply the relevant checks in the coding rules.

Existing npm scripts refer to unfinished files. Inspect actual files and installed
dependencies before claiming a command runs or a product feature works.
