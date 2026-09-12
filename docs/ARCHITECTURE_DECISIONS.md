# Architecture Decision Records (ADR)

Each significant decision is recorded using the following format: context, decision, and
consequences. Entries are ordered chronologically. Status values are `accepted` (finalized),
`proposed` (under consideration), and `superseded` (replaced by another ADR).

---

## ADR-001: 2D/2.5D architecture without Blender or Godot

**Status:** accepted

**Context:**
The first version was expected to use Blender as the render backend and Godot for the
viewport. Both are powerful, but they require users to install large additional applications,
create a complex pipeline, and make lifecycle management difficult on Windows and Linux.

**Decision:**
Move to a pure 2D/2.5D architecture: layered artwork, flat meshes, bones, deformers, and
camera/light with depth. Do not depend on Blender, Godot, or any external 3D engine.

**Consequences:**
- The app owns its render pipeline, making it easier to package and distribute.
- Complete 3D models, cloth/fluid simulation, and a full 3D viewport are not supported.
- Parallax and shadows are achieved through depth layers and a camera, not true 3D geometry.
- The result is limited to the viewpoints provided by the 2D asset; it has no real volume.

**References:** [PLAN.md](PLAN.md) sections 1 and 9.

---

## ADR-002: Three.js + WebGL2 as the only renderer

**Status:** accepted

**Context:**
The renderer must support skinning, materials (color + normal map + alpha), shadows, and
camera projection. Candidates were Three.js, PixiJS, and a custom renderer.

**Decision:**
Use Three.js with WebGL2 as the only renderer for both preview and export.
Do not combine PixiJS and Three.js in the first version.

**Rationale:**
- Three.js already provides SkinnedMesh, MeshStandardMaterial, shadow maps, and cameras.
- It uses the MIT license, has a large community, and has good documentation.
- Combining two renderers creates synchronization costs for poses, materials, picking,
  and shadows.
- WebGPU will be evaluated after the WebGL2 pipeline is stable.

**Consequences:**
- All render logic lives in `packages/runtime/src/`.
- Preview and export use the same Three.js scene graph.
- Performance depends on WebGL2; consider WebGPU later if GPU compute is required.

**References:** [PLAN.md](PLAN.md) sections 3 and 4.

---

## ADR-003: AI image generation uses the client's tool, without installing a local model

**Status:** accepted

**Context:**
The app needs image assets (characters, backgrounds, and props). The options were:
(a) install Stable Diffusion / ComfyUI locally, (b) call an external image-generation API
with a separate API key, or (c) use the image-generation tool already available in the AI
client (Codex/Antigravity).

**Decision:**
Choose option (c): an agent in Codex/Antigravity uses the client's available image-generation
tool, then sends the result to the app through MCP. The app does not install a model and does
not require a separate image-generation API key.

**Rationale:**
- Users do not need to install gigabyte-scale models on their machines.
- Users do not need to configure an API key for an image service.
- The workflow uses the limits and quality already available through the AI account.
- MCP needs only image import and validation tools; it does not need to call a model.

**Consequences:**
- The workflow depends on the AI client having an image-generation tool available.
- Images cannot be generated offline without an AI client.
- A file-transfer protocol between the client and app is required (local path or upload).
- Image quality and style depend on the client's model.

**References:** [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md),
[PLAN.md](PLAN.md) section 5.

---

## ADR-004: TypeScript owns the main logic; Rust is reserved for measured hot paths

**Status:** accepted

**Context:**
The project uses Tauri (Rust) for the desktop shell. The question was whether rig, timeline,
and animation logic should live in TypeScript or Rust.

**Decision:**
TypeScript owns all business logic (rig, animation, deformation, scene, and commands).
Rust is used only for the Tauri shell, sidecar lifecycle, and hot paths with a clearly measured
benefit.

**Rationale:**
- The UI (React), MCP (TypeScript SDK), and renderer (Three.js) all use TypeScript, so shared
  logic in TypeScript can be imported directly without a bridge.
- This maintains one implementation source and one test suite.
- Move to Rust/WASM only when benchmarks show that JavaScript is the bottleneck.

**Consequences:**
- Rust does not maintain a second rig/timeline implementation.
- Every operation does not need to be serialized and deserialized through FFI.
- A hot path, if needed, uses a WASM module with a TypeScript interface.
- Measure before migrating; do not migrate preventively.

**References:** [PLAN.md](PLAN.md) section 3.

---

## ADR-005: One renderer for preview and export

**Status:** accepted

**Context:**
The preview renderer (fast, lossy) and export renderer (slow, accurate) could be separated.

**Decision:**
Use the same renderer (Three.js) for both preview and export, with the same pose evaluator,
deformation pipeline, materials, and shadows.

