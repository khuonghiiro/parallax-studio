# Parallax Studio — Project Instructions & Engineering Standard

Read this file before changing the project. It applies to Codex, Antigravity
and other coding agents working in this workspace.

## 1. Operating Mindset — Autonomous Engineering Team

Internally think, plan, and evaluate as a coordinated engineering team through 6 cognitive lenses
(within a single agent session — do NOT create subagents unless explicitly requested):
1. **Architect**: Clean separation of concerns, single Three.js renderer, Command Bus consistency.
2. **Product & UX Designer**: High-density desktop tool (Blender/Spine/Figma feel), strictly NO AI-slop.
3. **Core & Graphics Engineer**: 2.5D math, Earcut triangulation, deformation pipeline, 800-line limits.
4. **Desktop & Integration Engineer**: Tauri shell, FFmpeg NVENC 2K/4K 60/120 FPS, MCP SDK tools.
5. **QA Engineer**: Functional edge cases, boundary values, test invariant verification, regression check.
6. **Code Reviewer**: Existing-code-first, no dead code or speculative abstractions, high readability.

Do not behave like a code generator that blindly follows instructions.
Build a real, maintainable product — not a collection of generated files.

## 2. Read the relevant source of truth (docs/ and docs_vi/)

Canonical English technical documentation for AI coding agents resides in `docs/`.
Vietnamese documentation for user inspection and project review resides in `docs_vi/`.

1. `docs/PLAN.md` (`docs_vi/PLAN.md`) — product scope, milestones and implementation plan.
2. `docs/CODING_RULES.md` (`docs_vi/CODING_RULES.md`) — mandatory source structure and readability rules (max 800 physical lines).
3. `docs/MODULE_MAP.md` (`docs_vi/MODULE_MAP.md`) — package ownership, directory layout and dependency rules.
4. `docs/PROJECT_FORMAT.md` (`docs_vi/PROJECT_FORMAT.md`) — disk structure, manifest, rig, landmarks and mesh format.
5. `docs/COMMAND_BUS.md` (`docs_vi/COMMAND_BUS.md`) — command bus, undo/redo, revision and transaction architecture.
6. `docs/DEFORMATION_PIPELINE.md` (`docs_vi/DEFORMATION_PIPELINE.md`) — canonical deformation order and coordinate spaces.
7. `docs/MCP_TOOLS.md` (`docs_vi/MCP_TOOLS.md`) — MCP tool catalog, schemas and idempotency rules.
8. `docs/TESTING_STRATEGY.md` (`docs_vi/TESTING_STRATEGY.md`) — test categories, CI gates and benchmark protocol.
9. `docs/ARCHITECTURE_DECISIONS.md` (`docs_vi/ARCHITECTURE_DECISIONS.md`) — architecture decision records (ADR-001 to ADR-009).
10. `docs/GLOSSARY.md` (`docs_vi/GLOSSARY.md`) — project terminology reference.
11. `docs/AUTO_RIG.md` (`docs_vi/AUTO_RIG.md`) — Mixamo-style auto-rig: landmarks, skeleton, auto-weights, templates.
12. `docs/IMAGE_WORKFLOW.md` (`docs_vi/IMAGE_WORKFLOW.md`) — AI image creation, part decomposition, mesh generation.
13. `docs/RENDER_PROFILES.md` (`docs_vi/RENDER_PROFILES.md`) — output resolution/FPS presets and RTX 3060 targets.
14. `docs/UI_SPECIFICATION.md` (`docs_vi/UI_SPECIFICATION.md`) — dual-mode UI (Setup/Animate), panels, Lucide + SVG icons.
15. `.agents/skills/parallax-development/SKILL.md` — implementation and refactoring workflow.

The current user request is planning and project guidance. A plan is not permission
to resume feature development. A later explicit request to implement is permission
to proceed; do not request duplicate approval because a document still says pending.

## 3. Essential Constraints & Principles

- **2D/2.5D Focus**: Image-based 2D assets and 2.5D filmmaking. No dependency on Blender, Godot or full 3D authoring.
- **AI Image Creation**: Uses AI client's available tool + MCP ingestion (`docs/IMAGE_WORKFLOW.md`); no app-owned model/API.
- **Output Standards**: 2K/4K at 60/120 FPS with NVIDIA RTX 3060 targets (`docs/RENDER_PROFILES.md`). Export FPS is separate from preview.
- **Strict 800-Line Limit**: Every handwritten source file must contain at most 800 physical lines including comments and blanks. Never compress or minify code to bypass limits.
- **Existing Code First**: Before adding any service, component, helper, model or utility:
  ```text
  REUSE → EXTEND → REFACTOR → CREATE NEW
  ```
  Search for existing owners before adding logic. Do not duplicate algorithms between UI/MCP or browser/native.
- **Unified Logic**: UI and MCP call the same application commands. Preview and export share the same Three.js deformation pipeline.
- **Language**: Explain results to the user in Vietnamese unless requested otherwise.
- **No Subagents**: Do not create subagents unless the user explicitly requests delegation.

## 4. UI/UX Anti-AI-Slop Rules

Follow `docs/UI_SPECIFICATION.md`. Prioritize desktop workflow efficiency and information density:
- **Prohibited by default**: Generic SaaS aesthetics, purple/blue gradient buttons, excessive card containers, glassmorphism without purpose, decorative blobs, excessive whitespace.
- **Design Inspiration**: Blender, Figma, Spine 2D, Live2D Cubism, Rive, VS Code.
- **Icon System**:
  1. Primary: Lucide Icons (stroke 2px, 24×24, `currentColor`, ISC license).
  2. Fallback: Custom inline SVG following the same 24×24 stroke outline spec.
  3. NEVER use OS-native icons (Segoe MDL2 / SF Symbols) or emoji to ensure cross-platform consistency.

## 5. Verification Commands & Definition of Done

Current verification commands (do not require installing dependencies):

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

### Definition of Done

A task is DONE only when:
1. Target functionality meets specification and matches architectural decisions.
2. Code strictly respects the 800 physical line limit and readability standards.
3. No duplicate logic created between UI, MCP, and Core runtime.
4. UI handles loading, error, empty, disabled, and responsive states cleanly.
5. Verification commands pass without regression.
6. "Code compiles" alone is never the Definition of Done.
