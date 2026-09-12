# Rigging, binding, and asset animation

Status: proposed upgrade dated 12/09/2026. Auto-rig is editable assistance;
it does not guarantee accurate joint detection or appealing motion for every image.
Schemas/tools are settled in [PROJECT_FORMAT.md](PROJECT_FORMAT.md) and
[MCP_TOOLS.md](MCP_TOOLS.md), not independent APIs in this document.

## 1. Separate artwork, rig, and clip

An `AssetDefinition` contains artwork, optional rig, and `AnimationClip`.
An `AssetInstance` references the source and plays clips in a `Composition`;
editing its pose does not change every instance's rest pose or clip.

The `draw` workspace edits artwork/cels, `rig` edits meshes/bones/binds,
`animate` authors clips. `compose` places cameras/layers/lights; `edit`
assembles `Shot` objects in a `Sequence`. Cels and static props need no skeleton.

| Binding | Use | Required data |
| --- | --- | --- |
| Rigid cutout | Rigid parts, props, joint-separated artwork | Layer, pivot, optional bone/parent, transform |
| Deform mesh | Hair, fabric, soft bodies, flexible faces | Valid mesh, bind pose, inverse bind, at most 4 influences |
| Unbound | Hand-drawn cels or static cards | Artwork/exposure, transform, alpha |

One asset may mix binding types; rigid layers do not need dense meshes or weights.

## 2. Rig workspace and direct editing

Layout includes a central asset canvas, layer/bone tree, step strip
Artwork → Mesh → Bones → Bind → Test Pose, and a selection-aware inspector.
Clearly distinguish Edit Rest Pose from Test Pose to prevent accidental rest edits.

- Artwork: view/layer selection, pivot, alpha/mask overlay, isolate/solo, overlap.
- Mesh: vertex/edge/triangle selection, contour/hole repair, density/refinement,
  quality overlay per [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md).
- Bones: click chains, drag head/tail, reparent, rename, mapped mirror,
  joint limits, numeric lengths. The tree displays parent/child relationships.
- Bind: rigid/deform per layer, eligible bones, auto weights, heatmap, brush.
- Test Pose: FK, supported IK handles/pins, reset, pose presets, rest/posed comparison.
  Test poses are session evaluation; key creation is explicit within a clip.
- Each drag/brush commits one transaction at completion. Selection/overlays do not revise.
- Dependency-blocked tools explain repairable prerequisites instead of unexplained disabling.

## 3. Landmarks and templates

Landmark sources are explicit: manual placement, AI-client vision proposals,
or a selected heuristic/CV provider. Alpha heuristics do not guarantee anatomy;
low-confidence results need correction, without assuming AI is more accurate.

Templates define required/optional landmarks and semantic bone mappings.
There is no universal landmark count across humanoid/quadruped templates.
Do not interchange `chin` and `head_top`: they are different points; missing
points produce diagnostics instead of silent joint substitution.

- Humanoid first; quadruped, winged, fish, and custom chains follow staged fixtures.
- T-pose has shoulders/elbows/wrists approximately horizontal; A-pose lowers arms.
  Template illustrations and coordinates must agree, without fixed demo coordinates.
- Landmarks belong to a source canvas/view and convert explicitly to asset-local
  coordinates, including dimensions, crop offsets, pivots, and Y-axis direction.
- Views preserve semantic mapping, not identical joint pixel positions.
- Templates generate proposals previewed before commit. Proportions/landmarks are
  editable; IDs remain stable within proposals/retries, not recreated per preview.

## 4. Hierarchy and bind pose

Pre-commit validation rejects cycles, missing parents, duplicate bone IDs, invalid
lengths, ambiguous roots, non-finite transforms, and singular bind matrices.
Missing parents must not silently promote children into new roots.

Rest pose is authoring state; bind pose defines inverse bind matrices.
Skinning uses global bone transforms within asset space, then applies instance/
world transforms, avoiding double application of world transforms.

Rest-pose, hierarchy, pivot, and topology edits report impacts on bindings, morphs,
and clips. Rebind/retarget includes preview and atomic undo.
Display-name edits preserve stable-ID tracks; bone deletion reports affected tracks.

## 5. Controlled automatic weights

The initial algorithm is proximity/envelope weighting with layer constraints,
not heat diffusion.

