# MCP tool catalog and protocol

Status: proposed design. The tool names and schemas below are a proposed API, not a catalog
that is currently operational in the source.

## 1. General principles

- An MCP tool is a thin adapter: it receives a request from an AI agent, converts it into an
  application command, and returns the result. It contains no separate business logic.
- Input/output schemas use Zod and generate JSON Schema for the MCP SDK.
- Write tools (commands) go through the Command Bus, following the same path as the UI.
- Read tools (resources) query project state and cause no side effects.
- Idempotency: retrying with the same `requestId` does not create duplicate entities.
- Errors return readable messages and do not throw uncontrolled exceptions.

## 2. Naming convention

```text
<domain>.<action>

Examples: asset.create, rig.add_bone, animation.set_keyframe
```

Tool names use snake_case for the action, following the MCP SDK convention.
The domain corresponds to a directory in `apps/mcp/src/tools/`.

## 3. Catalog by domain

### 3.1 Project

| Tool | Type | Description |
| --- | --- | --- |
| `project.get_info` | read | Metadata, revision, and asset/scene lists |
| `project.save` | write | Save the project and return the new revision |
| `project.get_style_guide` | read | Configured style, palette, and references |

### 3.2 Asset

| Tool | Type | Description |
| --- | --- | --- |
| `asset.create` | write | Create a new asset (character/prop/background) |
| `asset.list` | read | List assets with metadata |
| `asset.get_info` | read | Details of one asset: views, layers, and rig status |
| `asset.prepare_image_brief` | read | Brief and references for the agent to generate/edit an image |
| `asset.import_image` | write | Import a real image into an asset; return asset ID and validation |
| `asset.attach_view` | write | Attach an image to an asset view |
| `asset.attach_layer` | write | Attach an image/mask to a body-part layer |
| `asset.validate_artwork` | read | Check missing layers/views and image problems |
| `asset.get_preview` | read | Return a thumbnail preview or small render |
| `asset.delete` | write | Delete an asset and related data |

### 3.3 Mesh

| Tool | Type | Description |
| --- | --- | --- |
| `mesh.detect_contour` | read | Automatically detect a contour from a layer's alpha channel |
| `mesh.generate` | write | Generate a mesh from a contour: triangulation, UVs, vertex placement |
| `mesh.add_edge_loops` | write | Add vertex loops around joints for smoother deformation |
| `mesh.set_density` | write | Adjust vertex density in areas that need more movement |
| `mesh.preview` | read | Return a wireframe mesh image over the texture for agent inspection |
| `mesh.get_info` | read | Vertex count, triangle count, topology, and edge loops |
| `mesh.refine` | write | Modify a mesh: add/remove vertices or adjust a local area |
| `mesh.validate` | read | Check degenerate triangles, UV overlap, and mesh density |

When an AI agent calls `mesh.generate`, the app performs these steps:
1. Read the alpha channel and extract the contour (silhouette).
2. Place vertices along the contour and add interior vertices (Earcut + vertex scatter).
3. Add edge loops around joint regions (shoulders, elbows, hips, knees, and neck).
4. Triangulate and create UV mapping from texture coordinates.
5. Return a mesh preview for the agent to inspect before proceeding to rigging.

The agent uses vision to inspect the mesh preview and decide where refinement is needed,
such as adding vertices around the eyes for expressions or reducing density in low-motion
regions, then calls `mesh.refine`.

### 3.4 Rig

