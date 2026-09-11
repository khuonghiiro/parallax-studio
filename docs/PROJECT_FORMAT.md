# Parallax Studio — Project Format & Data Schemas

This document defines the on-disk directory layout, schema definitions, and serialization rules
for Parallax Studio project files. Contracts are codified in `packages/contracts/`.

## 1. On-Disk Project Directory Structure

```text
<project-root>/
  manifest.json            Project metadata, schema version, asset/scene registries, global revision
  assets/
    <asset-id>/
      source/              Raw source images (PNG, PSD layers), normal maps, alpha masks
      views/               Per-angle sliced artwork and view bindings
      landmarks.json       Calibrated joint landmarks (chin, wrist, knee...) for auto-rigging
      rig.json             Bone hierarchy, skin weights, bone-layer bindings
      mesh.json            Contour coordinates, triangulation indices, UVs, edge loop definitions
      material.json        Color tints, normal map references, roughness parameters
      meta.json            Asset display name, tags, origin (AI brief ID, reference hashes)
  scenes/
    <scene-id>/
      scene.json           Placed instances, cameras, directional lights, depth cards, shadow planes
      timeline.json        Animation tracks, discrete clips, keyframe property curves
  cache/                   Regenerable working cache (safe to delete)
    thumbnails/            Downscaled preview textures for asset browser
    atlas/                 Packed texture atlases for GPU batching
    render/                Temporary intermediate frame buffers during active export jobs
  history/                 Persisted undo/redo state stacks (snapshot or delta log)
```

### Invariants & File System Constraints

- `manifest.json` is the single authoritative root entry point.
- The `cache/` directory can be purged at any time without data loss; the engine reconstructs caches as needed.
- Asset and scene directories use persistent UUID v4 identifiers, never display names.
- Subdirectories and filenames use lowercase ASCII alphanumeric slugs with hyphens or underscores (`-_`).
- Internal path references in JSON use forward slashes (`/`), relative to `<project-root>`.

## 2. Manifest Schema

Authoritative schema defined in Zod (`packages/contracts/src/project/`):

```jsonc
{
  "$schema": "https://parallax.studio/schemas/v1/manifest.json",
  "schemaVersion": 1,
  "name": "Short Film Project",
  "createdAt": "2026-09-11T04:00:00Z",
  "updatedAt": "2026-09-11T04:30:00Z",
  "revision": 42,
  "assets": {
    "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d": {
      "name": "Protagonist",
      "type": "character",         // character | prop | background
      "directory": "assets/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "views": ["front", "quarter-left", "quarter-right"],
      "hasRig": true,
      "sourceHash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "createdRevision": 5,
      "updatedRevision": 38
    }
  },
  "scenes": {
    "5c8a14b3-7634-4b51-9dc5-d14207914f6b": {
      "name": "Scene 1 — Forest Entrance",
      "directory": "scenes/5c8a14b3-7634-4b51-9dc5-d14207914f6b",
      "createdRevision": 10,
      "updatedRevision": 42
    }
  },
  "defaults": {
    "timelineFps": 24,
    "previewFps": 60,
    "exportProfile": "4k-uhd-60"
  }
}
```

### Versioning & Migration Policy

- `schemaVersion` is a strictly monotonic integer starting at 1.
- Older schema versions automatically trigger migrations, creating a backup copy (`.manifest.v<N>.bak.json`).
- Newer schema versions unsupported by the running app fail gracefully with clear descriptive messages.
- Migrations must be lossless; deprecated properties must explicitly map to new fields.

## 3. Asset Data Schemas

### Views & Layers

Each view set represents a specific camera perspective:

| Field | Type | Description |
| --- | --- | --- |
| `viewId` | string | Canonical angle key: `front`, `quarter-left`, `quarter-right`, `side-left`, `back` |
| `layers` | Layer[] | Ordered list of artwork layers |
| `pivot` | `{ x: number, y: number }` | Coordinate origin in pixel space |
| `drawOrder` | number[] | Layer index rendering order from back to front |

Layer definition:

| Field | Type | Description |
| --- | --- | --- |
| `layerId` | string | Persistent UUID |
| `name` | string | Descriptive anatomical label: `head`, `torso`, `left_upper_arm` |
| `colorPath` | string | Relative file path to color PNG |
| `alphaMaskPath` | string? | Optional path to decoupled grayscale alpha mask |
| `normalMapPath` | string? | Optional path to normal map texture |
| `bounds` | `{ x, y, width, height }` | Bounding rectangle within the source canvas |

### Skeleton & Skinning (`rig.json`)