1. Derive eligible bones from layer/region semantics and user/template mappings.
2. Measure distance to bone segments in the same asset/rest coordinate space.
3. Produce finite, nonnegative scores with relative-size falloff and radius.
4. Retain locked influences; select top 4 with stable bone-ID tie-breaking.
5. Normalize unlocked remainder after pruning so the final sum is 1.
6. Validate sum error at most 0.001, no more than 4 influences, existing bones.

If locks exceed budget/sum or no valid candidate exists, report a diagnostic for
bone/region selection; do not generate NaNs or assign every bone equally.
Vertex-on-segment cases use a defined epsilon policy rather than division by zero.

Do not use absolute demo-character thresholds, X signs for anatomical sides, or
bone-name substrings as universal anatomy rules. Mirroring, cropping, scaling,
and animals follow data/mapping-based principles.

Identical input, template revision, and parameters produce deterministic results.
Cache adjacency/candidates by topology; larger jobs offer progress/cancel and
commit only after validation without blocking the UI.

## 6. Brush and binding repair

Weight brushes support add, subtract, replace, smooth, radius, strength, falloff,
bone locks, selected-vertices-only, and numeric influence tables.
Rigid binding selects bone/parent directly without weight painting.

Smoothing follows mesh adjacency and boundary/region locks. Do not mix weights
across islands or opposite sides merely because they are close in the image.
Strokes use shared top-4/normalize/validate logic for preview and commit.
Cancel restores previous weights; undo is per stroke, not per sample.

## 7. Separate asset clips

The `animate` workspace provides a clip library, isolated canvas, dope sheet,
and graph editor. Author named clips, trim/loop work ranges, key transforms/bones/
warps/morphs, copy/paste keys, easing, stepped exposures, and explicit auto-key.

`DrawingDocument`, `DrawingLayer`, `Cel`, and `Exposure` supply hand-drawn content.
The X-sheet edits holds/blanks/copies/links in the same clip; painting opens the
source cel. One clip may combine cel blinking, bone-driven arms, and mesh clothing.
Channel precedence and blending need explicit contracts; do not silently blend
two exposures or incompatible clips.

Animation templates are starting points rather than finished results.
Retarget through stable semantic mappings, rest-pose offsets, and bone-length
ratios; report missing bones, axis/scale mismatches, and root-motion policy.
Humanoid templates do not automatically apply to quadrupeds. Preview foot sliding,
contact, overlaps, and joint ranges before saving a new clip.

Clip references and instance overrides are separate. Instance speed, trim,
offset/loop edits in compositions do not modify the source; source updates carry
revisions and report affected instances.

## 8. Staged acceptance

| Stage | Criteria |
| --- | --- |
| Rig foundation | Rigid character and prop; correct pivots, hierarchy editing, rest/test distinction, undo/reopen |
| Mesh binding | Donut, islands, bent arms; no cross-region pull; valid sums/indices/binds |
| Weight repair | Lock/add/smooth/numeric edits match UI/MCP; scale/mirror fixtures are demo-independent |
| Asset animation | 3 idle/walk/blink clips; graph/dope/X-sheet; two independently playing instances |
| Template expansion | Quadruped/custom announced only after fixtures, retargeting, and manual correction acceptance |

Do not promise “20-second auto-rig” or “1–3-second weights” without benchmarks.
Measure 1/8/32 layers, 1k/10k/50k vertices, 16/64 bones; record CPU/GPU, data,
p50/p95, peak memory, and cancellation latency. These are fixtures, not hard limits.
Latency pass/fail is settled after the spike; correctness gates apply immediately.

## 9. Current state and risks

Inspection dated 12/09/2026: auto-skeleton uses humanoid mappings; auto-weights
contains absolute character-specific zones and bone-name checks.
Replace them with data-driven eligibility/mappings before calling the rig general.
This planning update does not change source.

LBS may shrink/distort sharply bent joints; repair topology, overlap, and weights
first, then add corrective morphs when needed; no claim of eliminating every artifact.
Missing occluded artwork requires painting, not simply more bones.

## 10. Links

- [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md): drawing, layers, cels, meshes.
- [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md): sampling and deformation order.
- [UI_SPECIFICATION.md](UI_SPECIFICATION.md): workspaces and interaction.
- [PROJECT_FORMAT.md](PROJECT_FORMAT.md): ownership, revisions, migration.
- [MCP_TOOLS.md](MCP_TOOLS.md): UI/agent communication and capabilities.
