# Parallax Studio — 2D studio and 2.5D filmmaking plan

Updated 2026-09-12. Status: proposed vNext for user review before implementation.
This change updates documentation; it does not certify that the app implements or passes the features below.

## 1. Direction and baseline

Goal: draw or import layered images → create drawn/rigged clips → assemble depth
layers → camera/light → edit multiple shots with audio/subtitles → export a film.
No Blender, Godot, or 3D model is required. Flat meshes, cameras and lights in 3D
space serve 2D artwork; the product does not become a model authoring application.

Current code includes a React editor, packages/contracts/core/application/runtime,
service, MCP and exporter. Module existence does not establish a complete workflow.
Source review on September 12 found:

| Area | Current issue to address |
| --- | --- |
| UI | Setup/Animate; fixed idle/walk/ready clips; mixed asset and shot contexts |
| Filmmaking | Scene composer exists but full layer assembly, camera path and sequence workflow is unverified |
| Mesh/rig | Contour does not preserve holes; UV/weights contain assumptions needing fixes and varied fixtures |
| MCP | Remote relay still mutates locally; timeout fallback can split state |
| Export | App path records canvas for 5 seconds at 24 FPS; frame-correct sequence export remains unverified |

Do not describe current code as a draft that has never built; rerun build/test and
inspect the actual UI during implementation. The table records source inspection,
not an executed application acceptance test.

## 2. Creative workflow and data boundaries

Five workspaces within one project:

| Workspace | Work | Result |
| --- | --- | --- |
| draw | Brush, layer assembly, cels, onion skin, exposure | DrawingDocument |
| rig | Manual/automatic mesh, skeleton, weights, test pose | AssetDefinition with valid bindings |
| animate | Asset-local clip: keys, curves, cels, loop | Reusable AnimationClip |
| compose | AssetInstance, Z planes, clip placements, camera/light | Composition and Shot |
| edit | Shot editing, dialogue/music/SFX, subtitles, render queue | Sequence and video |

DrawingDocument contains DrawingLayer, Cel and Exposure. AssetDefinition is the
source; AssetInstance is a placement in Composition. AnimationClip uses asset-local
time; ClipPlacement maps a clip onto an instance. Shot selects a composition, camera
and range; Sequence places shots in film time.
[Project Format](PROJECT_FORMAT.md) owns the precise schema and timebase.

Frame-by-frame does not require bones. Rigid cutout, deformable mesh and cel
substitutions can coexist in one asset. Multiple views require corresponding
images/layers and bindings; a single image cannot reliably reveal hidden angles.
Morph only between compatible topologies; otherwise switch views explicitly.
Normal maps affect lighting, not volume.

## 3. Platform and library reuse

Keep the existing architecture; do not replace frameworks to fix the UI.

| Component | Implementation direction |
| --- | --- |
| UI | React + TypeScript; consolidate components/tokens, Lucide and specialized SVG |
| Runtime | Three.js/WebGL2; shared evaluator and renderer for preview/export |
| Geometry | Reuse Earcut for triangulation; own contour, constraints, UV and validation |
| Drawing | Raster-first, brush/stroke/tile cache; no second scene renderer |
| Import | PNG/layer sequences first; PSD through a tested subset adapter |
| Contracts/MCP | Shared Zod/schema, TypeScript MCP SDK; service owns project state |
| Desktop | Tauri/Rust for shell, file/process lifecycle and Windows/Linux packaging |
| Export | Deterministic frame sampling + FFmpeg; probe NVENC and explicit fallback |

Verify actual dependencies, versions and licenses before adding a library. These
are reuse directions, not claims that every adapter is installed. Do not include
conditionally licensed commercial runtimes merely because their editors have
similar features. TypeScript owns shared logic; move hot paths to Rust/WASM only
after measurements. No local model, Python service or separate image API key in
the default workflow.

## 4. UI, camera and image quality

[UI Specification](UI_SPECIFICATION.md) replaces two modes with workspaces whose
timelines cover exposure, asset keys/curves, composition clips/camera and sequence
editing. Compose provides Stage Perspective/Top/Side for layer placement alongside
Final Camera View for framing. Editor navigation and film cameras are separate;
moving the viewer does not create camera keys.

Perspective plus Z planes produces parallax; orthographic retains flat behavior.
Draw order within a plane differs from depth. Instances have independent transform,
time offset and clips without moving source assets. Camera path/ease/pan/dolly/zoom
have explicit scope. Light/shadow follows alpha and deformed geometry; floor/wall
receivers use built-in planes. Unlit style, silhouette shadows and artistic shadows
are named modes. 2D cards have edge/back-view limitations; do not promise volumetric
shadows equivalent to full models.

Mesh must preserve holes/islands, source-image UV, valid weights and intact joints.
Provide preview/apply, manual vertex/bone/weight editing and extreme pose tests;
vertex counts or a 30-second auto-rig promise cannot replace validation.
See [Auto Rig](AUTO_RIG.md), [Image Workflow](IMAGE_WORKFLOW.md) and
[Deformation Pipeline](DEFORMATION_PIPELINE.md).

## 5. AI/MCP and reliability

