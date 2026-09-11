# Architecture Decision Records (ADR)

This log records significant architectural decisions with context, decision rationale,
and technical consequences in chronological order.
Status values: `accepted`, `proposed`, `superseded by ADR-XXX`.

---

## ADR-001: Pure 2D/2.5D Architecture Without Blender or Godot

**Status:** accepted

**Context:**
Early concepts explored Blender as a rendering backend and Godot for viewport display.
Both engines introduce heavy installer footprints, brittle IPC pipelines, and complex subprocess
lifecycle management on consumer Windows and Linux machines.

**Decision:**
Adopt a pure 2D/2.5D architecture: planar textured layered meshes, 2D skeletal deformation,
warp deformers, and depth camera projections. Zero runtime dependency on Blender, Godot,
or external 3D engines.

**Consequences:**
- The application owns its rendering pipeline entirely; zero external desktop dependencies.
- Full 3D model authoring, 3D volumetric meshes, and fluid/cloth simulations are excluded.
- Parallax and drop shadows are achieved via planar depth layering and camera projection.
- Visuals are bounded by provided 2D artwork angles without true 3D volume.

**References:** [PLAN.md](PLAN.md) sections 1, 9.

---

## ADR-002: Three.js with WebGL2 as the Single Authoritative Renderer

**Status:** accepted

**Context:**
The engine requires skeletal skinning, layered materials (color + normal map + alpha),
dynamic shadow maps, and flexible camera projections. Options: Three.js, PixiJS, custom WebGL engine.

**Decision:**
Deploy Three.js with WebGL2 as the sole renderer for both interactive preview and offline video export.
PixiJS and Three.js will not be hybridized.

**Rationale:**
- Three.js provides mature, battle-tested SkinnedMesh, MeshStandardMaterial, shadow mapping, and cameras.
- Permissive MIT license with comprehensive documentation and active maintenance.
- Hybridizing two renderers introduces excessive overhead in synchronizing poses, materials, picking, and shadow passes.
- WebGPU will be evaluated once the WebGL2 pipeline reaches maturity.

**Consequences:**
- All rendering logic resides under `packages/runtime/src/`.
- Viewport preview and offline export share the identical Three.js scene graph.
- Performance relies on WebGL2 capabilities.

**References:** [PLAN.md](PLAN.md) sections 3, 4.

---

## ADR-003: AI Image Generation via AI Client Tools and MCP Ingestion

**Status:** accepted

**Context:**
The tool requires visual assets (characters, props, backgrounds). Options:
(a) Bundle local Stable Diffusion / ComfyUI models.
(b) Embed external cloud generation API keys in the app.
(c) Utilize the AI client's built-in generation capabilities (Codex / Antigravity) and ingest via MCP.

**Decision:**
Option (c): The AI agent leverages the existing generation tools within its client environment,
then ingests the resulting assets into the application via MCP tools. The application does not
bundle models or manage external API keys.

**Rationale:**
- Eliminates multi-gigabyte model downloads and local VRAM exhaustion during rigging.
- Eliminates user API key configuration overhead.
- Leverages the user's active AI subscription tier and image models.
- The MCP server only implements asset validation and ingestion protocols.

**Consequences:**
- Relies on the AI client possessing active image generation capabilities.
- Offline image generation without an active AI agent is not available.
- Requires robust file transfer and upload handoff protocols between agent and desktop app.

**References:** [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md), [PLAN.md](PLAN.md) section 5.

---

## ADR-004: TypeScript Owns Primary Business Logic, Rust for Measured Hot Paths

**Status:** accepted

**Context:**
The desktop shell runs on Tauri (Rust). Should rigging, timeline, and animation logic
reside in TypeScript or Rust?

**Decision:**
TypeScript owns all core business logic (rigging, animation, deformation, scene hierarchy, commands).
Rust is reserved strictly for Tauri window management, native sidecar lifecycle, and measured hot paths.

**Rationale:**
- UI (React), MCP adapter (TypeScript SDK), and renderer (Three.js) all run in TypeScript.
  Direct module imports avoid serialization overhead.
- Maintains a single authoritative codebase and single test suite.
- Rust/WASM migration occurs only when profiling reveals JS execution bottlenecks.

**Consequences:**
- Rust does not maintain a second copy of rigging or timeline reducers.
- Zero FFI serialization penalties for standard editing interactions.
- Hot path optimization requires strict TypeScript contract interfaces.

**References:** [PLAN.md](PLAN.md) section 3.

---

## ADR-005: Unified Single Renderer for Preview and Export

**Status:** accepted

**Context:**
Interactive preview requires speed, whereas video export demands precision.
Separate rendering engines could be built for each target.

**Decision:**
Use the identical Three.js renderer for interactive preview and headless export.
Both execute the same pose evaluator, deformation pipeline, materials, and shadow passes.

**Rationale:**
- Eliminates "preview looks different from export" inconsistencies.
- Eliminates duplicate shader and material implementations.
- Preview downscales resolution and throttles frames, but evaluates identical math.

**Consequences:**
- Export runs offline, rendering frame-by-frame and piping raw buffers to FFmpeg.
- Viewport preview skips frames dynamically to preserve interactive framerates.
- Contract tests enforce mathematical equivalence across both paths.

