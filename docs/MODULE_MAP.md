# Module map for drawing and filmmaking

Status: proposed upgrade dated 12/09/2026. Existing code includes `packages/contracts/`,
`packages/core/`, `packages/application/`, `packages/runtime/`, UI in `src/`,
service in `service/`, and MCP in `mcp/`. `apps/` does not exist. This map
assigns responsibility without requiring a full directory migration before improvements.
Create modules only for real responsibilities, never empty scaffolding.

## 1. Owners by workflow

| Workspace | UI owner in current layout | Domain owner and contract |
| --- | --- | --- |
| `draw` | `src/features/drawing/` | DrawingDocument, DrawingLayer, Cel, Exposure in contracts/drawing; core/drawing |
| `rig` | `src/features/rig/`, assembly uses assets | AssetDefinition in contracts/asset; geometry and rig in core |
| `animate` | `src/features/animation/` | AnimationClip, ClipPlacement in contracts/animation; core/animation |
| `compose` | `src/features/composition/` | Composition, AssetInstance in contracts/composition; core/scene |
| `edit` | `src/features/sequence/` | Shot, Sequence, AudioClip, SubtitleCue in contracts/sequence; core/sequence |

New paths are proposed owners, not implementation claims. The assets feature owns
shared library/import/parts/views; the stage feature owns viewport hosting, picking
and overlay orchestration, not mesh, transform or sampling rules. Timeline shell
shares ruler, zoom, selection and accessibility; exposure sheets, clip dope sheets/
curves and sequence edits use domain-specific adapters.

## 2. Shared module boundaries

| Owner | Sole responsibility | Must not do |
| --- | --- | --- |
| `packages/contracts/src/drawing/` | Drawing/layer/cel/exposure schemas, stroke command DTO | Brush rasterization, UI state |
| `packages/contracts/src/asset/` | Definition, part, view, media reference schemas | Mutable instance pose |
| `packages/contracts/src/animation/` | Typed tracks, clips, placements, channel masks | React timeline state |
| `packages/contracts/src/composition/` | Composition node, depth plane, camera route schemas | Duplicate scene transforms |
| `packages/contracts/src/sequence/` | Shot, sequence, audio/subtitle, transition schemas | Encoder logic |
| `packages/core/src/drawing/` | Exposure evaluation, tile edit semantics, masks, brush sampling rules | Device event listeners, storage |
| `packages/core/src/geometry/` | Contours/holes, topology edits, triangulation validation, UV | Assume Earcut repairs invalid input |
| `packages/core/src/rig/` | Hierarchy, rest/bind, influence normalize, weights, IK | UI-specific weight algorithm |
| `packages/core/src/animation/` | Time mapping, keys/easing, clip blending, exposure scheduling | Another exporter sampler |
| `packages/core/src/scene/` | Parenting/world transforms, depth, camera route sampling | GPU resources |
| `packages/core/src/sequence/` | Shot mapping, transitions, audio/subtitle timing | FFmpeg process |
| `packages/core/src/dependencies/` | Typed-ref graph, invalidation, compatibility/rebind plan | File I/O |
| `packages/application/src/` | Authoritative commands, transactions, gesture commits, jobs, history | Reimplement core algorithms |
| `packages/runtime/src/` | Raster/tile texture upload, deformed meshes, camera/light/shadow, frame graph | Write project state |
| `service/` | Persistence/media/renderer/encoder adapters and lifecycle | Second command authority |
| `mcp/` | Schema-driven tools/resources, job and context adapters | Local state or private rig/drawing algorithms |

Drawing renderer backend executes the same brush/tile contract for both UI and
MCP; device input adapter only supplies normalized points/pressure/tilt. CPU/GPU
rasterization choice needs a spike with tolerance fixtures before implementation;
do not write independent algorithms in UI, Node and Rust. Imported source tiles
and committed deltas remain authoritative.

## 3. Allowed dependencies

- Contracts depend only on the schema library; core depends on contracts and pure algorithms.
- Application depends on contracts/core/ports, not React/Three.js or concrete storage.
- Runtime depends on contracts/core/Three.js, not React/MCP or project writers.
- UI calls service clients, contracts and core for transient previews; components
  do not parse HTTP. MCP calls the same service client.
