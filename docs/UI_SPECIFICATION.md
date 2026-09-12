# UI specification — drawing, animation and filmmaking studio

Updated 12/09/2026. Status: proposed vNext, to be implemented in milestones.
This document replaces the two-mode Setup/Animate design. It describes target
behavior, not confirmation that features exist or have passed acceptance in the current app.

## 1. Problems and design direction

The code already contains an editor and domain packages. However, at this source inspection:
- MenuBar/ViewportPanel still use Setup/Animate; EditorContext maintains asset-oriented state.
- Clips are selected from a fixed idle/walk/ready set; the timeline mixes asset and shot keys.
- Export in App records the canvas for 5 seconds at 24 FPS, rather than exporting a complete sequence.
- SceneComposer exists, but does not yet establish that users can assemble scenes, set camera paths and edit films.

The goal is one complete creative workflow: draw a multilayer character, make a
walk clip, place multiple instances in a multiplane environment, move the camera
and cut the result into a film. Tools must identify whether the user is editing
a drawing, rig, clip, instance or shot.
Professional quality is judged by workflows that can be completed and revised,
rather than by the number of icons or decorative effects.

## 2. Five workspaces and document context

| ID | Vietnamese / English UI label | Main object | Timeline | Next action |
| --- | --- | --- | --- | --- |
| draw | Vẽ & Layer / Draw | DrawingDocument, DrawingLayer, Cel | Exposure sheet | Prepare a rig or create a hand-drawn clip |
| rig | Lưới & Xương / Rig | AssetDefinition, mesh, skeleton | Test pose, no default key recording | Create an AnimationClip |
| animate | Diễn hoạt / Animate | Asset AnimationClip | Dopesheet + curves + cels | Place the clip in a scene |
| compose | Dàn cảnh / Compose | Composition, AssetInstance, camera, light | Clip placement + camera path | Create a Shot |
| edit | Dựng phim / Edit & Export | Sequence, Shot, audio, subtitle | Sequence edit | Review, render and export |

Workspaces are layouts and tools within one project, not five applications or
five state copies. Switching workspace does not start playback, create keys or
change assets. Multiple document tabs can reopen with their previous selection/playhead.

Breadcrumbs always show Project / Asset or Composition / Clip or Shot.
Inspector labels explicitly indicate Edit Source, Edit Instance or Edit at Time.
Double-clicking a clip placement opens its source clip; returning to the composition
retains the shot. Source-clip edits affect every reference: show usage counts and
provide Duplicate/Make Unique.

## 3. Shared shell and layout

Use continuous panels that resize and dock by region. Provide File/Edit/View/
Animation/Scene/Render/Help menus, workspace tabs, document tabs and a labeled
context toolbar. Library, hierarchy and inspector are distinct panels; do not
put everything into one permanently open project tree. AI Activity is an optional
drawer rather than occupying canvas space by default.

| Region | Content | Proposed size at 1920 × 1080 |
| --- | --- | --- |
| Header | Menu, project/save status, workspace, document | 72–104 px total |
| Left | Library or contextual hierarchy, search/filter | 240–300 px |
| Center | Canvas/stage, short toolbar, viewer tabs | Remaining space, highest priority |
| Right | Inspector and selection-specific Tool Options | 280–340 px |
| Bottom | Workspace-specific timeline, transport | 220–320 px, collapsible |
| Status | Scope, frame/timecode, preview scale, job/connection | 24–28 px |

At 1366 × 768, switch the library to a tab and the inspector to a drawer when
needed; do not shrink text to fit every panel. At 125–200% DPI, drag handles,
menus and timelines must not overlap. Provide Reset Layout, Focus Canvas and
machine-local workspace persistence; layout is not serialized into film content.

Empty states offer contextual actions: New Drawing, Import Layers, New Clip,
Add Composition, Add Shot. Unsupported tools are disabled with a reason and a
way forward. Errors appear beside the task with Retry/Locate/Fix rather than
only through alerts or the console.

## 4. Draw — drawing and multilayer asset assembly

The canvas shows document pixels, transparency/checkerboard, zoom/rotate/mirror
view and separate references. Mirror view does not flip exported content.

| Panel/tool | Required initial behavior |
| --- | --- |
| Brush / Eraser | Size, hardness, opacity, color, pressure curve, smoothing; mouse fallback |
| Fill / Selection | Tolerance/contiguous, lasso/rectangle, feather, invert, transform selection |
| Layers | Thumbnail, rename, visibility, solo, lock, alpha lock, opacity, group, mask |
| Import | Layered PNG sets/sequences; supported PSD subset with unsupported-content reporting |
| Assembly | Move/rotate/scale, pivot, snap, align, parent/group, preserve offsets when reparenting |
| Palette | Project swatches and recent colors, not only a color picker |
| Exposure sheet | New blank cel, duplicate cel, hold, split hold, insert/delete frame, loop range |
| Onion skin | Before/after by distinct cels, count and opacity/tint; optional layer exclusion |

