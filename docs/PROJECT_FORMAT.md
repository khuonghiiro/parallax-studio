# Project format and data schemas

Status: proposed design for implementation in Milestones 0–1. There is not yet an official
schema in the source; this document defines the direction and constraints to finalize during
implementation.

## 1. On-disk project directory structure

```text
<project-root>/
  manifest.json            Metadata, schema version, asset registry
  assets/
    <asset-id>/
      source/              Original images (PNG, PSD layers), normal maps, masks
      views/               Images/layers for each viewing angle
      landmarks.json       Joint-point coordinates (chin, wrist, knee...) for auto-rig
      rig.json             Bone hierarchy, weights, bindings
      mesh.json            Contours, triangulation, UVs, edge loops
      material.json        Tint, normal-map reference, roughness
      meta.json            Name, tags, provenance (AI brief, reference hash)
  scenes/
    <scene-id>/
      scene.json           Instance list, camera, lights, depth, shots
      timeline.json        Tracks, clips, keyframes
  cache/                   Regenerable data
    thumbnails/            Small previews for the asset browser
    atlas/                 Packed texture atlases
    render/                Intermediate frames for the running job
  history/                 Undo history (depending on strategy; see COMMAND_BUS)
```

### Principles

- `manifest.json` is the only entry point; opening a project starts by reading this file.
- All of `cache/` can be deleted without losing source data. The app recreates it when needed.
- Asset IDs and scene IDs use UUID v4, not file names or incrementing indices.
- Child directory and file names use English slugs and contain no special characters other
  than `-_`.
- Paths in the manifest use `/` (forward slash) and are relative to the project root.

## 2. Manifest schema

This is a draft. The official schema will be defined with Zod in
`packages/contracts/src/project/`, with JSON Schema generated from it.

```jsonc
{
  // Manifest schema version, used for migration
  "schemaVersion": 1,

  // Metadata
  "name": "Sample short film",
  "createdAt": "2026-09-11T04:00:00Z",
  "updatedAt": "2026-09-11T04:30:00Z",

  // Global revision, incremented after every successful command commit
  "revision": 42,

  // Asset registry
  "assets": {
    "<asset-id>": {
      "name": "Main character",
      "type": "character",         // character | prop | background
      "directory": "assets/<asset-id>",
      "views": ["front", "quarter-left", "quarter-right"],
      "hasRig": true,
      "sourceHash": "sha256:abcdef...",
      "createdRevision": 5,
      "updatedRevision": 38
    }
  },

  // Scene registry
  "scenes": {
    "<scene-id>": {
      "name": "Opening scene",
      "directory": "scenes/<scene-id>",
      "createdRevision": 10,
      "updatedRevision": 42
    }
  },

  // Default settings
  "defaults": {
    "timelineFps": 24,
    "previewFps": 60,
    "exportProfile": "4k-uhd-60"   // References a preset name in RENDER_PROFILES
  }
}
```

### Schema-version rules

- `schemaVersion` is an incrementing integer that starts at 1.
- When opening a project with a `schemaVersion` older than the version supported by the app,
  run an automatic migration, create a backup of the old manifest
  (`.manifest.v<N>.bak.json`), and log the changes.
- When opening a project with a newer `schemaVersion`, report a clear error and do not attempt
  to parse it.
- A migration must not lose data. A removed old field must have an explicit mapping to the new
  structure in the migration function.

## 3. Asset data

### Layers and views

Each view (viewing angle) of an asset contains:

| Field | Type | Description |
| --- | --- | --- |
| `viewId` | string | Angle name: `front`, `quarter-left`, `side-left`, `back` |
| `layers` | Layer[] | Ordered list of layers in draw order |
| `pivot` | `{ x, y }` | Origin in texture coordinates, in pixels |
| `drawOrder` | number[] | Layer indices in drawing order |

Each layer contains:

| Field | Type | Description |
| --- | --- | --- |
| `layerId` | string | UUID |
| `name` | string | Descriptive name: `head`, `torso`, `left-arm` |
| `colorPath` | string | Color-image path relative to the asset directory |
| `alphaMaskPath` | string? | Used when alpha is separate from the color image |
| `normalMapPath` | string? | Optional normal map |
| `bounds` | `{ x, y, width, height }` | Position and size within the asset canvas |

### Rig

```jsonc
{
  "bones": [
    {
      "boneId": "bone-001",
      "name": "spine",
      "parentId": null,             // null = root bone
      "position": { "x": 0, "y": 0 },  // local offset from parent, in pixels
      "rotation": 0,                // radians, local
      "length": 50                  // pixels
    }
  ],
  "bindings": [
    {
      "layerId": "layer-001",
      "boneId": "bone-001",
      "weights": [/* per-vertex weights */]
    }
  ]
}
```

Invariants:
- The hierarchy must be acyclic; validate it with a topological sort when loading.
- Each vertex has at most four bone influences; weights are normalized to a total of 1.0.
- The rest pose is the state before animation is applied and is stored separately for each view.

