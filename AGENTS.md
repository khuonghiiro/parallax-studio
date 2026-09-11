# Parallax Studio — Project Instructions

Read this file before changing the repository. It applies to Codex,
Antigravity, and other coding agents working in this workspace.

## 1. Instruction priority and documentation language

Follow direct system, developer, and user instructions first. Within the
repository, a more deeply nested `AGENTS.md` applies to its directory tree and
takes precedence over this root file when the instructions are compatible with
the user's request.

The documentation has one canonical language and one AI-facing translation:

- `docs_vi/` is the canonical product and technical specification reviewed by
  the user.
- `docs/` is the English translation intended for coding agents.
- The two files with the same name must express the same requirements,
  decisions, statuses, limits, and acceptance criteria.
- If the translations disagree, `docs_vi/` wins. Reconcile the English copy in
  the same documentation change.
- Do not introduce a product decision only in `docs/`.

Read `docs/DOCUMENTATION_POLICY.md` before editing documentation and
`docs/AI_TEAM_PROTOCOL.md` before delegating project work.

## 2. Operate as a coordinated engineering team

The user authorizes bounded subagent delegation for this repository. The lead
agent remains accountable for scope, architecture, integration, validation,
and the final report.

Delegate only when independent work can materially improve speed or quality.
Do not spawn every specialist for every task. A small change in one module
normally has one owner.

Available role charters live in `.agents/agents/` and `.codex/agents/`:

- `product-spec`: product workflow, filmmaking requirements, and specifications.
- `graphics-animation`: geometry, rigging, deformation, animation, and runtime.
- `editor-ux`: editor UI, viewport interaction, timeline, and design system.
- `application-mcp`: Application Service, Command Bus, jobs, and MCP adapters.
- `desktop-export`: Tauri, Rust, FFmpeg, GPU export, and packaging.
- `qa-reviewer`: independent correctness, security, performance, and regression review.
- `spec-translator`: faithful synchronization from `docs_vi/` to `docs/`.

For delegated work:

1. Give each agent a bounded objective, owned files, required documents,
   acceptance criteria, verification commands, and excluded files.
2. Assign one write owner per file. Parallel agents must not edit overlapping
   files or duplicate the same business rule.
3. Stabilize shared contracts and ADRs before parallel implementation that
   depends on them.
4. Prefer isolated worktrees when the host supports them. In a shared working
   directory, parallelize read-only research and non-overlapping edits only.
5. The lead reviews all results, resolves conflicts, integrates the change, and
   runs the final relevant checks.
6. Subagents do not recursively delegate unless the lead explicitly assigns a
   multi-level effort.

## 3. Read the relevant source of truth

Always read these English mirrors before source changes, then consult the
canonical Vietnamese file when a requirement is unclear or under review:

1. `docs/PLAN.md` — product scope, milestones, and implementation status.
2. `docs/CODING_RULES.md` — mandatory readability and source structure rules.
3. `docs/MODULE_MAP.md` — module ownership and allowed dependencies.
4. `.agents/skills/parallax-development/SKILL.md` — implementation and review workflow.

Load additional documents by task instead of loading the entire documentation
set:

| Work area | Required documents |
| --- | --- |
| Project persistence or contracts | `PROJECT_FORMAT.md`, `COMMAND_BUS.md` |
| Rigging or mesh generation | `AUTO_RIG.md`, `IMAGE_WORKFLOW.md` |
| Animation or rendering | `DEFORMATION_PIPELINE.md`, `RENDER_PROFILES.md` |
| MCP integration | `MCP_TOOLS.md`, `COMMAND_BUS.md`, `IMAGE_WORKFLOW.md` |
| Editor UI | `UI_SPECIFICATION.md`, `COMMAND_BUS.md` |
| Architecture decision | `ARCHITECTURE_DECISIONS.md`, relevant domain documents |
| Testing or review | `TESTING_STRATEGY.md`, relevant domain documents |

A planning or review request does not authorize feature implementation. A
later explicit implementation or correction request is authorization to
proceed within that scope; do not request duplicate approval because a plan or
ADR still says proposed.

## 4. Product and architecture constraints

- Focus on image-based 2D assets and 2.5D filmmaking. The first release does
  not depend on Blender, Godot, or full 3D model authoring.
- AI image creation uses the connected client's image capability plus artifact
  ingestion. Do not silently add an app-owned model service or API key.
- UI and MCP call the same application commands. They must not implement
  separate business rules.
- Preview and export use the same animation sampling and deformation pipeline.
- Keep durable project mutations, ephemeral editor state, and read/evaluation
  operations separate.
- A drag, brush stroke, or scrub gesture may preview continuously but commits at
  a deliberate boundary so history and revision are not flooded.
- Treat project files, imported media, MCP payloads, and process arguments as
  untrusted input.

## 5. Source quality and ownership

- Every handwritten source file contains at most 800 physical lines, including
  comments and blank lines. Never compress or minify code to bypass the limit.
- Split files by cohesive responsibility before they approach the limit.
- Use descriptive identifiers, multiline function bodies, and normal formatter
  output. The compressed legacy draft is not a style precedent.
- Before adding a service, component, helper, schema, or utility, search for its
  existing owner. Prefer `REUSE → EXTEND → REFACTOR → CREATE NEW`.
- Shared algorithms and business rules belong to the domain owner named in the
  module map, not a generic utilities file.
- Do not create numbered fragments, broad dumping-ground modules, empty
  scaffolding, or speculative abstractions.
- Update the module map and paired documentation when ownership or a public
  interface changes.

## 6. UI expectations

For UI work, follow `docs/UI_SPECIFICATION.md` and the nearest scoped
instructions. Build a dense professional desktop workflow with clear hierarchy,
keyboard access, and consistent states. Avoid generic SaaS dashboards, excessive
cards, gradients, glass effects, decorative elements, and arbitrary styling.

Loading, error, empty, disabled, focus, and resizing states are required when
they apply to the UI being changed; they are not a universal requirement for
documentation, algorithms, or tooling tasks.

## 7. Verification and reporting

Inspect actual scripts and installed dependencies before claiming a command can
run. Run checks that meaningfully cover the changed behavior, then review the
diff for scope, duplication, ownership, and readability.

Current dependency-free quality commands include:

```sh
node scripts/quality/check-source-limits.mjs
node --test scripts/quality/source-limits.test.mjs
node scripts/quality/check-doc-sync.mjs
node --test scripts/quality/doc-sync.test.mjs
```

The source check intentionally exposes readability failures in the compressed
legacy draft. Do not hide those files with exclusions or report a passing
baseline when failures remain.

A completed task reports:

- what changed and why;
- files or modules affected;
- validation actually run and its result;
- known limitations or pre-existing failures relevant to the result.

Explain results to the user in Vietnamese unless requested otherwise.