Users do not need meshes/bones for frame-by-frame drawing. Painting a layer held
across frames must show which frames share the cel; offer Make Unique before
drawing differently at one frame. Deleting an exposure differs from deleting its
source cel. One stroke is one undo; pen cancellation or capture loss must not
commit an incomplete stroke. Do not send every pointer sample as an HTTP command.

The initial version prioritizes raster; SVG import preserves source and provides
a rasterization preview. A full vector path editor, vector booleans and a
Krita-equivalent brush engine are later extensions. Do not advertise a vector
editor when only a few shapes exist.
Brush presets/raster export must produce recoverable results; persist suitable
deltas/tiles and snapshots rather than capturing the whole 4K canvas for every stroke.

Asset assembly includes joint checks for overlap, pivot, layer order and gaps.
Each layer selects None, Rigid Cutout or Deformable Mesh. Static props need no rig.
Hand-drawn clips can combine rigs with mouth-substitution cels; binding must be
compatible, or use rigid binding for cels with different silhouettes/topology.

## 5. Rig — meshes, bones and deformation validation

The workflow has explicit states: Artwork → Mesh → Skeleton → Bind → Validate.
Allow returning to each stage; do not force experts through a sequential wizard.
Left: layer/mesh/bone tabs. Center: asset in rest pose. Right: mesh settings,
weights or bone constraints. Bottom: pose-test presets and unresolved issues.

| Stage | Tools and feedback |
| --- | --- |
| Auto mesh | Alpha threshold, contour tolerance, margin, density/joint zones; preview before Apply |
| Manual mesh | Vertex/edge/face select, add/move/delete, split edge, constrained edge, local retriangulate |
| Diagnostics | Holes/islands, crossings, zero-area, UV stretch, unweighted vertices; click issues to focus |
| Skeleton | Template + editable landmarks, add/reparent bone, pivot/rest transforms, FK/IK |
| Weights | Bone selection, numerically scaled heatmap, add/subtract/smooth, normalize, lock influence |
| Test pose | Bend/rotate within limits, extreme poses, rest/deformed comparison, Reset Test Pose |

Generated meshes must preserve gaps such as arm/torso separation, disconnected
islands and UVs matching image bounds. More vertices do not guarantee quality:
criteria are silhouette preservation, no flipped triangles, no joint tearing and
controllable deformation. Do not promise automatic rigging of every animal.
Regenerate/replace source shows affected bindings/clips; create a new revision,
preview transfer/rebind and allow cancellation. Never silently discard weights/keys.
Test poses are session previews; only Bake to Clip creates durable keys.
See [Auto Rig](AUTO_RIG.md) and [Image Workflow](IMAGE_WORKFLOW.md).

## 6. Animate — dedicated asset animation

Open assets in a dedicated studio with optional reference backgrounds/cameras
and a clip browser. Provide New/Duplicate/Rename/Delete clip, duration, authored
FPS, loop, markers and thumbnails. Do not restrict animation to idle/walk/ready.
Clips are reusable across instances.

The timeline has three views of the same data:
- Dopesheet: bone/layer/deformer channels; box-select, move/copy/paste keys, snapping.
- Graph: numeric channels, tangents, easing, stepped/linear/Bezier, selected-channel filtering.
- Exposure: cel rows, holds and drawing substitutions; edit in Draw at the current frame.

Provide play, pause, frame step, previous/next key, work range and separate scratch audio.
Auto-key defaults off; enabling it displays a clear banner/indicator. When off,
trial poses are not saved automatically; show Set Key or Reset beside the action.
Only channels that actually changed are keyed.
Key diamonds distinguish none/key here/animated elsewhere/modified beyond color alone.

Support blocking poses, breakdowns, timing, inbetweens, squash/stretch, views/
expressions, root-motion policy and clip-loop seam previews. Ghosting samples
poses in time rather than copying screenshots of the entire editor. Retiming keeps
cel exposures stepped, without interpolating drawings unless the user explicitly
selects a supported effect.
An asset walk clip uses local coordinates; scene travel belongs to the instance
or explicitly selected root motion, preventing double application of movement.

## 7. Compose — multilayer staging and cameras

This is the 2.5D filmmaking assembly space, distinct from the asset editor.
Dragging assets/clips/backgrounds from Library onto the stage creates instances
with separate IDs rather than editing source assets.

