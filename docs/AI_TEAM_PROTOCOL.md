# AI team working protocol

## 1. Purpose

The AI team lets Parallax Studio handle large tasks through focused specialties
while retaining one architecture, one implementation of each rule, and one
integration owner. Delegation reduces context and parallelizes independent work;
it must not create competing implementations.

The Lead Agent remains accountable for scope, dependency order, contracts,
integration, verification, and the user-facing report.

## 2. When to delegate

Delegate to a specialist when at least one condition applies:

- The task has two or more independent parts that do not edit the same files.
- Deep research can run independently of implementation.
- A high-risk change benefits from an independent reviewer.
- Validation spans multiple layers such as core, UI, MCP, desktop, or export.

The Lead handles a small single-owner task or a workflow whose steps are too
sequential for delegation to improve speed or correctness.

Do not invoke every specialist by default. Match concurrency to the task and the
host limit; prefer no more than three specialists active beside the Lead.

## 3. Roles

### `product-spec`

Owns user workflows, script-to-shot planning, acceptance criteria, project
format, and canonical specifications in `docs_vi/`. It does not implement UI or
algorithms.

### `graphics-animation`

Owns geometry, contours, triangulation, rig hierarchy, bind pose, weights, IK,
view selection, animation sampling, deformation, camera/light behavior, and the
Three.js runtime. It does not create competing `application` commands or `contracts` schemas.

### `editor-ux`

Owns the React editor, viewport interaction, timeline, asset/rig panels, design
system, keyboard workflow, and accessibility. It does not place business rules
or HTTP parsing directly in components.

### `application-mcp`

Owns the Application Service, Command Bus, transactions, revisions, history,
jobs, ports, service transport, MCP tools/resources, and image handoff
orchestration. It does not duplicate rig, animation, or rendering algorithms.

### `desktop-export`

Owns the Tauri/Rust shell, sidecar lifecycle, renderer transport, FFmpeg, NVENC,
GPU readback, resource limits, packaging, and Windows/Linux validation. It does
not keep a separate project state or animation sampler.

### `qa-reviewer`

Independently reviews correctness, regressions, security, performance, resource
leaks, dependency boundaries, and meaningful test coverage. It is read-only for
source by default and writes tooling or tests only with an explicit write scope.

### `spec-translator`

Faithfully translates `docs_vi/` into `docs/`, checks terminology, and updates
the manifest. It does not alter product decisions, numbers, schemas, or ADR
status.

### Default ownership boundaries in the target architecture

| Role | Default area |
| --- | --- |
| Lead | Public contracts in `packages/contracts/`, ADRs, and final integration |
| `graphics-animation` | `packages/core/`, `packages/runtime/` |
| `editor-ux` | `apps/editor/` |
| `application-mcp` | `packages/application/`, `apps/mcp/`, service outside renderer/encoder, `image-handoff/` |
| `desktop-export` | `apps/desktop/`, renderer/encoder adapters, sidecar config, and packaging |
| `qa-reviewer` | Source review; `tests/`, `scripts/quality/`, or CI when assigned |
| `product-spec` | Product content and proposed contracts in `docs_vi/` |
| `spec-translator` | Paired files in `docs/` and the manifest after Vietnamese content is stable |

These are default owners, not implicit write permission. The task packet narrows
them to exact files or directories. For legacy source in `src/`, `shared/`, and
`engine/`, use the nearest `AGENTS.md` and let the Lead assign one owner based on
the file's real responsibility.

## 4. Required task packet

Every specialist assignment contains:

```text
Objective
Owned files or directories
Required documents
Public contracts involved
Acceptance criteria
Verification commands
Files that must not change
Expected result report
```

Without an explicit write scope, the assignment is read-only research or review.

## 5. Ownership and dependency order

1. One agent owns writes to a file at a time.
2. Do not assign the same business rule to multiple implementations.
3. Stabilize shared contracts, schemas, and ADRs before dependent work begins.
4. An agent that discovers a needed contract change reports it to the Lead and
   does not edit outside its assigned scope.
5. In a shared workspace, parallelize only non-overlapping edits. Use isolated
   worktrees when the host supports them and merging is beneficial.
6. A specialist does not spawn another agent unless its task packet allows it.
7. QA does not modify a specialist's source while that source is still changing.

## 6. Handoff and integration

Every specialist result reports:

- files inspected and changed;
- decisions and contracts used;
- checks actually run and their real results;
- assumptions, limitations, and remaining risks;
- out-of-scope changes the Lead must resolve.

The Lead reads the diff, checks duplication and dependencies, resolves reviewer
feedback, runs integrated verification, and only then reports completion.

## 7. Directory-scoped instructions

Each source area may have a short `AGENTS.md` that describes its responsibility,
allowed dependencies, invariants, and local verification. Before editing a file,
read the root `AGENTS.md` and the nearest `AGENTS.md` that owns the target.

Do not copy the root file, skill, or architecture documents into scoped files.
When a target module under `apps/` or `packages/` does not exist, do not create
an empty directory only to hold instructions; add its scoped `AGENTS.md` when the
real module is introduced.

## 8. Hosts without subagents

The Lead applies each relevant role charter sequentially while retaining the
same ownership boundaries, task packet, self-review, and verification. The
quality contract does not change because the runtime lacks parallel agents.
