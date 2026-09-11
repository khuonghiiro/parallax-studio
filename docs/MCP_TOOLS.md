# Parallax Studio — MCP Tool Catalog & Protocol

This document defines the proposed Model Context Protocol (MCP) tool catalog, schemas,
and idempotency conventions for AI agent interaction.

## 1. Core Protocol Invariants

- MCP tools act as thin integration adapters: parse AI requests, dispatch Application Commands, return structured DTOs.
- Tool inputs and outputs are defined in Zod (`packages/contracts/`), generating standard JSON Schemas for the MCP SDK.
- Mutation tools (state writers) dispatch exclusively through the Application Command Bus—identical to UI interactions.
- Read tools (resources) query in-memory project state without side effects.
- Idempotency: re-dispatching with the same `requestId` returns the cached response without creating duplicate entities.
- Error handling: returns structured, human-readable error messages; unhandled exceptions are prohibited.

## 2. Naming Conventions

```text
<domain>.<action>

Examples:
  asset.create
  rig.add_bone
  rig.adjust_landmark
  mesh.generate
  animation.set_keyframe
```

Actions use `snake_case` conforming to MCP SDK standards.
Domains map 1-to-1 with subdirectories in `apps/mcp/src/tools/`.

## 3. Domain Tool Catalog

### 3.1 Project

| Tool | Type | Description |
| --- | --- | --- |
| `project.get_info` | read | Project metadata, global revision, asset/scene listings |
| `project.save` | write | Persists state to disk, returns incremented revision |
| `project.get_style_guide` | read | Visual style guidelines, palette constraints, reference hashes |

### 3.2 Asset Management

| Tool | Type | Description |
| --- | --- | --- |
| `asset.create` | write | Creates a new character, prop, or background entity |
| `asset.list` | read | Returns list of assets with summaries |
| `asset.get_info` | read | Complete asset details: view sets, layers, rig status |
| `asset.prepare_image_brief` | read | Generates prompt hints and proportions for AI image creation |
| `asset.import_image` | write | Ingests raw PNG into asset directory; validates alpha |
| `asset.attach_view` | write | Binds imported artwork to a specific camera view set |
| `asset.attach_layer` | write | Binds image/mask to an anatomical layer |
| `asset.validate_artwork` | read | Inspects layer separation, alpha halo fringes, and joint overlap |
| `asset.get_preview` | read | Returns downscaled base64 thumbnail or small render |
| `asset.delete` | write | Deletes asset and cascades cleanup |

### 3.3 Mesh & Topology

| Tool | Type | Description |
| --- | --- | --- |
| `mesh.detect_contour` | read | Extracts polygon silhouette contour from layer alpha |
| `mesh.generate` | write | Generates 2D mesh: Earcut triangulation, UV mapping, vertex scatter |
| `mesh.add_edge_loops` | write | Inserts concentric vertex loops around articulated joints |
| `mesh.set_density` | write | Calibrates vertex density across mobile vs. rigid body regions |
| `mesh.preview` | read | Returns wireframe mesh overlay image for visual inspection |
| `mesh.get_info` | read | Returns vertex count, triangle indices, edge loops, and UV stats |
| `mesh.refine` | write | Locally adds/removes vertices or relaxes edge flow |
| `mesh.validate` | read | Asserts zero degenerate triangles, UV overlap, or inverted normals |

When an AI agent invokes `mesh.generate`:
1. Alpha channel is parsed to extract outer silhouette contour.
2. Vertices are distributed along the perimeter and interior (Earcut + interior scatter).
3. Concentric edge loops are synthesized around joints (elbows, knees, shoulders, hips).
4. UV coordinates are mapped from texture bounds.
5. A wireframe preview is returned to the agent for visual inspection before rigging.

### 3.4 Rigging & Landmarks

| Tool | Type | Description |
| --- | --- | --- |
| `rig.create_skeleton` | write | Instantiates bone tree from template or manual definition |
| `rig.add_bone` | write | Appends bone to parent joint in hierarchy |
| `rig.remove_bone` | write | Deletes bone and safely cascades binding removal |
| `rig.set_weights` | write | Updates skin weights for bone-layer vertex bindings |
| `rig.get_hierarchy` | read | Returns bone graph, joint pivots, and weight maps |
| `rig.test_pose` | write | Applies temporary pose and returns rendered frame (non-persisted) |
| `rig.set_rest_pose` | write | Calibrates rest pose for the active view angle |
| `rig.detect_landmarks` | read | Analyzes artwork and proposes joint landmark pixel coordinates |
| `rig.set_landmarks` | write | Sets joint landmarks explicitly |
| `rig.get_landmarks` | read | Reads calibrated landmarks |
| `rig.adjust_landmark` | write | Repositions a landmark and updates bone geometry in real-time |
| `rig.auto_skeleton` | write | Synthesizes bone hierarchy from landmarks + template type |
| `rig.auto_weights` | write | Computes proximity skin weights with layer masking |
| `rig.preview_skeleton` | read | Returns skeleton overlay image rendered atop character |
| `rig.list_rig_templates` | read | Lists available Rig-Ready Image Templates |
| `rig.get_rig_template` | read | Returns template details: proportions, prompt hints |
| `rig.apply_rig_template` | write | One-step rig: computes landmarks $\to$ skeleton $\to$ weights |