```text
Project / Forest / Shot 02          Draw Rig Animate [Compose] Edit
Library + Scene Tree | Stage Perspective / Top / Side | Inspector
                    | Depth planes + camera path     | Instance
                    |--------------------------------| Camera
                    | Final Camera View              | Light
Composition timeline: instances / clips / camera / light / markers
```

Two simultaneous viewers: Stage for arranging layers/cameras and Camera View
for checking the final frame. Perspective/Top/Side expose depth planes; camera
gizmos/frustums/paths remain distinct from editor navigation. Viewer pan/zoom
does not create camera keys.
Pilot Camera has an explicit indicator; it records the camera only when enabled
with Auto-key in the correct context.

Scene Tree contains groups/pegs, background planes, character instances, props,
effects, cameras, lights and shadow receivers. Reordering within one plane
changes draw order; Z depth is a separate property. Provide lock, solo, selectable,
search and filters. Include Enter Group/Edit Source/Make Unique; prevent parent cycles.

| Operation | Visible result |
| --- | --- |
| Drag a clip from Library | Select a compatible instance or create one, place ClipPlacement at playhead |
| Duplicate instance | Shared clip/source; independent transform/time offset |
| Place a background | Full image bounds with explicit crop/fit; no default stretching |
| Adjust depth | Plane gizmo and Camera View update; Keep Framing available when changing Z |
| Move/rotate/scale | Local/world mode, pivot and numeric input, snap/grid |
| Key camera | Pan, dolly, zoom/FOV, rotation, target; path, key handles and easing |
| Add light/receiver | Intensity/color, shadow softness/bias, alpha silhouette, contact check |
| Clip timing | Trim, slip, repeat, speed, blend only compatible channels |
| Camera switch | Each shot selects a camera; cuts do not accidentally blend cameras |

Actual multiplane parallax uses perspective and depth. Orthographic is a flat
mode without automatic depth scaling; artistic parallax is a named effect and
must not be added again over perspective. Keep Framing compensates size only at
the reference frame and must offer a preview when the camera is moving.
Canvas aspect changes display crop/safe frames without automatically altering
camera keys. DOF/motion blur/volumetrics are outside baseline acceptance and are
enabled only when the runtime supports them.

## 8. Edit & Export — complete sequence editing

Sequence bin contains shots/thumbnails/status. Its viewer shows the edited cut,
rather than the asset selected in another workspace. The timeline has multiple tracks:
- Shot track: reorder, trim, split, ripple toggle, visible gaps.
- Audio tracks: dialogue/music/SFX, waveform, gain/fade/mute and A/V sync.
- Subtitle track: text, timing, safe area, font fallback; supported format import/export.
- Markers: scene beats, review notes, missing assets.

Double-clicking a shot opens Compose at the correct camera and time. Clips and
compositions retain local time; sequence placements map time according to
[Project Format](PROJECT_FORMAT.md).
Cuts come first; cross-dissolve renders both actual shots. Unsupported transitions
are disabled. Do not derive durations through ambiguous floating-point addition.

Render Queue displays Sequence/Shot/Range, output path, actual dimensions, FPS,
codec, quality, audio and preflight validation before Start. Include snapshot
revision, actual progress, cancel/retry, accessible logs and completed-file links.
Renderer loss becomes waiting_renderer; failed jobs never display Done. Preview
resolution may decrease, but export must not silently reduce quality or record
wall-clock canvas playback.
[Render Profiles](RENDER_PROFILES.md) defines 2K/4K, 60/120 FPS and frame verification.

## 9. Contextual AI Activity and MCP

The drawer shows connected client/session/project, revision, supported capabilities,
AI preparing/running/waiting/failed status and the object being edited.
Each task has a readable summary, target, progress, artifacts and retry/cancel.
Optional target highlight/focus follows user preference; AI must not steal selection
while the user draws.

AI workflow: read library and scene context → prepare shot plan → report missing
assets → create/import actual images → assemble assets/clips/shots → render real
previews → revise → export.
Review large changes by batch; do not require approval for every step already assigned.
UI Generate prepares a brief/handoff; without a connected image-generation tool,
show Waiting for image client rather than pretending a model was called.

MCP and UI share film-data commands; not every UI click becomes a tool.
Selection/layout/playback are session state; validation/preview are queries/jobs.
Conflicts show revision and refresh/reapply guidance; retries do not duplicate assets/shots.
Provide Copy Connection Diagnostics, reconnect and Codex/Antigravity setup guidance.
[Command Bus](COMMAND_BUS.md) and [MCP Tools](MCP_TOOLS.md) own detailed contracts.

## 10. Interaction language and design system

