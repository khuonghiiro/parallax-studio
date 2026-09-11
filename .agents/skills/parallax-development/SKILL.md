---
name: parallax-development
description: Implement, refactor, or review Parallax Studio image-based 2D animation and 2.5D filmmaking code using its module ownership, shared runtime and readability rules. Use for this repository's code and architecture changes.
---

# Parallax development

Use this skill within the Parallax Studio repository. It does not grant permission
to implement features when the user only asked for a plan.

## Load project context

Resolve paths from the repository root, not the skill directory:

- Read `AGENTS.md` and `docs/CODING_RULES.md` before source changes.
- Read `docs/MODULE_MAP.md` to identify the owner and allowed dependencies.
- Read the relevant section of `docs/PLAN.md` for the current product direction.
- For AI-created assets, read `docs/IMAGE_WORKFLOW.md`: the client generates
  images, and MCP ingests real artifacts; do not add a default local model service.
- For rendering, read `docs/RENDER_PROFILES.md`: 2K/4K at 60/120 output FPS,
  RTX 3060 12 GB target, bounded buffers and shared deterministic sampling.

The current design is image-based: layered artwork, flat meshes, bones, deformers,
view sets, camera/light and filmmaking. Do not reintroduce Blender/Godot or a 3D
model authoring pipeline from the earlier draft unless the user changes the scope.

## Choose the module before writing code

Search existing code and callers with `rg`. Identify whether the work belongs to
contracts, rig, geometry, deformation, views, animation, runtime, application,
transport or a UI feature. Use the ownership table instead of a generic shared file.

Keep one implementation of each business rule. UI/MCP use the same application
commands; preview/export use the same pose evaluator. Native adapters may handle
I/O differently but must not duplicate rig or timeline algorithms.

If a shared module grows, split its responsibilities into named submodules and
update its callers. Do not create numbered file fragments or a new large utilities file.

## Apply domain invariants when relevant

- Rig: valid acyclic hierarchy, rest pose, local/world transforms, normalized weights.
- Views: stable pivots/draw order; morph only across compatible topology.
- Deform: one documented ordering shared by preview and export.
- Shadows: alpha silhouette and deformed pose agree with the visible asset.
- Commands: revision-aware transaction, consistent undo and readable failures.
- Export: deterministic frame time, bounded buffers, snapshot revision, cancellation.
- Image handoff: verify actual file, dimensions, alpha and provenance; never
  substitute a planned or displayed image for an imported source artifact.
- Output: exact resolution/FPS; probe encoder support and report real-time
  performance separately. Do not silently lower quality or duplicate 60 FPS frames.
- Resources: explicit ownership and disposal of textures, geometry and workers.

Test the invariants touched by the task. Do not build unrelated features to exercise them.

## Keep source maintainable

Follow the canonical coding rules, including the 800-line limit and multiline
formatting. Do not imitate compressed code in `src/`, `shared/` or `engine/`.
Do not use casts, empty catches or generated-file exclusions to hide unfinished work.

For planning tasks, edit plans, rules and supporting checks only. For an explicit
implementation request, proceed within the authorized scope without asking again
solely because a planning document still has a pending status.

## Verify and report

Run `node scripts/quality/check-source-limits.mjs` and the relevant installed
formatter, type, dependency and behavior checks. Inspect available scripts first;
the existing draft contains unfinished imports and npm commands.

If editing the size checker, also run:

```sh
node --test scripts/quality/source-limits.test.mjs
```

Distinguish newly introduced failures from the known compressed draft. Report
exactly what was checked; do not claim the full app or another OS was validated.
Update the module map when ownership or a public interface changes.
