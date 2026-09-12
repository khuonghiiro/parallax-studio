# Project format for 2D drawing and 2.5D filmmaking

Status: proposed upgrade dated 12/09/2026; not an implemented schema.
Source already contains manifest, asset, scene, clip and shot contracts in
`packages/contracts/src/`, with state in `packages/application/src/projects/`.
The following contracts replace the simple scene/timeline model in the plan;
migration and real fixtures are required before changing users' saved data.

## 1. Documents and ownership

| Proposed contract | Contents and boundary |
| --- | --- |
| `DrawingDocument` | 2D canvas, color system, drawing rate, layer tree, cel library; independently editable |
| `DrawingLayer` | Raster, group, mask or reference; order, opacity, blend, lock and exposure |
| `Cel` | One drawing with an ID; tiles/blobs, bounds, pivot and revision, not a timestamp |
| `Exposure` | Holds a cel or leaves a blank over a layer's frame interval |
| `AssetDefinition` | Reusable asset: parts, views, pivots, rig, mesh, material, drawing refs, clips |
| `AnimationClip` | Independent named motion with duration, tracks, exposures and asset-local bindings |
| `AssetInstance` | One asset placement with independent transform, overrides and clip placements |
| `Composition` | 2.5D stage: node tree, depth planes, instances, camera routes, lights, receivers |
| `Shot` | A composition take: camera, source range and take-specific overrides |
| `Sequence` | Film edit: shot placements, transitions, audio, subtitles and export range |

Workspaces `draw`, `rig`, `animate`, `compose`, `edit` open these documents;
they do not create five project copies. Selection, active tool, onion skin, panel
layout and playhead are session state and do not increase content revision.

## 2. Registry, references and time

Manifest stores project ID, schema version, content revision and drawing, asset,
clip, composition, shot, sequence and media registries. Use stable UUIDs, never
display names or array indices for links. `EntityRef` has `kind`, `id`, `revision`;
component references add `subId`. Bound entity revision need not equal global
revision. `status` values are `valid`, `stale`, `missing`, `incompatible`.

Film time uses integer ticks and a persisted `timebase` in ticks/second; FPS uses
a `numerator` / `denominator` pair. Choose a timebase representing supported
rates and audio samples exactly; never accumulate float deltas. Intervals are
half-open `[startTick, endTick)`; endpoints add no frame. Output frame n occurs at
rational time n/outputFPS. Export duration must align with an output-frame boundary;
otherwise UI/MCP offers explicit snap choices and resulting durations, never silent rounding.

`drawingFps` belongs to DrawingDocument and defines its exposure grid, such as
12 or 24. Exposures use inclusive `startFrame` and exclusive `endFrameExclusive`,
mapped to document time. Exporting at 120 FPS does not turn 12 drawings/second
into 120 drawings: cels hold while camera and rig sample at 120 timestamps.
Never interpolate cels automatically.

## 3. DrawingDocument, DrawingLayer, Cel and Exposure

DrawingDocument stores pixel dimensions, color profile, origin, layer tree and
source media. Groups are acyclic; masks declare targets and clipping scope.
Reference layers reject brushes; locked layers reject mutations. Raster cels
preserve original alpha and bounds.

Multiple exposures may reference one cel. Editing a linked cel affects all users
and the UI must disclose scope; duplication creates an independent ID. Gaps mean
blank, not infinite hold. Exposures on one layer cannot overlap. Holds and frame
insertion/deletion are explicit mutations. Onion skin is preview only, never cel
data or export content.

V1 uses editable raster cels. Vector paths/symbols are a future versioned layer
type; do not promise vector authoring from pixel-only strokes. Brush metadata
contains preset/version, spacing, pressure mapping and canvas transform; source
tiles are authoritative output. Aggregate preview samples, then commit one tile
delta and undo entry. Cancel/pointer capture loss leaves no partial committed stroke.

## 4. AssetDefinition, mesh and rig

Asset categories are character, animal, prop, background and effect; animals may
use dedicated templates. Parts reference drawing layers/cels or media by ID and
revision; each view has origin, pivot and draw order. Assembly retains transforms,
acyclic parenting and visibility without flattening source. Instances do not share mutable pose.

Each part binds as `rigid` or `skinned`. Mesh stores contour/hole constraints,
vertices, indices, UVs, topology revision and algorithm/version. Rig stores local
rest transforms, inverse bind matrices, bone IDs, limits and landmark template
version. Skin allows at most 4 influences/vertex; keep the top 4 then normalize
to 1 within tolerance 0.001; uninfluenced vertices are reported or explicitly bound.
Weights/morphs record compatible topology revisions. Landmark keys belong to
template versions, with no separate UI/MCP lists.