Use neutral backgrounds and typography/borders/spacing for hierarchy, accents for
selection/focus and warning colors for errors. Do not use glow/gradient/cards on
every panel. Reuse and consolidate existing components/tokens rather than changing
frameworks just to reskin the app.

- UI text 13–14 px, small labels at least 12 px, tabular digits for frame numbers.
- Controls 28–32 px tall, desktop hit areas at least 28 px; stylus preset 36–44 px.
- Spacing 4/8/12/16, control radius 3–6 px; clear dividers and visible focus rings.
- Consistent Lucide + custom SVG; icons 16–20 px with name/function/shortcut tooltips.
- Main toolbars use icons and labels; secondary tool groups are named, not icon mazes.
- Readable text contrast target 4.5:1; states include text/shapes beyond color.
- Vietnamese/English use message keys; widths are not hardcoded for English text.

Shortcuts use a contextual, customizable command registry:
Ctrl+S save, Ctrl+O open, Ctrl+Z undo, Ctrl+Shift+Z redo, Ctrl+A select all;
do not take Ctrl+P for pivot or Ctrl+W for weight overlays.
B brush, E eraser, V select, Space play when timeline has focus; hold Space to
pan when canvas has focus. Do not capture shortcuts during text entry.
Overlay controls live in View/Overlays, menus and Command Search; every core
action has a mouse-accessible route.

## 11. Performance, reliability and continuity

Use artwork caches/tiles, incremental dirty-region uploads and virtualized layer/
track rows; do not rebuild the whole scene per pointer event. Clearly badge preview
resolution. Stroke-feedback target is p95 below 33 ms in a recorded fixture;
preview target is 60 FPS, with 120 only when measured. Record CPU/RAM/driver/document
size rather than inferring performance from RTX 3060.

Save source and revision with visible autosave/recovery; missing files offer Relink
instead of displaying blank layers as valid content. Do not report Saved after
quota/I/O failure. Panel resizing, workspace switching and disconnection must not
lose committed strokes.
Users can pause AI edits, continue manually and undo at the correct scope.

## 12. Acceptance before calling the studio usable

| ID | Scenario | Pass condition |
| --- | --- | --- |
| UX-01 | Create a 6-layer drawing, draw 12 cels, hold each for 2 frames at 24 FPS | Correct onion skin, hold-edit scope warning, undo/reopen preserve strokes |
| UX-02 | Assemble arm/torso/prop, auto mesh with holes and manually edit vertices | Undistorted UVs; correct pivots/overlap; rigid and deformable work together |
| UX-03 | Create a 1-second walk and blink, duplicate and edit a clip | Source clip unchanged; Auto-key off creates no keys; loop seams inspectable |
| UX-04 | Assemble 8 planes and 2 instances sharing the walk in a forest | Clear depth/order, one time-offset instance; source asset is not moved |
| UX-05 | Create a 5-second camera pan/dolly, edit the path in Side View | Final Camera View shows parallax; editor pan does not alter the camera |
| UX-06 | Edit 3 shots/15 seconds with music and subtitles | Trim/split/undo, frame-accurate cuts, reopening preserves all references |
| UX-07 | AI adds a shot while user edits an asset, disconnect then retry | Clear conflicts/recovery, no duplicates or divergent states |
| UX-08 | Export a 2-second 4K sequence at 60 and 120 FPS | Actual 120/240 frames, correct cel holds/camera samples and audio sync |
| UX-09 | A newcomer completes UX-01→06 through UI | No JSON/source editing, no internal tool names required, no dead buttons |
| UX-10 | 1366 × 768 and 1920 × 1080, DPI 125/200%, keyboard/stylus | No panels obscure critical tools; reliable focus and drag interactions |

Every step has video/screenshots and a reopenable sample project. Paper plans,
mockups or isolated unit tests do not establish the complete workflow experience.

## 13. Implementation order and references

Order and scope limits are in [Plan](PLAN.md); technical acceptance is in
[Testing Strategy](TESTING_STRATEGY.md). Build a Draw→Animate→Compose→Edit vertical
slice with simple assets before adding many effects. Fix mesh/rig and MCP through
dedicated fixtures, then connect them to the same slice.

Interaction references do not require another application's runtime or license:
- [Krita Animation Timeline](https://docs.krita.org/en/reference_manual/dockers/animation_timeline.html): cels, exposures, onion skin.
- [Harmony Multiplane](https://docs.toonboom.com/help/harmony-20/advanced/getting-started/multiplane.html): depth planes and camera view.
- [OpenToonz Plastic](https://opentoonz.readthedocs.io/en/latest/create_animations_using_plastic_tool.html): mesh, skeleton and intentional mesh editing.
