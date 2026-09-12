# Drawing, image preparation, and 2D layers

Status: proposed upgrade dated 12/09/2026. Geometry/rig code exists;
drawing and editing capabilities below require separate acceptance. This document
replaces the import-image-then-auto-rig-only workflow.

## 1. Objects and workspaces

| Object | Meaning |
| --- | --- |
| `DrawingDocument` | Source canvas, dimensions, color, and layer tree |
| `DrawingLayer` | Raster, group, or mask layer with name, visibility, lock, transform |
| `Cel` | A versioned raster drawing that multiple exposures may share |
| `Exposure` | A cel hold interval; blank differs from continued hold |
| `AnimationClip` | Reusable animation with exposure and/or rig tracks |
| `AssetDefinition` | Shared artwork, optional rig, and clips |
| `AssetInstance` | One asset placement in a `Composition` with independent playback |
| `Composition` | Space for layers/instances, cameras, and lights |
| `Shot` | An interval using a composition and selected camera |
| `Sequence` | Shot order and film editing tracks |

These are design terms per [PROJECT_FORMAT.md](PROJECT_FORMAT.md), not a claim
that all types exist. Workspace IDs are `draw`, `rig`, `animate`,
`compose`, `edit` per [UI_SPECIFICATION.md](UI_SPECIFICATION.md).
Static assets and frame-by-frame drawings do not require rigging.

## 2. Drawing and artwork workspace

The `draw` workspace has a central canvas, left tool strip, right layer tree/
properties, and accessible colors/brush presets. Cel editing shows an exposure
strip below identifying clip, layer, cel, and a breadcrumb back to animation.

- Raster first: brush, eraser, eyedropper, fill, lasso/rectangle selection,
  move/scale/rotate selection, and canvas zoom/pan/rotate.
- Brush settings include size, opacity, hardness, spacing, stabilization, pressure
  curve. Supported pens control size/opacity by pressure; mouse uses defaults.
  Tilt and advanced customizable brush engines are later work.
- Fill supports tolerance, contiguous mode, active/visible-layer sampling, and
  an explicit write target; it never silently alters every layer.
- Layers support rename, reorder, group, duplicate, hide, lock, alpha lock,
  clipping masks, opacity, transforms, nondestructive masks. Initial blend modes:
  Normal, Multiply, Screen; unsupported import modes are reported.
- Selection, brush outlines, and onion skins are overlays, not artwork.
  Locked layers/masks visibly disable write tools.
- A stroke/transform is one undo item: session preview, then commit through the
  application transaction shared with MCP. Cancellation discards staged changes.
- Undo stores dirty regions/tiles and restores pixels/bounds; do not copy entire
  canvases for each pointer event.
- SVG can be imported and rasterized at a chosen resolution, retaining originals.
  Full vector editing, Bézier, path booleans, and vector tweening are later work.

## 3. Cels and exposures

The `animate` workspace owns the clip timeline; `draw` edits the selected cel.
Switching preserves relevant time/selection without writing to another instance.

1. Create an asset clip and choose a drawing cadence.
2. Create a blank cel or duplicate a drawing; drag exposures to hold.
3. Draw, enable previous/next onion skins, scrub, and loop the work range.
4. Combine exposures with rig/transform tracks and preview the asset independently.
5. Place multiple instances in a composition with offset playback.

Exposures use half-open intervals in the project timebase, without pixel interpolation.
Linked exposures share edits to one cel; independent copying is explicit.
The X-sheet/dope sheet supports blank, duplicate, hold, split hold, move, trim,
extend, and range selection. Blank differs from holding the previous drawing.

Onion skin offers previous/next counts, colors, opacity, active-layer filtering;
distinct neighboring cels are the default so long holds do not repeat an overlay.
Drawing at 12/24 FPS or on twos/threes is independent of 60/120 FPS output;
camera/rig tracks interpolate at output rate, without promised automatic in-betweens.
Instance retiming does not rewrite source clips; in/out, loop, speed share one contract.

## 4. AI image creation and artifact import

AI clients generate/edit using available capabilities; the app ingests through MCP.
Do not add a default local model/API key. MCP servers cannot implicitly invoke
client image tools in reverse.

1. Briefs include request ID, revision, style/reference, dimensions, expected alpha,
   target layer/view, and artwork proportions.
2. The agent generates, inspects the actual image, and imports a file or hashed upload.
3. The app validates and returns IDs/revision/diagnostics/preview.
4. Artwork enters `draw` for masks, hidden-region repair, pivots, and layout.
5. Choose cel animation, rigid cutout, or deform mesh to suit the content.

The brief UI reports waiting for an agent without supported client invocation.
AI images do not guarantee alpha, layers, or consistent views. Manual import/
drawing remains usable without generation capability.
Actual tools/payloads belong to [MCP_TOOLS.md](MCP_TOOLS.md). Large rasters use
artifacts or bounded uploads, not repeated base64 per pen sample.

## 5. Validation and source preservation