```jsonc
{
  "bones": [
    {
      "boneId": "bone-001",
      "name": "spine",
      "parentId": null,
      "position": { "x": 0, "y": 0 },
      "rotation": 0,
      "length": 120
    }
  ],
  "bindings": [
    {
      "layerId": "layer-001",
      "boneId": "bone-001",
      "weights": [1.0, 0.8, 0.5, 0.0]
    }
  ]
}
```

Invariants:
- Acyclic graph; verified via topological sort during serialization and deserialization.
- Maximum 4 bone influences per vertex; weights normalized to sum strictly to 1.0.
- Rest pose stored independently per view set.

### Landmarks (`landmarks.json`)

Calibrated joint coordinates for Mixamo-style auto-rigging (refer to [AUTO_RIG.md](AUTO_RIG.md)):

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

### Mesh Topology (`mesh.json`)

```jsonc
{
  "contours": [[{ "x": 10, "y": 20 }, { "x": 30, "y": 20 }]],
  "vertices": [10, 20, 30, 20, 20, 40],
  "indices": [0, 1, 2],
  "uvs": [0.1, 0.2, 0.3, 0.2, 0.2, 0.4],
  "edgeLoops": [[4, 5, 6, 7], [12, 13, 14, 15]],
  "topology": "earcut-v1"
}
```

## 4. Scene Data Schema (`scene.json`)

```jsonc
{
  "instances": [
    {
      "instanceId": "inst-001",
      "assetId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "position": { "x": 0, "y": 0, "z": -50 },
      "scale": { "x": 1, "y": 1 },
      "rotation": 0
    }
  ],
  "camera": {
    "type": "orthographic",
    "position": { "x": 0, "y": 0, "z": 500 },
    "zoom": 1.0,
    "near": 0.1,
    "far": 2000
  },
  "lights": [
    {
      "lightId": "light-001",
      "type": "directional",
      "direction": { "x": -0.5, "y": -1.0, "z": -0.5 },
      "color": "#ffffff",
      "intensity": 1.0,
      "castShadow": true
    }
  ],
  "shadowReceivers": [
    {
      "type": "plane",
      "normal": { "x": 0, "y": 1, "z": 0 },
      "offset": -200
    }
  ]
}
```

## 5. Timeline Schema (`timeline.json`)

```jsonc
{
  "duration": 10.0,
  "tracks": [
    {
      "trackId": "track-001",
      "targetType": "instance",
      "targetId": "inst-001",
      "clips": [
        {
          "clipId": "clip-001",
          "startTime": 0.0,
          "endTime": 5.0,
          "keyframes": [
            {
              "time": 0.0,
              "property": "position.x",
              "value": 0.0,
              "easing": "ease-in-out"
            }
          ]
        }
      ]
    }
  ]
}
```

All timeline timestamps are denominated in fractional seconds. Conversions to discrete frame indices:
`frameIndex = time * fps`.

## 6. Persistence & Atomic File Operations

### Atomic Save Protocol

1. State is serialized into memory according to strict Zod contracts.
2. Written to temporary sidecar files (`<filename>.tmp`).
3. Atomically renamed onto target paths to guarantee crash resistance.
4. Global `revision` incremented upon confirmed write.
5. Thumbnail generation and cache updates execute asynchronously in background tasks.

### Load Protocol

1. Read `manifest.json` and validate `schemaVersion`.
2. Execute automated migration if necessary.
3. Validate entity referential integrity (e.g., scene instances must map to existing asset entries).
4. Lazy-load GPU textures and vertex buffers on demand; never read entire assets into RAM at once.

### Autosave & Crash Recovery

- Autosave snapshots written periodically (default 2 minutes) into `.autosave/`.
- Project startup checks for newer autosaves and prompts the user for recovery.
- Never silently overwrite user files with autosave snapshots.

## 7. Source vs. Cache Categorization

| Category | Typical Contents | Recoverable? | Version Control (Git) |
| --- | --- | --- | --- |
| Source | Raw images, `manifest.json`, `rig.json`, `mesh.json`, `timeline.json` | ❌ Irreplaceable | ✅ Tracked |
| Cache | Thumbnails, packed atlases, render buffer frames | ✅ Regenerable | ❌ Ignored (`.gitignore`) |
| History | Undo/redo stack, transaction logs | Transient | ❌ Ignored |

## 8. Documentation References

- [PLAN.md](PLAN.md) — Master product scope and architecture
- [COMMAND_BUS.md](COMMAND_BUS.md) — Command bus, revision sequencing, and undo/redo
- [MODULE_MAP.md](MODULE_MAP.md) — Package ownership and contracts boundary
- [AUTO_RIG.md](AUTO_RIG.md) — Landmark detection and auto-rigging specifications
- [UI_SPECIFICATION.md](UI_SPECIFICATION.md) — Editor UI and workspace panel layouts