### Landmarks

Used by the Mixamo-style Auto-Rig workflow; see [AUTO_RIG.md](AUTO_RIG.md):

```jsonc
{
  "templateId": "humanoid-v1",
  "status": "confirmed",            // estimated | confirmed | manual
  "points": {
    "chin": { "x": 512, "y": 280 },
    "neck": { "x": 512, "y": 320 },
    "left_shoulder": { "x": 420, "y": 360 },
    "right_shoulder": { "x": 604, "y": 360 },
    "left_elbow": { "x": 360, "y": 480 },
    "right_elbow": { "x": 664, "y": 480 },
    "left_wrist": { "x": 310, "y": 600 },
    "right_wrist": { "x": 714, "y": 600 },
    "left_knee": { "x": 460, "y": 750 },
    "right_knee": { "x": 564, "y": 750 },
    "left_ankle": { "x": 450, "y": 920 },
    "right_ankle": { "x": 574, "y": 920 }
  }
}
```

### Mesh

```jsonc
{
  "contours": [/* array of contour points */],
  "vertices": [/* coordinates after triangulation */],
  "indices": [/* triangles */],
  "uvs": [/* UVs corresponding to vertices */],
  "edgeLoops": [/* arrays of vertex indices that form loops around joints */],
  "topology": "earcut-v1"          // Identifies the triangulation method
}
```

## 4. Scene data

```jsonc
{
  "instances": [
    {
      "instanceId": "inst-001",
      "assetId": "<asset-id>",
      "position": { "x": 0, "y": 0, "z": 0 },  // z = depth
      "scale": { "x": 1, "y": 1 },
      "rotation": 0
    }
  ],
  "camera": {
    "type": "orthographic",         // orthographic | perspective
    "position": { "x": 0, "y": 0, "z": 100 },
    "zoom": 1,
    "near": 0.1,
    "far": 1000
  },
  "lights": [
    {
      "lightId": "light-001",
      "type": "directional",
      "direction": { "x": -1, "y": -1, "z": -1 },
      "color": "#ffffff",
      "intensity": 1.0,
      "castShadow": true
    }
  ],
  "shadowReceivers": [
    {
      "type": "plane",
      "normal": { "x": 0, "y": 1, "z": 0 },
      "offset": -100
    }
  ]
}
```

## 5. Timeline and animation

```jsonc
{
  "duration": 10.0,                 // seconds
  "tracks": [
    {
      "trackId": "track-001",
      "targetType": "instance",     // instance | camera | light
      "targetId": "inst-001",
      "clips": [
        {
          "clipId": "clip-001",
          "startTime": 0.0,
          "endTime": 5.0,
          "keyframes": [
            {
              "time": 0.0,          // seconds, relative to startTime
              "property": "position.x",
              "value": 0,
              "easing": "ease-in-out"
            }
          ]
        }
      ]
    }
  ]
}
```

Timeline time is always measured in seconds. Convert to a frame index with
`frameIndex = time × fps`. See [RENDER_PROFILES.md](RENDER_PROFILES.md) for the three
types of FPS and the sampling method.

## 6. Saving and opening a project

### Save

1. Serialize the current state to JSON according to the schema.
2. Write a temporary file (`<file>.tmp`) and then rename it atomically to prevent corruption
   if a crash occurs mid-write.
3. Update the `revision` in the manifest.
4. Write caches (thumbnail, atlas) separately; they do not block saving.

### Load

1. Read `manifest.json` and check `schemaVersion`.
2. Migrate if needed (see section 2).
3. Validate references: every asset ID in a scene must exist in the manifest.
4. Lazy-load textures and meshes; do not read every image into RAM when opening the project.
5. Report a specific error for a missing file, invalid ID, or unsupported schema version.

### Autosave and recovery

- Autosave periodically (every two minutes by default) into a separate temporary directory.
- When opening a project, if an autosave is newer than the manifest, ask the user whether to
  restore it.
- Never silently overwrite the original project with an autosave.

## 7. Source versus cache

| Type | Examples | Can be deleted? | Stored in VCS? |
| --- | --- | --- | --- |
| Source | Original images, rig, mesh, scene, timeline | ❌ | ✅ |
| Cache | Thumbnails, atlases, temporary render frames | ✅ | ❌ (.gitignore) |
| History | Undo stack, snapshot | Depends on policy | ❌ |

## 8. References

- [PLAN.md](PLAN.md) sections 5 and 7 — project-format requirements
- [COMMAND_BUS.md](COMMAND_BUS.md) — how revision and undo interact with project saving
- [MODULE_MAP.md](MODULE_MAP.md) — `packages/contracts/src/` owns schemas, and
  `apps/service/src/adapters/persistence/` owns I/O
- [AUTO_RIG.md](AUTO_RIG.md) — landmark and auto-rig format details
- [UI_SPECIFICATION.md](UI_SPECIFICATION.md) — UI interaction with the project structure