Per-artifact provenance includes hash, alpha convention, color-space, dimensions,
brief and references when present. Large blobs use binary files with checksum/schema
metadata, never large base64 images in JSON. Mesh errors provide diagnostics and
highlighted regions for manual correction.

Changes to contours, vertices, UVs, views or bone parents/rest pose produce
clip/instance/shot dependency reports. Never silently reuse old weights/morphs or
delete tracks with missing targets. Offer retaining the old version, previewed
rebind, or regeneration with a recoverable copy.

## 5. AnimationClip and ClipPlacement

Clips contain asset-local tracks for bone/part transform, deformers, visibility,
views and exposures. Tracks use typed target/property/value schemas, never
arbitrary property strings writing objects. Bindings contain entity/component IDs,
rig/topology revisions and compatibility signatures; matching bone names do not
authorize automatic retargeting.

`ClipPlacement` references a clip and target instance: start/end ticks, source in,
playback rate, loop mode, blend weights and channel mask. Trim/offset/speed edits
only the placement. Edit Clip discloses all users; Make Unique creates a new ID.
Walk and blink combine on separate channels; same-channel overlaps have deterministic
priority/blend rules. Clip-local motion and world travel are separate; never apply
root motion twice.

Animate preview needs no composition. Test poses/playhead do not edit rest pose;
auto-key must be explicitly enabled. Library entries package dependency IDs/revisions
for validated relinking without temporary source paths in other projects.

## 6. Composition, Shot and Sequence

Composition nodes have `parentId`, local transform and depth-plane reference.
Agree world units, axes and handedness with runtime; depth plane, in-plane draw
order and camera Z are distinct. Reparenting can preserve world transform and
rejects cycles. Lock, visibility, preview solo and cast/receive shadow differ.

Camera rigs have ID, projection, lens/zoom, clipping, target and route tracks.
Routes store timed keys/control points, orientation/aim, interpolation/ease; preview
paths, camera frame and safe area. Perspective creates depth parallax; orthographic
projection does not scale by Z automatically. Artistic parallax factors must be
explicit persisted operators shared by preview/export.

Shot references composition revision, camera, source range and shot-local overrides.
Overrides do not modify source; multiple shots view one composition through
different cameras. `ShotPlacement` stores shot ref, sequence range, source in and transition.

Sequence has video tracks, `AudioClip`, `SubtitleCue`. Audio stores media ref,
source sample range/rate, gain, fade and mute; subtitles store text, language,
style and tick range. Dissolves require handles on both sides; report shortages.
Waveforms/proxies are cache; original media is source. Sequence export range is
independent of clip authoring duration.

## 7. Save, migration and recovery

The proposed layout contains a manifest pointer, generation registry with drawings/
assets/clips/compositions/shots/sequences, hash-addressed media, recovery and cache.
Save captures one consistent revision, writes new generation/media, verifies hashes
and publishes the manifest last. Test flush/atomic replacement on Windows/Linux;
crashes must still allow opening the previous generation. Save updates persisted
revision without increasing content revision. Edits during saving remain dirty.
One transaction/batch increments content revision once.

Migration writes a new copy alongside a full backup and reports mappings before
publication. Current inclusive endFrame converts to exclusive in the old document's
frame unit, not output FPS. Old scenes map to Composition; retain IDs when unambiguous.
Never guess missing FPS/parents/clip targets: open recovery for relinking. Newer
schemas open read-only only with a safe reader, otherwise reject them.

Autosave defaults to 2 minutes into separate recovery storage; compare revision/time
before recovery and never silently overwrite source. Undo stack is session data;
recovery uses separate snapshots/journals. Cache is disposable; drawing tiles/rigs/
meshes/clips/media are not cache.

Paths are relative; validate canonical paths/symlinks/MIME/dimensions/quotas before I/O.
External relinking uses hashed import; MCP cannot escape roots. Library publication
copies or pins all dependencies; deleting the source project cannot orphan library assets.

## 8. Acceptance and references

- Save/reopen preserves linked cels, holds, pivots, rigs, clips, compositions, camera
  routes, shots, audio/subtitles and dependency revisions.
- Two instances use one clip at different offsets; editing one placement changes neither source clip nor other instance.
- Remeshing marks stale bindings; cancel restores state; rebind leaves no orphan tracks.
- One second drawn at 12 FPS exports exactly 60/120 frames with the same 12 cels and timing.
- Crashes at every save/migration step recover one consistent generation.

References: [PLAN.md](PLAN.md), [COMMAND_BUS.md](COMMAND_BUS.md),
[MODULE_MAP.md](MODULE_MAP.md), [AUTO_RIG.md](AUTO_RIG.md),
[UI_SPECIFICATION.md](UI_SPECIFICATION.md), [RENDER_PROFILES.md](RENDER_PROFILES.md),
[TESTING_STRATEGY.md](TESTING_STRATEGY.md).