| Tool | Type | Description |
| --- | --- | --- |
| `rig.create_skeleton` | write | Create a bone hierarchy from a template or custom definition |
| `rig.add_bone` | write | Add a bone to the hierarchy |
| `rig.remove_bone` | write | Remove a bone and update bindings |
| `rig.set_weights` | write | Set weights for a bone-layer binding |
| `rig.get_hierarchy` | read | Current bone tree, pivots, and weights |
| `rig.test_pose` | write | Apply a temporary pose and return a preview without saving it |
| `rig.set_rest_pose` | write | Set the rest pose for the current view |
| `rig.detect_landmarks` | read | Analyze an image and propose landmark positions |
| `rig.set_landmarks` | write | Set landmarks at coordinates specified by the agent/user |
| `rig.get_landmarks` | read | Read the current landmarks |
| `rig.adjust_landmark` | write | Drag/edit one landmark and update the skeleton in real time |
| `rig.auto_skeleton` | write | Generate a skeleton from landmarks + template type |
| `rig.auto_weights` | write | Generate weights from bone proximity + layer mask |
| `rig.preview_skeleton` | read | Return an image of the skeleton overlaid on the character |
| `rig.list_rig_templates` | read | List available Rig-Ready Image Templates |
| `rig.get_rig_template` | read | Template details: proportions, landmarks, and prompt |
| `rig.apply_rig_template` | write | Apply a template to an image: compute landmarks + skeleton + weights |

For Auto-Rig and Rig-Ready Template details, see [AUTO_RIG.md](AUTO_RIG.md).

### 3.5 Animation

| Tool | Type | Description |
| --- | --- | --- |
| `animation.create_clip` | write | Create a new clip on a track |
| `animation.set_keyframe` | write | Add/edit a keyframe at a time |
| `animation.delete_keyframe` | write | Delete a keyframe |
| `animation.list_clips` | read | List clips on the timeline |
| `animation.get_clip_info` | read | Keyframes, duration, and easing for a clip |
| `animation.preview_frame` | read | Render one frame at a specified time |
| `animation.list_templates` | read | List available animation templates |
| `animation.apply_template` | write | Apply a template to the current skeleton |
| `animation.adjust_template` | write | Edit keyframes from an applied template |

For animation templates and retargeting, see [AUTO_RIG.md](AUTO_RIG.md) section 6.


### 3.6 Scene

| Tool | Type | Description |
| --- | --- | --- |
| `scene.create` | write | Create a new scene |
| `scene.add_instance` | write | Place an asset instance in a scene |
| `scene.remove_instance` | write | Remove an instance |
| `scene.set_transform` | write | Set position/rotation/scale/depth |
| `scene.set_camera` | write | Configure the camera (type, position, zoom) |
| `scene.add_light` | write | Add a light |
| `scene.set_light` | write | Edit a light (direction, color, intensity, shadows) |
| `scene.get_info` | read | Current instances, camera, and lights |
| `scene.create_shot` | write | Create a shot on the timeline |
| `scene.list_shots` | read | List shots |

### 3.7 Export

| Tool | Type | Description |
| --- | --- | --- |
| `export.start_job` | write | Start rendering with a specified profile |
| `export.get_job_status` | read | Progress, frame count, errors, and remaining time |
| `export.cancel_job` | write | Cancel a running job |
| `export.list_profiles` | read | Available presets (2K/4K, 60/120 FPS, codec) |
| `export.get_result` | read | Result file path after the job completes |

## 4. Example schemas

### `asset.import_image` — Input

```jsonc
{
  // Request ID used for idempotent retry
  "requestId": "req-uuid-v4",

  // Target asset (create a new one if absent)
  "assetId": "asset-uuid" | null,

  // Path or upload reference
  "source": {
    "type": "file_path",            // file_path | upload_chunk
    "path": "/path/to/image.png"
  },

  // Metadata
  "name": "Main character — front view",
  "viewId": "front",                // null if not yet attached to a view
  "layerName": "full-body",          // null if layers have not been separated

  // Current revision for conflict checking
  "baseRevision": 42
}
```

### `asset.import_image` — Output

```jsonc
{
  "success": true,
  "assetId": "asset-uuid",
  "sourceHash": "sha256:abcdef...",
  "dimensions": { "width": 2048, "height": 2048 },
  "hasAlpha": true,
  "alphaValid": true,               // false if a fake checkerboard background is detected
  "revision": 43,
  "warnings": [
    "The 1024×1024 source image is smaller than recommended for 4K output"
  ]
}
```

### `export.start_job` — Input