UI/MCP share the Application Service and project revision. Separate durable
commands, session selection/playback and read/job APIs. Commit each gesture once;
transactions are atomic, retries have receipts/idempotency and conflicts have a
recovery path. Never mutate locally after remote success or an uncertain timeout.

AI reads capabilities/context → plans shots → creates/imports real images with the
client's tool → assembles assets/clips/shots → renders an artifact preview →
reviews/revises → starts an export job. MCP cannot inherently invoke internal
Codex/Antigravity image tools. UI shows handoff/waiting when the client or file is
missing. Metadata is not a preview image.
Connection Center shows service/session/project/capabilities and actionable errors.
[Command Bus](COMMAND_BUS.md) and [MCP Tools](MCP_TOOLS.md) own these contracts.

## 6. Preview, audio and export

Cel authored FPS, preview FPS and output FPS are independent. Sample camera/bones
at output times; deliberate cel holds remain stepped. Use ticks/rational rates,
half-open ranges and sequence → shot → composition → clip mapping from Project Format.
Share the evaluator/deformation pipeline; do not duplicate 60 FPS frames to claim 120.

The first filmmaking release includes cuts, audio tracks with waveform/gain/fade/
A-V sync and basic subtitles. Do not defer audio indefinitely while claiming a
complete filmmaking workflow. Render Queue selects Sequence/Shot/Range and a
snapshot revision; sample all frames offline, stream bounded buffers to FFmpeg
and show real errors/cancellation/files. Headless comes later.
[Render Profiles](RENDER_PROFILES.md) retains Full HD/2K/QHD/4K and 24/30/60/120 FPS output.

RTX 3060 12 GB is the target GPU, not proof that all scenes preview at 4K/120.
Preview targets 60 FPS at adaptive resolution; 120 FPS depends on benchmarks.
4K/120 export may run slower than real time while producing correct output.

## 7. Implementation milestones and exit criteria

| Milestone | Scope | Exit criteria before expansion |
| --- | --- | --- |
| P0. Contracts and baseline | Actual UI inventory, entity/timebase/migration contracts, service authority, save/recovery, interactive five-workspace mockup | Shared contracts settled; no split state/false success; existing projects can open/migrate |
| P1. Filmmaking vertical slice | Minimal raster Draw → cel/rigid clip → multiplane/camera Compose → Edit with 3 cuts + audio/subtitles → short export | User completes and reopens a 15-second film through UI; MCP controls the same data |
| P2. Asset studio | Brush/selection/mask/exposure per spec; manual/automatic mesh/holes/UV; skeleton/weights/test poses; clip keys/curves | UX-01/02/03; deformation fixtures, stroke undo and replace-source/rebind pass |
| P3. Composition and editing | Instance reuse, clip timing, camera paths, light/shadow, shot trim/split/ripple, complete basic audio/subtitle editing | UX-04/05/06; source/instance scope, cuts and A/V sync are correct |
| P4. AI director and recovery | Script → assets → shots → real preview → revision → export; jobs, reconnect, conflict, import handoff | UX-07; AI/UI share revisions, retries do not duplicate, no false completion |
| P5. Production quality | Render presets, cache/readback, DPI/keyboard/stylus, autosave, Windows/Linux packaging | UX-08/09/10; real video/benchmarks, queue/cancel/recovery pass |

P1 is a small complete workflow; it does not require every brush/effect at its
final level. MCP and deterministic export start in P0/P1 and expand thereafter;
do not discover separate editor/AI business logic only in P4/P5.
Each milestone includes a vertical slice, behavior checks and a demo project;
implementing many empty panels is not UI completion.

[Testing Strategy](TESTING_STRATEGY.md) owns the test matrix. Acceptance requires a
reopenable project, workflow video/screenshots, decoded/probed output when rendering,
machine configuration and measurements. Isolated tests or module names do not
replace this evidence.

## 8. Code rules and AI team

[Coding Rules](CODING_RULES.md), [Module Map](MODULE_MAP.md) and
[AI Team Protocol](AI_TEAM_PROTOCOL.md) remain applicable: at most 800 physical
lines per source file, no compressed-code workaround, descriptive names and
responsibility-based decomposition. Each business rule has one owner; search
existing ownership before creating another helper/service.

The lead settles contracts and assigns one writer per file; parallelize only
independent scope. UI, graphics, application/MCP, desktop/export and QA share
workflow acceptance criteria. Translate docs_vi into docs with every requirement
change. A request to review/edit plans alone does not authorize implementation.

## 9. Deferred scope and next step

Defer full vector editing, a brush engine at the breadth of mature dedicated
painting software, 3D/GLB model authoring, cloth/fluid, advanced automatic lip-sync,
advanced motion blur/DOF, cloud collaboration/render and headless export.
Voice generation has no default provider; the first version accepts audio files.
Do not promise automatic rigging for every silhouette or all views from one image.

The next implementation step is P0 and an interactive Draw/Compose/Edit mockup
with sample assets, followed by P1 using real data. New architecture changes are
proposed in [Architecture Decisions](ARCHITECTURE_DECISIONS.md); source implementation
starts when the user assigns that work.