**References:** [PLAN.md](PLAN.md) section 6, [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 7.

---

## ADR-006: Do Not Hybridize PixiJS and Three.js

**Status:** accepted

**Context:**
PixiJS excels at 2D sprite batching. Three.js is 3D-centric but supports 2D flat meshes.
Hybrid setups often attempt to mix PixiJS for 2D sprites and Three.js for depth/lighting.

**Decision:**
Standardize exclusively on Three.js. Do not introduce PixiJS into the dependency tree.

**Rationale:**
- Hybridization requires dual-renderer synchronization: transform states, z-ordering, picking, event handling.
- Dynamic shadow maps must illuminate the same geometry rendered to the screen.
- Three.js textured planar meshes are sufficiently performant for 2D character puppetry.

**Consequences:**
- Unified rendering architecture in Three.js.
- Forfeits PixiJS automatic sprite batching; optimizations implemented directly in Three.js.

**References:** [PLAN.md](PLAN.md) section 3.

---

## ADR-007: Decouple Export Framerate from Preview Framerate

**Status:** accepted

**Context:**
Output specifications mandate 2K/4K at 60/120 FPS, but real-time viewports may drop frames
at high resolutions on mid-range hardware.

**Decision:**
Decouple timeline authoring FPS, preview FPS, and export FPS into three distinct parameters.
Export FPS strictly dictates the exact sample timestamps and total frame counts rendered.

**Rationale:**
- Offline 4K/120 FPS rendering may execute slower than real-time—this is expected and acceptable.
- Viewport preview can downsample resolution or skip display frames without corrupting timeline curves.
- Timeline FPS remains constant for authoring keyframes.

**Consequences:**
- Exporter renders every discrete frame (`totalFrames = duration * outputFps`).
- Never duplicate 60 FPS frames to fabricate 120 FPS exports.
- Consistent sampling across both paths.

**References:** [RENDER_PROFILES.md](RENDER_PROFILES.md) section 2.

---

## ADR-008: Mixamo-Style Auto-Rigging and Standardized 2D Mesh Topology

**Status:** accepted

**Context:**
Manual 2D character rigging (manual bone placement, pivot calibration, per-vertex weight painting)
is tedious and time-consuming. Users require an automated Mixamo-like workflow: place key landmarks
(chin, wrists, knees, ankles) to auto-generate the skeleton, bind pose, and weights.
Furthermore, smooth 2D bending requires edge loops mirroring 3D modeling practices.

**Decision:**
1. Implement a 2D Auto-Rig system driven by landmark detection and Rig-Ready Image Templates.
2. Standardize pipeline: Landmarks → Auto-Skeleton → Proximity Auto-Weights with layer boundary masking.
3. Enforce Mesh Topology standards: require ≥1–2 edge loops at bending joints (elbows, knees, shoulders, hips)
   and vertex rings around facial features (eyes, mouth).
4. Provide reusable animation templates (walk, run, idle, talk) with automated skeleton retargeting.

**Rationale:**
- Accelerates asset preparation from hours to under 30 seconds.
- Enables autonomous AI agents to import characters, rig skeletons, and assign motions via MCP without manual clicking.
- Eliminates mesh pinching, volume collapse, and joint gaps during extreme limb bends.

**Consequences:**
- Requires contour extraction, interior vertex scattering, and edge loop insertion algorithms in `packages/core/src/geometry/`.
- Requires standard Rig-Ready Templates (T-pose, A-pose) in character prompt engineering.

**References:** [AUTO_RIG.md](AUTO_RIG.md), [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md).

---

## ADR-009: Dual-Mode UI (Setup / Animate), Command Bus & Unified Icon System

**Status:** accepted

**Context:**
2D animation software encompasses vast functional surfaces (mesh vertex editing, bone rigging,
weight painting, timeline sequencing, dopesheet, curves, scene staging, lighting).
Cluttering these into a single screen causes cognitive overload. Furthermore, AI via MCP and
users via UI must mutate identical states. Finally, OS-native icons cause fragmented visual styles.

**Decision:**
1. Divide UI into two primary workspaces (inspired by Spine, Live2D, Rive, Moho):
   - **Setup Mode**: Dedicated to asset import, layer setup, mesh generation, landmark tuning, bone rigging, weight painting.
   - **Animate Mode**: Dedicated to timeline playback, dopesheet, curve editor, scene props, cameras, lights, and shot sequencing.
2. All UI interactions dispatch through the Application Command Bus—identical to MCP agent tools.
3. Standardize the Icon System:
   - Primary: Open-source Lucide Icons (stroke outline 24×24, `currentColor`, ISC license).
   - Fallback: Custom inline SVGs conforming strictly to the 24×24 stroke outline specification.
   - Never use OS-native icons (Segoe MDL2 / SF Symbols) or emojis.

**Rationale:**
- Clear, uncluttered user experience tailored to the specific phase of character production.
- 100% synchronization between user actions and AI agent mutations via Command Bus.
- Cross-platform visual consistency across Windows, Linux, and Web without OS font dependencies.

**Consequences:**
- Requires a workspace mode switcher in `apps/editor/`.
- Every interactive UI component maps 1-to-1 to an Application Command.
- Centralized icon registry under `apps/editor/src/ui/icons/`.

**References:** [UI_SPECIFICATION.md](UI_SPECIFICATION.md), [COMMAND_BUS.md](COMMAND_BUS.md), [MCP_TOOLS.md](MCP_TOOLS.md).

---

## ADR Template

```markdown
## ADR-NNN: [Title]

**Status:** proposed | accepted | superseded by ADR-XXX

**Context:**
[Problem statement and examined alternatives.]

**Decision:**
[Chosen architectural path.]

**Rationale:**
[Justification for the decision.]

**Consequences:**
[Positive and negative technical trade-offs.]

**References:** [Relevant documentation links.]
```