**Rationale:**
- Avoid the common problem where the preview looks different from the export.
- Reduce code duplication.
- Preview may lower resolution or shadow quality while retaining the same logic.

**Consequences:**
- Export runs offline, renders each frame, and streams it to FFmpeg.
- Preview may skip frames to maintain an interactive frame rate.
- A contract test is required: the same time produces the same pose output.

**References:** [PLAN.md](PLAN.md) section 6,
[DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 7.

---

## ADR-006: Do not combine PixiJS and Three.js

**Status:** accepted

**Context:**
PixiJS is strong at 2D sprite rendering. Three.js is strong at 3D but can also process 2D
with flat meshes. One proposal was to use PixiJS for UI/sprites and Three.js for 3D effects.

**Decision:**
Use only Three.js. Do not add PixiJS as a dependency.

**Rationale:**
- Combining two renderers requires synchronization of pose state, z-order, picking, and event
  handling.
- The shadow pass would need to see the same mesh rendered by PixiJS, adding complexity.
- Three.js handles textured flat 2D meshes well enough for this use case.

**Consequences:**
- All render logic is consistent within Three.js.
- PixiJS sprite-specific optimization (batch rendering) is not available.
- If 2D sprite performance becomes a bottleneck, optimize it within Three.js first.

**References:** [PLAN.md](PLAN.md) section 3.

---

## ADR-007: Export FPS is separate from preview FPS

**Status:** accepted

**Context:**
The required output is 60/120 FPS, but the viewport preview may not reach that frame rate
at 4K.

**Decision:**
Separate three kinds of FPS: timeline FPS, preview FPS, and output FPS. Output FPS determines
the video's frame count and timestamps independently of actual render speed.

**Rationale:**
- 4K/120 FPS may render slower than real time, which is expected.
- Preview may run at a lower resolution and skip frames.
- Timeline FPS is the authoring unit used to place keyframes.

**Consequences:**
- Export always samples every frame: `totalFrames = duration × outputFps`.
- Do not duplicate 60 FPS frames and call the result 120 FPS.
- Preview lowers quality but still uses the same pose evaluator.

**References:** [RENDER_PROFILES.md](RENDER_PROFILES.md) section 2.

---

## ADR-008: Mixamo-style Auto-Rig and standard mesh topology for 2D animation

**Status:** accepted

**Context:**
Rigging a 2D character manually (placing every bone, adjusting pivots, and painting weights
for every vertex) is very time-consuming. Users need a workflow as fast as Mixamo in 3D:
after marking only key positions (chin, wrists, knees, ankles, and so on), the app automatically
generates the complete skeleton, bind pose, and auto-weights. At the same time, smooth bending
in 2D deformation requires a standard mesh topology similar to edge loops in 3D.

**Decision:**
1. Implement a 2D Auto-Rig system based on Landmark Detection and Rig-Ready Image Templates.
2. Standardize the pipeline: Landmarks → Auto-skeleton → Auto-weights (inverse distance
   combined with layer bounds).
3. Establish a Mesh Topology standard: require ≥1-2 edge loops around bending joints
   (elbows, knees, shoulders, and hips) and vertex rings around the eyes and mouth.
4. Provide sample Animation Templates (walk, run, idle, gesture) that automatically retarget
   to the generated skeleton.

**Rationale:**
- Reduce the time required to create a movable character from hours to approximately 30 seconds.
- Allow an AI agent through MCP to generate an asset, attach a rig, and assign sample motion
  automatically without manual intervention.
- Prevent creasing, mesh distortion, or open joints during large-angle deformation.

**Consequences:**
- Contour extraction, interior vertex insertion, and edge-loop generation algorithms are
  required in `packages/core/src/geometry/`.
- A Rig-Ready Templates library is required to standardize proportions and poses
  (T-pose and A-pose).
- AI source images must follow the layout needed for the landmark algorithm to identify
  positions as accurately as possible.

**References:** [AUTO_RIG.md](AUTO_RIG.md), [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md).

---

## ADR-009: Two-mode UI architecture (Setup / Animate), Command Bus, and standard icon system

**Status:** partially superseded by ADR-010 (the two-mode Setup/Animate layout is superseded by ADR-010; Command Bus and standard icon specifications remain accepted)

**Context:**
2D/2.5D animation filmmaking software has a very large toolset (mesh drawing, bone creation,
weight painting, keyframe timeline, dopesheet, graph editor, scene layout, and camera/lighting).
Putting everything on one screen would clutter the interface and make it difficult to use.
In addition, AI through MCP and users through the UI need to control the same state. Finally,
system icons on Windows/macOS/Linux fragment the interface and are inconsistent across platforms.

**Decision:**
1. Divide the UI into two core working modes, based on Spine, Live2D, Rive, and Moho:
   - **Setup Mode**: Dedicated to asset creation, layer editing, mesh generation, landmark
     placement, bone rigging, weight painting, and test poses.
   - **Animate Mode**: Dedicated to timeline animation, dopesheet, curves/graph, props,
     camera, lights, and shot preview.
2. Every UI operation (button click, vertex drag, bone rotation, or keyframe placement) emits
     a command through the Command Bus and corresponds exactly to the AI's MCP tools.
3. Standardize the Icon System:
   - Priority 1: Use the open-source Lucide Icons library (24×24 outline strokes,
     `currentColor`, ISC license).
   - Priority 2: For specialized 2D animation tools missing from the library, AI generates an
     inline SVG that follows the geometric specification (viewBox 0 0 24 24, stroke-width 2,
     no font or raster content).
   - Never use native operating-system icons or emoji.

**Rationale:**
- The interface remains intuitive and clear without being overloaded by tools unrelated to the
  current stage of work.
- User operations (UI) and AI operations (MCP) are completely synchronized through the
  Command Bus.
- Display is 100% consistent across Windows, Linux, and the Web without relying on system fonts.

**Consequences:**
- A state switcher between Setup Mode and Animate Mode must be implemented in `apps/editor/`.
- Every UI component must map one-to-one to an Application Command.
- The icon set is managed centrally in `apps/editor/src/ui/icons/`.

**References:** [UI_SPECIFICATION.md](UI_SPECIFICATION.md),
[COMMAND_BUS.md](COMMAND_BUS.md), [MCP_TOOLS.md](MCP_TOOLS.md).

---

## ADR-010: Five dedicated workspaces (Draw, Rig, Animate, Compose, Edit) replacing two-mode Setup / Animate architecture

**Status:** proposed

**Context:**
The two-mode Setup / Animate model in ADR-009 concentrated too many responsibilities into each mode:
Setup combined drawing layers, mesh deformation, and bone rigging; Animate combined asset animation,
multiplane scene composition, camera staging, and film cut assembly. This mixed asset and shot
keyframes on the timeline, provided poor support for frame-by-frame cel drawing workflows, and
blurred the distinction between the master asset (AssetDefinition) and its placed scene instance (AssetInstance).

**Decision:**
1. Replace the two-mode design with five dedicated workspaces within a single project:
   - `draw`: Raster drawing, layer management, cels, exposure sheets, and onion skinning.
   - `rig`: Mesh editing (manual/automatic contour preserving interior holes), skeleton hierarchy, weights, and test poses.
   - `animate`: Creating and refining reusable AnimationClips for assets (dope sheet, curves, cels).
   - `compose`: 2.5D multiplane staging, AssetInstance placement, camera routes, and lighting/shadows with dual simultaneous viewers (Stage Perspective/Top/Side and Final Camera View).
   - `edit`: Complete film editing (Sequence assembly, Shot trimming and splitting, audio tracks, subtitles, and render/export queue).
2. Retain the validity of the unified Command Bus and standardized icon system (Lucide + custom inline SVG) established in ADR-009.

**Rationale:**
- Clearly demarcates data ownership and operational boundaries between drawing, rigging, asset animation, scene staging, and film editing.
- Completely resolves keyframe collision between character animation and camera/shot editing.
- Enables clip reuse across multiple instances with independent time offsets without modifying source assets.
- Aligns directly with the full 2.5D filmmaking pipeline from artwork generation to final export.

**Consequences:**
- UI layout, shell navigation, and command routing are reorganized around five stable workspace IDs: `draw`, `rig`, `animate`, `compose`, `edit`.
- Timelines are modularized into three specialized adapters: Exposure sheet (`draw`), Clip dope sheet/curves (`animate`), and Sequence timeline (`edit`).
- Viewport supports dual viewing in Compose (Stage 3D view and Camera framing view).
- ADR-009 is marked partially superseded (two-mode layout replaced; Command Bus and icon system retained).

**References:** [UI_SPECIFICATION.md](UI_SPECIFICATION.md), [PLAN.md](PLAN.md) sections 2 and 4, [PROJECT_FORMAT.md](PROJECT_FORMAT.md), [MODULE_MAP.md](MODULE_MAP.md).

---

## Template for a new ADR

```markdown
## ADR-NNN: [Title]

**Status:** proposed | accepted | superseded by ADR-XXX

**Context:**
[The problem to solve and the alternatives.]

**Decision:**
[The selected option.]

**Rationale:**
[Why this option was selected.]

**Consequences:**
[Positive and negative effects.]

**References:** [Links to related documentation.]
```
