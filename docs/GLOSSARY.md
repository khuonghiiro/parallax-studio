# Parallax Studio — Technical Glossary

Alphabetical reference of domain and architectural terminology with concise explanations
and cross-document references.

## A

### Asset
A self-contained production resource: a character, prop, or background scene card.
Contains layer graphics, multi-angle view sets, skeletal rigs, meshes, and material maps.
Identified by a persistent UUID.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md), [PLAN.md](PLAN.md) section 2.

### Alpha Mask
A 1-channel grayscale image or dedicated alpha channel defining layer transparency.
Employed for dynamic silhouette shadow generation and compositing.
Faux checkerboard patterns drawn into pixel data are rejected as invalid alpha.
→ [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) section 5.

## B

### Batch (Command Batch)
An atomic composite of multiple commands executed transactionally: all succeed or all roll back.
Produces a single discrete entry in the undo/redo history stack.
→ [COMMAND_BUS.md](COMMAND_BUS.md) section 5.

### Bind Pose
The baseline reference posture of a skeletal hierarchy when skin weights are calculated.
Inverse bind matrices are derived from the bind pose. Synonymous with rest pose in this domain.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 2 step 3.

### Bone
A rigid skeletal segment defined by local position offset, rotation angle, length, and parent joint.
Forms an acyclic tree hierarchy that drives vertex positions via skin weights.
→ [PLAN.md](PLAN.md) section 2, [MODULE_MAP.md](MODULE_MAP.md).

## C

### Camera Framing
The viewing frustum within a scene, parameterized by camera projection type (orthographic or perspective),
position coordinates, zoom factor, and near/far clipping planes.
Governs depth parallax intensity and compositional framing.
→ [PLAN.md](PLAN.md) section 4.

### Clip
A discrete animation block placed on a timeline track, defined by start time, duration, and keyframe sequences.
Clips can be instanced and shared across multiple scene targets.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 5.

### Command
An immutable data object encapsulating an intent to mutate project state.
Contains command type, payload, unique commandId, and target baseRevision.
Dispatched exclusively through the Command Bus.
→ [COMMAND_BUS.md](COMMAND_BUS.md) section 2.

### Command Bus
The single authoritative dispatch pipeline for all state mutations.
Editor UI and MCP tools invoke identical commands through this bus.
Enforces schema validation, monotonic revision sequencing, undo history, and rollback.
→ [COMMAND_BUS.md](COMMAND_BUS.md).

## D

### Deformation Pipeline
The deterministic, ordered transformation pipeline applied to meshes:
`View Selection → Rest-Space Warp/Morph → Bone Skinning → Instance Transform → Camera / Shadow Pass → Frame Render`.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md).

### Depth (Z-Depth)
The planar depth coordinate of an instance within a 2.5D scene.
Dictates rendering draw order and relative parallax motion without introducing true 3D volumetric models.
→ [PLAN.md](PLAN.md) section 4.

### Draw Order
The layer stacking hierarchy within an asset view. Layers with higher draw indices render atop lower indices.
Each view set maintains independent draw ordering.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 3.

## E

### Easing
Mathematical interpolation functions between adjacent keyframes (linear, ease-in, ease-out, cubic bezier).
Dictates the rate of parameter change over time.
→ [MODULE_MAP.md](MODULE_MAP.md) — `core/animation/`.

### Export FPS
Refer to **Output FPS**.

## F

### Frame Index
An integer index (0, 1, 2...) of a discrete frame in video export:
`timestamp = frameIndex / outputFps`.
→ [RENDER_PROFILES.md](RENDER_PROFILES.md) section 2.

## H

### Hysteresis Threshold
A directional angular buffer (default ±5°) applied to camera view switching.
Prevents rapid flickering when the camera angle hovers near view set transition boundaries.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 2 step 1.

## I

### Instance
A scene-level placement of an asset, defined by world position, rotation, scale, and z-depth.
Multiple instances can reference a single underlying asset ID.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 4.

### Inverse Command
The compensating mutation executed during undo operations.
If command A adds a bone, inverse command A deletes that bone.
→ [COMMAND_BUS.md](COMMAND_BUS.md) section 6.

## K

### Keyframe
An anchored parameter value at a discrete timestamp on the timeline.
Values between keyframes are interpolated according to easing curves.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 5.

## L

### Layer
A distinct artwork element within an asset (color image, alpha mask, optional normal map).
Named by anatomical function: `head`, `torso`, `left_upper_arm`.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 3.

### Linear Blend Skinning (LBS)
The vertex deformation algorithm computing weighted linear combinations of bone transform matrices.
Constrained to a maximum of 4 bone influences per vertex.
Subject to volume collapse artifacts at rotational angles exceeding 180°.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 2 step 3.

## M