Detailed auto-rigging mechanics: [AUTO_RIG.md](AUTO_RIG.md).

### 3.5 Animation & Sequencing

| Tool | Type | Description |
| --- | --- | --- |
| `animation.create_clip` | write | Creates animation clip on specified track |
| `animation.set_keyframe` | write | Inserts/updates keyframe at discrete timestamp |
| `animation.delete_keyframe` | write | Deletes keyframe |
| `animation.list_clips` | read | Lists timeline tracks and clip intervals |
| `animation.get_clip_info` | read | Returns keyframe curves, duration, and easing data |
| `animation.preview_frame` | read | Renders single frame at specified timestamp |
| `animation.list_templates` | read | Lists motion templates (walk-cycle, idle, talk...) |
| `animation.apply_template` | write | Retargets animation template onto current skeleton |
| `animation.adjust_template` | write | Modifies keyframes of applied motion template |

### 3.6 Scene Staging

| Tool | Type | Description |
| --- | --- | --- |
| `scene.create` | write | Instantiates new 2.5D staging canvas |
| `scene.add_instance` | write | Places asset instance into scene |
| `scene.remove_instance` | write | Removes instance from scene |
| `scene.set_transform` | write | Updates position, rotation, scale, and z-depth |
| `scene.set_camera` | write | Configures camera projection, position, and zoom |
| `scene.add_light` | write | Adds directional or ambient light source |
| `scene.set_light` | write | Updates light vector, intensity, color, and shadow map |
| `scene.get_info` | read | Returns placed instances, cameras, and lights |
| `scene.create_shot` | write | Defines camera shot block on timeline |
| `scene.list_shots` | read | Lists staged scene shots |

### 3.7 Offline Video Export

| Tool | Type | Description |
| --- | --- | --- |
| `export.start_job` | write | Dispatches export job with specified render profile |
| `export.get_job_status` | read | Returns completed frames, active phase, remaining time |
| `export.cancel_job` | write | Aborts export job and purges ring buffers |
| `export.list_profiles` | read | Returns standard presets (2K/4K, 60/120 FPS, codecs) |
| `export.get_result` | read | Returns output video file path upon completion |

## 4. Input & Output Schemas

### `asset.import_image` — Input Schema

```jsonc
{
  "requestId": "req-9b1deb4d-3b7d-4bad-9bdd",
  "assetId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "source": {
    "type": "file_path",            // file_path | upload_chunk
    "path": "/workspace/artifacts/character_front.png"
  },
  "name": "Protagonist — Front View",
  "viewId": "front",
  "layerName": "full-body",
  "baseRevision": 42
}
```

### `asset.import_image` — Output Schema

```jsonc
{
  "success": true,
  "assetId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "sourceHash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "dimensions": { "width": 2048, "height": 2048 },
  "hasAlpha": true,
  "alphaValid": true,
  "revision": 43,
  "warnings": []
}
```

## 5. Diagnostic State Flags

| State Flag | Technical Meaning | Associated Tools |
| --- | --- | --- |
| `waiting_renderer` | Desktop app closed / Three.js renderer unattached | `export.start_job` |
| `missing_view` | Asset lacks required perspective for camera angle | `asset.validate_artwork` |
| `topology_mismatch` | Attempted morph blend between divergent meshes | `rig.test_pose` |
| `encoder_unavailable` | NVENC unavailable; using CPU software fallback | `export.get_job_status` |

## 6. Idempotency & Retry Protocol

- Every mutation payload accepts an optional client-generated `requestId` (UUID v4).
- The Application Service caches command outcomes mapped to `requestId` for 1 hour.
- Re-dispatching with identical `requestId` returns the identical outcome without duplicate side effects.

## 7. Autonomous AI Production Pipeline Example

```text
1. project.get_info               → Read project state & style guide
2. asset.prepare_image_brief      → Generate brief with T-pose prompt hints
3. [Agent invokes AI client generation tool]
4. asset.import_image             → Ingest true-alpha character PNG
5. asset.attach_view              → Bind to 'front' view set
6. asset.validate_artwork         → Verify alpha channel integrity
7. mesh.generate                  → Synthesize 2D mesh
8. mesh.add_edge_loops           → Insert joint loops for smooth limb bending
9. mesh.preview                   → Agent inspects wireframe density
10. rig.apply_rig_template        → Auto-calculate landmarks, skeleton, and weights
11. rig.test_pose                 → Assert bending without mesh pinching
12. scene.create                  → Stage new 2.5D scene
13. scene.add_instance            → Place character on depth card
14. scene.set_camera              → Set framing and perspective
15. scene.add_light               → Add shadow-casting directional light
16. animation.apply_template      → Retarget 'walk-cycle' motion template
17. export.start_job              → Render 4K @ 60 FPS video
18. export.get_job_status         → Monitor export progress until complete
19. export.get_result             → Retrieve final MP4 file path
```

## 8. Documentation References

- [PLAN.md](PLAN.md) section 5 — Unified AI/MCP architecture
- [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) — Image generation handoff pipeline
- [COMMAND_BUS.md](COMMAND_BUS.md) — Command bus integration
- [AUTO_RIG.md](AUTO_RIG.md) — Mixamo-style auto-rigging specifications
- [RENDER_PROFILES.md](RENDER_PROFILES.md) — Export resolution and framerate presets