```jsonc
{
  "requestId": "req-uuid-v4",
  "sceneId": "scene-uuid",
  "profile": {
    "resolution": "3840x2160",
    "fps": 60,
    "codec": "h264",
    "quality": "high"
  },
  "frameRange": {
    "start": 0.0,                    // seconds
    "end": 10.0
  },
  "baseRevision": 42
}
```

### `export.start_job` — Output

```jsonc
{
  "success": true,
  "jobId": "job-uuid",
  "snapshotRevision": 42,
  "status": "rendering",            // rendering | encoding | waiting_renderer
  "totalFrames": 600,
  "estimatedDuration": "~5 minutes"
}
```

## 5. Special statuses

| Status | Meaning | Returned by tool |
| --- | --- | --- |
| `waiting_renderer` | The app is not open / the renderer is not ready | `export.start_job` |
| `missing_view` | The asset is missing a required view | `asset.validate_artwork` |
| `topology_mismatch` | A morph uses meshes with incompatible topology | `rig.test_pose` |
| `encoder_unavailable` | NVENC is unavailable; use software fallback | `export.get_job_status` |

## 6. Idempotency and retry

- Every write tool receives a `requestId`. Dispatching the same `requestId` again returns the
  stored result and does not create a new entity.
- A `requestId` is stored in session memory by default, or persisted if necessary.
- The default TTL for a requestId is one hour.
- Read tools do not need a `requestId` because they do not change state.

## 7. MCP tool → application command mapping

| MCP tool | Application command |
| --- | --- |
| `asset.create` | `asset.create` |
| `asset.import_image` | `asset.import-image` |
| `rig.add_bone` | `rig.add-bone` |
| `animation.set_keyframe` | `animation.set-keyframe` |
| `export.start_job` | `export.start-job` |

An MCP tool handler only:
1. Parses input with the Zod schema.
2. Maps it to a command payload.
3. Dispatches it through the application service.
4. Maps the command result to an MCP response.

It contains no rig, animation, validation, or I/O logic.

## 8. Batch operations from MCP

An agent can send multiple commands in one call to a special tool:

```jsonc
// Tool: batch.execute
{
  "requestId": "batch-uuid",
  "commands": [
    { "tool": "asset.create", "input": { ... } },
    { "tool": "asset.import_image", "input": { ... } },
    { "tool": "rig.create_skeleton", "input": { ... } }
  ]
}
```

The batch executes atomically through the Command Bus; see
[COMMAND_BUS.md](COMMAND_BUS.md).

## 9. Complete MCP filmmaking workflow

```text
1. project.get_info               → read the current project
2. asset.prepare_image_brief      → get a brief for AI image generation
3. [Agent calls the client's image-generation tool]
4. asset.import_image             → import the real image
5. asset.attach_view              → attach a viewing angle
6. asset.attach_layer             → attach each body-part layer
7. asset.validate_artwork         → validate layers, alpha, and overlap
8. mesh.detect_contour            → detect the contour from alpha
9. mesh.generate                  → automatically generate a mesh
10. mesh.add_edge_loops           → add edge loops around joints
11. mesh.preview                  → agent inspects wireframe and decides whether to refine
12. mesh.refine                   → refine the mesh if needed (repeat 11–12)
13. mesh.validate                 → validate mesh quality
14. rig.create_skeleton           → create bones
15. rig.set_weights               → set weights
16. rig.test_pose                 → test the pose and inspect the preview
17. scene.create                  → create a scene
18. scene.add_instance            → place the character
19. scene.set_camera              → camera
20. scene.add_light               → light
21. animation.create_clip         → clip
22. animation.set_keyframe        → keyframes
23. animation.preview_frame       → preview
24. export.start_job              → export the film
25. export.get_job_status         → monitor progress
26. export.get_result             → retrieve the result file
```

## 10. References

- [PLAN.md](PLAN.md) section 5 — AI/MCP and shared data
- [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) — detailed image-generation workflow
- [COMMAND_BUS.md](COMMAND_BUS.md) — the Command Bus called by MCP tools
- [MODULE_MAP.md](MODULE_MAP.md) — `apps/mcp/src/tools/`
