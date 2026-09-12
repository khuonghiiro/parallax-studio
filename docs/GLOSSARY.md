# Parallax Studio Glossary

Terms are listed alphabetically. Each entry gives the English name, a short
explanation, and related documentation.

## A

### Asset
The resource unit for a character, prop, or background. It contains layers,
views, a rig, a mesh, and materials. Each asset has its own UUID.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md), [PLAN.md](PLAN.md) section 2.

### Alpha mask
A grayscale image or alpha channel that defines the transparent region of a
layer. It is used for silhouette shadows and compositing. A checkerboard
background drawn into the image is not valid alpha.
→ [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) section 5.

## B

### Batch (command)
A group of commands executed atomically: all succeed or the entire batch is
rolled back. It creates a single entry in the history stack.
→ [COMMAND_BUS.md](COMMAND_BUS.md) section 5.

### Bind pose
The reference pose of the skeleton when weights are created. The
InverseBindMatrix is calculated from the bind pose. It is synonymous with rest
pose in this context.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 2, step 3.

### Bone
A skeleton segment defined by position, rotation, length, and parent. Bones
form an acyclic tree hierarchy and control vertex positions through skin
weights.
→ [PLAN.md](PLAN.md) section 2, [MODULE_MAP.md](MODULE_MAP.md).

## C

### Camera framing
The camera's visible region in a scene, defined by its type
(orthographic/perspective), position, zoom, and near/far planes. It affects
parallax and the safe area.
→ [PLAN.md](PLAN.md) section 4.

### Cel
A distinct raster drawing with a stable identifier in the cel library. A cel can
be held across multiple frames through different Exposures.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 3, [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) section 3.

### Clip
An animation segment on a track with a start time, an end time, and a list of
keyframes. A clip can be reused by multiple instances.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 5.

### Command
An immutable object describing the intent to change project state. It has a
type, payload, commandId, and baseRevision, and is executed through the command
bus.
→ [COMMAND_BUS.md](COMMAND_BUS.md) section 2.

### Command bus
The single orchestration layer for every state change. Both UI and MCP dispatch
commands through it. It is responsible for validation, execution, history, and
revision.
→ [COMMAND_BUS.md](COMMAND_BUS.md).

### Composition
A 2.5D staging space containing a node hierarchy tree, depth planes, AssetInstances,
camera routes, and lighting/shadows.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 6, [UI_SPECIFICATION.md](UI_SPECIFICATION.md) section 7.

## D

### Deformation pipeline
The mesh-deformation sequence in a fixed order: view selection → warp/morph →
bone skinning → instance transform → camera → shadow → render.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md).

### Depth (z)
The depth value of an instance in the scene. It determines draw order and the
amount of parallax relative to the camera. It does not create real 3D volume.
→ [PLAN.md](PLAN.md) section 4.

### Draw order
The order in which layers in an asset are drawn. A layer with a higher draw
order is drawn over a lower layer. Each view has its own draw order.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 3.

### DrawingDocument
A 2D drawing document containing canvas dimensions, color profile, origin, and layer
tree (DrawingLayer). It can be opened and edited independently or linked to an asset.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 3, [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) section 2.

## E

### Easing
A function that smooths interpolation between two keyframes: linear, ease-in,
ease-out, or cubic Bezier. It defines how quickly a value changes over time.
→ [MODULE_MAP.md](MODULE_MAP.md) — `core/animation/`.

### Export FPS → see Output FPS.

### Exposure
A duration interval (measured in frames or ticks) holding a specific Cel or remaining
blank on a DrawingLayer.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 3, [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) section 3.

## F

### Frame index
An integer frame index (0, 1, 2...) in an exported video. Its relationship to
time is `time = frameIndex / outputFps`.
→ [RENDER_PROFILES.md](RENDER_PROFILES.md) section 2.

## H

### Hysteresis threshold
A stability threshold used during view switching to prevent flicker when the
view angle oscillates around the boundary between two views. The default is
±5°.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 2, step 1.

## I

### Instance
A placement of an asset in a scene. It has position, rotation, scale, and
depth. Multiple instances can reference the same asset.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 4.

### Inverse command
The opposite command used for undo. When command A adds a bone, inverse A
deletes that bone.
→ [COMMAND_BUS.md](COMMAND_BUS.md) section 6.

## K

### Keyframe
A value anchor at a specific point on the timeline. Values between two
keyframes are interpolated according to an easing function.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 5.

## L

### Layer
An image layer in an asset: a color image, an alpha mask, and an optional normal
map. The layer name describes the part, such as `head`, `torso`, or `left-arm`.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 3.

### Linear Blend Skinning (LBS)
An algorithm that deforms vertices according to bone weights. Each vertex is
influenced by no more than four bones. It has a candy-wrapper artifact when a
bone rotates more than 180°.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 2, step 3.

## M

### Manifest
The `manifest.json` file at the project root. It contains the schema version,
asset registry, scene registry, revision, and defaults.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 2.