- Service adapters implement application ports. Desktop owns native lifecycle,
  never another rig/timeline/composition reducer.
- UI sessions own tools/selection/panels/playhead; project revision changes only at transaction commit.

## 4. One owner for each rule

### Drawing and gestures

Input adapters normalize pointers, pressure, tilt and zoom/pan mapping. The drawing
feature owns tool state and overlays; core/drawing owns stroke semantics; runtime
executes raster operations; application commits tile deltas once. Cancelling a stroke
does not commit; retrying the same command ID creates no second stroke. Onion skin
uses core exposure evaluation and never enters source or export.

### Assembly, mesh and dependencies

The assets feature selects/assembles parts and pivots; core/scene owns transforms;
core/geometry edits contours/vertices/edges; core/rig owns bindings/weights.
Application orchestrates dependency reports, previews and rebind commit/cancel.
UI and MCP receive the same IDs, diagnostics and invalidation; unrelated property
changes never trigger automatic remeshing.

### Three timelines

Timeline primitives share rulers, zoom, hit testing and keyboard helpers, without
combining every domain into one reducer. Drawing exposures, AnimationClip and
Sequence have separate command/property contracts; core/animation maps clip time,
core/drawing selects cels, core/sequence selects shots. Runtime/export uses the same
evaluation path. Camera routes belong to compositions, not character clips.
Sequence trimming does not change source clips. APIs use typed targets instead
of property strings writing state directly.

### Media, service and MCP

One service owns authoritative project revision. Offline mode, if supported,
requires explicit session/authority management; disconnect never silently creates
a second local state. Reconnect queries revisions/jobs/dependencies before retries;
adapters cannot duplicate operations. Image generation runs in the AI client;
ingestion/validation uses application ports. Encoding and GPU readback do not
belong inside React viewport controllers.

## 5. Mapping existing source to proposed responsibility

| Existing source | Refactor direction when implementation is assigned |
| --- | --- |
| `src/app/EditorContext.tsx` | Separate service session, document context and ephemeral workspace store; remove hard-coded clip union |
| `src/features/timeline/TimelinePanel.tsx` | Separate exposure/clip/sequence adapters; remove fixed demo duration and shots |
| `src/features/stage/scene-composer.ts` | Adapt composition model to runtime; no separate stage data |
| `src/features/stage/mesh-builder.ts` | Reuse geometry owner, retain a focused GPU adapter |
| `src/features/stage/weight-painter.ts` | Input/overlay adapter; weight editing policy belongs to core/rig + application |
| `packages/contracts/src/scene/` | Migrate instance/camera/shot to new owners with compatibility adapters |
| `packages/application/src/projects/project-state.ts` | New registries and consistent revision/transactions |
| `packages/core/src/director/script-parser.ts` | Script→shot proposals, not another sequence engine |

Existing source has logic and tests worth evaluating for reuse. Do not describe
all source as the old compressed draft or rewrite everything. Each migration
retains necessary import compatibility with an end date, not two parallel schema
owners. Planning tasks do not edit source.

## 6. Implementation and verification rules

Before parallel work, stabilize reference/time/clip-placement schemas, command
boundaries and fixtures. Each file has one write owner. Each source file stays
within 800 physical lines and splits by responsibility; geometry may split into
contour/topology/triangulation, drawing into brush/tiles/exposure/masks, never generic utils.

Ownership acceptance: identical UI/MCP commands produce identical state;
draw/animate/compose/edit do not own separate samplers/time conversions; remeshing
uses one dependency validator; save/reopen preserves documents and source dependency
graphs remain acyclic.

References: [PLAN.md](PLAN.md), [CODING_RULES.md](CODING_RULES.md),
[PROJECT_FORMAT.md](PROJECT_FORMAT.md), [COMMAND_BUS.md](COMMAND_BUS.md),
[UI_SPECIFICATION.md](UI_SPECIFICATION.md), [TESTING_STRATEGY.md](TESTING_STRATEGY.md),
[MCP_TOOLS.md](MCP_TOOLS.md), [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md),
[IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md), [AUTO_RIG.md](AUTO_RIG.md),
[RENDER_PROFILES.md](RENDER_PROFILES.md).
