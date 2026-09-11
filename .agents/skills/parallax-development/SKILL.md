---
name: parallax-development
description: Implement, refactor, or review Parallax Studio image-based 2D animation and 2.5D filmmaking code using its module ownership, shared runtime, team coordination, and readability rules.
---

# Parallax development

Use this skill for Parallax Studio source, architecture, test, or documentation
work. It does not turn a planning request into permission to implement features.

## Load only the relevant context

Resolve paths from the repository root. Read `AGENTS.md`, then every nested
`AGENTS.md` that applies to files in scope.

Read `docs/CODING_RULES.md`, `docs/MODULE_MAP.md`, and the relevant part of
`docs/PLAN.md` before source changes. `docs/` is the English mirror used by AI;
`docs_vi/` is canonical. When changing requirements or decisions, update the
Vietnamese source and its English translation together according to
`docs/DOCUMENTATION_POLICY.md`.

Load domain documents only when relevant:

- Images and layered assets: `docs/IMAGE_WORKFLOW.md`.
- Rigging and weights: `docs/AUTO_RIG.md`.
- Project data and commands: `docs/PROJECT_FORMAT.md` and `docs/COMMAND_BUS.md`.
- Rendering and export: `docs/DEFORMATION_PIPELINE.md` and `docs/RENDER_PROFILES.md`.
- UI: `docs/UI_SPECIFICATION.md`.
- MCP: `docs/MCP_TOOLS.md`.
- Delegation: `docs/AI_TEAM_PROTOCOL.md`.

## Coordinate work when the task benefits from a team

The lead may delegate bounded, independent work using the role charters in
`.agents/agents/` and the Codex adapters in `.codex/agents/`. Do not delegate a
small single-owner edit merely to simulate a team.

Before delegation, define the objective, file ownership, contracts, acceptance
criteria, checks, and excluded files. Do not give parallel agents overlapping
write ownership. Stabilize shared contracts before dependent implementation.
The lead integrates every contribution and performs the final review.

## Choose the owner before writing code

Search existing code and callers with `rg`. Classify the change as contracts,
geometry, rig, deformation, views, animation, scene, runtime, application,
transport, desktop integration, or an editor feature. Use the module map rather
than a generic shared file.

Keep one implementation of every business rule. UI and MCP use the same
application commands. Preview and export use the same sampler and deformation
pipeline. Native adapters may differ in I/O but do not copy rig, timeline,
scene, or validation algorithms.

If a module grows, split it by named responsibilities with small public APIs.
Do not create numbered fragments, broad utility files, or barrels that hide
cycles and unnecessary exports.

## Separate state and operations

- Durable project mutations go through revision-aware application transactions.
- Selection, active tool, panel state, playhead preview, and other ephemeral
  editor state remain in the editor session unless explicitly persisted.
- Queries, evaluation, preview, and render reads do not masquerade as project
  mutations.
- Pointer drags and brush strokes preview during the gesture and commit one
  coherent history entry at the boundary.

## Preserve domain invariants

- Rig: acyclic hierarchy, rest/bind pose, local/world transforms, and normalized
  bounded influences.
- Geometry: validated contours, indices, UVs, topology, and deterministic failure
  behavior; do not assume a triangulator repairs invalid input.
- Views: stable pivots and draw order; morph only across compatible topology.
- Deformation: one documented coordinate-space order shared by preview/export.
- Shadows: use the deformed alpha silhouette and light-space geometry.
- Commands: transaction-level revision, explicit idempotency, readable failures,
  and staged external side effects.
- Export: exact resolution/FPS, deterministic timebase, bounded buffers,
  snapshot revision, cancellation, and encoder capability probing.
- Image handoff: verify real artifacts, paths, dimensions, alpha, quotas, hashes,
  and provenance; never substitute a displayed preview for an imported source.
- Resources: explicit ownership and disposal of textures, geometry, workers, and
  native processes.

Test only the invariants touched by the task.

## Keep implementation readable

Follow the canonical coding rules, including the 800-line physical limit and
multiline formatting. Do not imitate compressed code in `src/`, `shared/`, or
`engine/`. Do not use casts, empty catches, exclusions, or generated markers to
hide unfinished handwritten code.

For planning tasks, change specifications, rules, and supporting checks only.
For an explicit implementation request, complete the authorized scope without
asking again merely because a document still has proposed status.

## Verify and report

Inspect available scripts and installed dependencies before selecting checks.
Run the source limit check, documentation sync check, and relevant formatter,
type, dependency, behavior, or visual checks for the files changed.

If editing a checker, run its dedicated Node test. Distinguish new failures from
the compressed legacy draft. Report exactly what ran; do not claim another OS,
GPU, encoder, or full application was validated without evidence.