- Validate actual MIME, dimensions, alpha, decompressed size, and hash. Painted checkerboards are not alpha.
- Track provenance per artifact/view/layer, originals, and revisions. Retry does not duplicate.
- Cloud paths are not local paths. Enforce file/upload access and quotas;
  never trust filenames or shell arguments from MCP.
- Show pixel budget against camera crop; 4K output adds no detail to small images.
- Preserve source canvas, crop offset, and pivot. UVs use the actual texture and
  crop/atlas transform, not contour bounds stretched across a whole texture.
- PSD imports supported raster layers and reports unsupported groups/masks/blends;
  no silent flattening; preserve originals for controlled reimport.
- Save/reopen/export preserves alpha, masks, colors, and cel/exposure relationships.

## 6. Part assembly

Flattened artwork can bind rigidly or deform as one mesh. Separate layers are
needed for independent part occlusion, pivots, and motion; do not claim that
single-layer images cannot be rigged.

Layer assembly offers shared-canvas placement, snapping/pivots, reference overlays,
isolate/solo, and head/torso/limb/tail/wing groups as appropriate.
Select masks/lassos to create parts or generate them individually; repair hidden
regions and test overlap across poses. Cropped canvases retain offsets; matching
canvas dimensions are not mandatory.

Per-view draw order is internal to an asset; composition instance depth is a
separate spatial coordinate. Pivots follow joints/semantics with numeric/drag edits.
Post-bind pivot edits report rig/clip impact without silently shifting artwork.

## 7. Multiple views

One view suffices for a shot using one direction. Add front, quarter-left/right,
side-left/right, or back only when required. Approve a design reference and check
clothing, proportions, colors, hidden regions, pivots, and layer names per view.

Each view owns artwork/mesh/binding with shared semantic bone mapping.
Default to discrete whole-asset switching at explicit keys. Vertex morphing requires
correspondence, compatible topology revision, and indices. Independent head/body
switching is later work.

## 8. Automatic and manual meshes

The `rig` workspace follows Artwork → Mesh → Bones → Bind → Test Pose.
Choose rigid cutout or deform mesh per layer; not every prop needs dense geometry.

1. Alpha/mask extraction with previewable threshold/tolerance.
2. Detect every connected component, outer ring, and hole.
3. Clean duplicates, self-intersections, orientation, degenerate edges.
   Simplification must not close holes or join disconnected components.
4. Triangulate valid polygons; insert constrained points/edges through a verified backend.
5. Texture/crop UVs, wireframe/diagnostics, then repair, bind, and test poses.

Earcut processes polygon rings/holes; arbitrary Poisson points fed into Earcut
are not constrained triangulation. Choose refinement through a fixture, license,
and benchmark spike before settling a library.

Required tools: vertex/edge/triangle selection, box/lasso, move, add/delete vertex,
split edge, constrained edge, local retriangulation, boundary locks, joint-region
density, quality overlay. Validation blocks invalid indices/UVs, zero area, filled
holes, self-intersections, inverted triangles; invalid meshes are not success.
Density and refinement provide control, not a guarantee of eliminating pinching.

## 9. Artwork and topology replacement

Repainting with unchanged canvas/topology may reuse binding after validation.
Alpha changes do not regenerate automatically; flag silhouette mismatches for review.
Vertex/index, UV, rest-pose, or crop changes produce a dependency impact report.

Choose to retain the old version, preview rebind/retarget, or create a new asset
revision. Weights/morphs/clips referencing old topology require repair; never truncate
arrays or reuse new vertex indices without mapping.
Undo restores artifacts, mesh, binding, and dependency status together.

## 10. Acceptance and performance

| Stage | Completion criteria |
| --- | --- |
| Drawing foundation | 3 layers, draw/erase/fill/lasso/mask, undo/redo, save/reopen retaining pixels/structure |
| Cel animation | 12 cels with hold/blank/link/copy, onion skin; 60/120 FPS preserves exposures |
| Layer assembly | Cutout character and static prop; correct pivots/overlap; controlled source update |
| Mesh repair | Donut, islands, thin alpha, bent-joint fixtures; correct holes/UVs, invalid meshes blocked |
| Film handoff | Two instances of one asset with offset clips in a multi-depth composition and camera pan |

Measure stroke latency, dirty-tile upload, undo memory, texture residency, thumbnails
on 2048/4096 canvases with 1/8/32 layers. Experimental target: p95 preview response
below 50 ms on a published fixture; unmeasured, not a promise of 120 FPS on every 4K canvas.
Use dirty tiles, revision caches, undo budgets, and cancellable jobs.

## 11. Current state and links

Inspection on 12/09/2026: contour extraction returns empty holes and follows the
first outer component; triangulation uses contour-bounds UVs. These are repair/
test gaps, not the target algorithm.

- [AUTO_RIG.md](AUTO_RIG.md): binding, weights, test poses.
- [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md): cel/clip sampling and rendering.
- [UI_SPECIFICATION.md](UI_SPECIFICATION.md): workspaces and interactions.
- [PROJECT_FORMAT.md](PROJECT_FORMAT.md): contracts and migration.