### Manifest
The root `manifest.json` file on disk. Contains schema version, asset registry,
scene registry, global revision counter, and default render presets.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 2.

### Morph Target
A set of vertex position delta vectors representing an expression or secondary deformation.
Applied additively using scalar blend weights. Requires matching mesh topology.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 6.

## N

### Normal Map
An RGB texture encoding per-pixel surface normal vectors to simulate depth under dynamic lighting.
Alters directional light response without generating occluded physical geometry.
→ [PLAN.md](PLAN.md) section 2.

### NVENC
NVIDIA dedicated hardware video encoder for H.264 and HEVC codecs.
Prioritized when GPU drivers support it; CPU software encoders act as deterministic fallbacks.
→ [RENDER_PROFILES.md](RENDER_PROFILES.md) section 3.

## O

### Output FPS
The framerate of the exported video file (24, 30, 60, 120 FPS).
Governs sample timestamps and total frame count independently of viewport preview speed.
→ [RENDER_PROFILES.md](RENDER_PROFILES.md) section 2.

## P

### Parallax
The perceived relative displacement between background and foreground cards as the camera translates.
Produced through planar depth offsets and camera projections without 3D geometry.
→ [PLAN.md](PLAN.md) section 4.

### Pivot
The local coordinate origin `{ x, y }` of an asset or layer, serving as the center of rotation and scale.
Calibrated independently per view angle.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 3.

### Pose
The evaluated composite state of an asset at a given timestamp:
bone matrices + warp grid offsets + morph target weights + active view selection.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 4.

### Preview FPS
The target framerate of the interactive editor viewport (default 60 FPS).
May drop frames or downscale resolution under load without affecting output export.
→ [RENDER_PROFILES.md](RENDER_PROFILES.md) section 2.

## R

### Rest Pose / Rest Space
The default unposed geometry and coordinate space of a mesh prior to deformation.
Warp deformers and morph targets execute in rest space before skeletal skinning.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 2 step 2.

### Revision
A monotonically increasing integer incremented upon every committed command.
Enforces concurrency control, export snapshot isolation, and undo tracking.
→ [COMMAND_BUS.md](COMMAND_BUS.md) section 7.

## S

### Scene
A staging canvas containing placed instances, cameras, directional lights, and shadow planes.
Maintains its own multi-track timeline.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 4.

### Shadow Proxy
A simplified planar proxy geometry used to cast approximate volumetric shadows for 2D cards.
Reserved for post-V1 enhancement.
→ [PLAN.md](PLAN.md) section 4.

### Shadow Receiver
A planar backdrop or ground element configured in the 2.5D scene to capture projected shadows.
Provided by the engine without requiring custom 3D modeling.
→ [PLAN.md](PLAN.md) section 4.

### Shot
A discrete narrative segment on the timeline bound to a specific camera framing and time range.
→ [PLAN.md](PLAN.md) section 7 milestone 3.

### Skinning
Refer to **Linear Blend Skinning**.

### Snapshot Revision
The project revision frozen at the moment an export job begins.
Ensures all rendered frames derive from a strictly immutable scene state.
→ [RENDER_PROFILES.md](RENDER_PROFILES.md) section 5.

## T

### Timeline
The temporal sequencer containing tracks, clips, and keyframes, denominated in fractional seconds.
Converted to discrete frames via `frameIndex = time * fps`.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 5.

### Timeline FPS
The editing subdivision unit used when placing keyframes and snapping clips (e.g., 24 FPS).
→ [RENDER_PROFILES.md](RENDER_PROFILES.md) section 2.

### Topology
The geometric mesh graph: vertex count, edge loops, and triangle index buffers.
Morph targets and blend transitions require identical, compatible topologies.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 6.

### Track
A timeline lane bound to an animation target (instance, camera parameter, light property).
Contains keyframes and clips.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 5.

## V

### View / View Set
The collection of camera perspectives for a 2D asset: front, quarter-left, quarter-right, profile, back.
Each view encapsulates independent layers, meshes, skin bindings, and pivots.
Transitions triggered by camera orientation or explicit animator parameters.
→ [PLAN.md](PLAN.md) section 2, [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) step 1.

## W

### Warp Grid
An N×M control point lattice used to deform 2D meshes prior to skeletal skinning.
Vertices interpolate bilinear offsets from bounding grid cells.
Employed for subtle facial turns, eye blinks, and squash-and-stretch dynamics.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 5.

### Weights / Skin Weights
Scalar coefficients determining the influence of specific bones on individual vertices.
Constrained to a maximum of 4 bones per vertex with normalized sum equal to 1.0.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 2 step 3.

### World Space
The common coordinate space of the 2.5D scene. Origin centered at `(0, 0, 0)`,
+X right, +Y up, +Z toward camera. Evaluated after instance transforms and prior to camera projection.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 3.