### Morph target
A set of vertex-position deltas for a specific expression or deformation. It
is applied additively with a blend weight and requires compatible topology.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 6.

## N

### Normal map
An image that encodes surface directions to create a sense of volume under
lighting. It changes only the lighting response; it does not create actual
geometry or occluded angles.
→ [PLAN.md](PLAN.md) section 2.

### NVENC
NVIDIA's hardware encoder for H.264/HEVC. It is preferred when the driver
supports it, with a software-encoder fallback.
→ [RENDER_PROFILES.md](RENDER_PROFILES.md) section 3.

## O

### Output FPS
The frame rate of the exported video file (24/30/60/120). It determines frame
count and timestamps and is independent of actual render speed and preview FPS.
→ [RENDER_PROFILES.md](RENDER_PROFILES.md) section 2.

## P

### Parallax
The effect in which layers at different depths move relative to one another
when the camera moves. It is achieved through depth values and camera
projection without requiring a 3D model.
→ [PLAN.md](PLAN.md) section 4.

### Pivot
The origin of an asset or layer, used as the center of rotation and a position
reference. Each view has its own pivot.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 3.

### Pose
The combined state at a point in time: bone transforms, warp parameters, morph
weights, and view selection. It is the result of the pose evaluator.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 4.

### Preview FPS
The target frame rate for the editor viewport (60 by default). Resolution may
be reduced or frames skipped under heavy load. It differs from output FPS.
→ [RENDER_PROFILES.md](RENDER_PROFILES.md) section 2.

## R

### Rest pose / Rest space
The default pose and coordinate space of the mesh before animation is applied.
Warp and morph operate in rest space before bone skinning.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 2, step 2.

### Revision
An integer incremented each time a command commits successfully. It is used for
conflict detection, export snapshots, and undo tracking.
→ [COMMAND_BUS.md](COMMAND_BUS.md) section 7.

## S

### Scene
A 2.5D staging space (see also [Composition](#composition)). In the revised project format,
Composition is the formal entity managing depth planes, instances, and camera routes.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 6.

### Sequence
A complete edit assembling a timeline series of Shots, accompanied by audio tracks
and subtitle cues.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 6, [UI_SPECIFICATION.md](UI_SPECIFICATION.md) section 8.

### Shadow proxy
A simple auxiliary mesh used to create a shadow with a greater sense of volume
for a flat card. It is an extension after the first release.
→ [PLAN.md](PLAN.md) section 4.

### Shadow receiver
A simple plane, such as a floor or wall, in the scene that receives shadows
from characters and props. The app provides it; the user does not need to
create a 3D model.
→ [PLAN.md](PLAN.md) section 4.

### Shot
A film segment on the timeline corresponding to one camera setup and time
range. A timeline can contain multiple consecutive shots.
→ [PLAN.md](PLAN.md) section 7, milestone 3.

### Skinning → see Linear Blend Skinning.

### Snapshot revision
The revision at the moment an export job starts. It ensures every frame in one
job is rendered from the same scene state.
→ [RENDER_PROFILES.md](RENDER_PROFILES.md) section 5.

## T

### Timeline
A time axis containing tracks, clips, and keyframes. Time is measured in
seconds and converted to a frame index through `frameIndex = time × fps`.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 5.

### Timeline FPS
The frame division used when the user places keyframes and clips. At 24 FPS,
for example, keyframes snap to multiples of 1/24 second.
→ [RENDER_PROFILES.md](RENDER_PROFILES.md) section 2.

### Topology
The connectivity structure of a mesh: its vertex count and triangle indices.
Morphing works only between meshes with compatible topology, meaning the same
vertex count and the same indices.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 6.

### Track
A timeline lane associated with a target such as an instance, camera, or light.
It contains one or more clips.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) section 5.

## V

### View / View set
An asset's set of viewing angles: front, quarter-left, quarter-right, side, and
back. Each view has its own layers, mesh, bindings, and pivot. The view switches
according to camera direction or a control parameter.
→ [PLAN.md](PLAN.md) section 2, [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md)
step 1.

## W

### Warp grid
An n×m control grid used to deform a mesh before skinning. A control point has
an offset; each vertex is bilinearly interpolated from the four corners of its
containing cell. It is used for subtle face turns and squash/stretch.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 5.

### Weights / Skin weights
Weights that determine how much each bone influences each vertex. A vertex is
influenced by no more than four bones. The weights for each vertex sum to 1.0.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 2, step 3.

### Workspace
A specialized UI layout and toolset dedicated to a specific creative stage within
a single project (`draw`, `rig`, `animate`, `compose`, `edit`). Switching workspace does
not alter or fragment project state.
→ [UI_SPECIFICATION.md](UI_SPECIFICATION.md) section 2, [PLAN.md](PLAN.md) section 2.

### World space
The scene's shared coordinate space. Its origin is at the scene center, with
X→, Y↑, and Z+ pointing outward. Its unit is the pixel (scene unit). It comes
after the instance transform and before the camera transform.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) section 3.
