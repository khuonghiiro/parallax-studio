# Testing strategy for the drawing and filmmaking studio

Status: proposed upgrade dated 12/09/2026. Source already contains package unit/
integration tests and `tests/mcp.integration.ts`; these do not establish the new
studio workflows. This document specifies additional tests, not passing results.

## 1. Verification layers and evidence

| Layer | Scope | Required evidence |
| --- | --- | --- |
| Unit | Pure drawing, time, rig, geometry, dependency, composition | Fixtures, invariants and deterministic results |
| Integration | Commands, media, transactions, persistence, service/MCP | State/revision, side effects, errors and recovery |
| UI workflow | Pen/mouse/keyboard, panels, timelines, composition | Recording or trace, not only attractive screenshots |
| Visual | Cel alpha, mesh bending, lighting/shadows, camera and export | Renderer-specific goldens with justified tolerance |
| Hardware | Windows/Linux, RTX 3060 12 GB, encoder | OS/driver/backend, workload, p50/p95, RAM/VRAM |
| E2E | Draw→rig→clip→compose→sequence→video, including MCP | Reopenable project fixture and media probe |

New tests protect actual behavior, not merely button existence or entirely mocked
algorithms. Tasks run relevant checks; releases run all committed workflows.
Missing tests do not establish feature acceptance.

## 2. Drawing, exposures and tablets

- Create DrawingDocument with raster/group/mask/reference layers; reordering,
  previewed merging, lock, clipping and opacity preserve alpha through save/reopen.
- Brush/eraser/fill/selection-transform affect the correct cel/layer and respect
  masks/locks. Raster results use the same semantics through UI and MCP.
- A stroke with 200 pointer samples creates one transaction/undo entry; undo/redo
  restores pixels. Cancel, pointer capture loss, tab switches or lost focus leave
  no partial stroke. Test pressure pens and non-pressure mice.
- Unsupported pressure/tilt has explicit fallback. Calibration covers pan/zoom/
  rotation, high DPI, fast/slow movement and palm/touch policy; command dispatch
  duration does not establish tablet latency.
- Linked cel edits affect every exposure using its ID; duplicates edit independently.
  Hold, blank, insert/delete/ripple exposures preserve duration and never overlap on one layer.
- Onion skin is preview only; one second of 12 cels at 12 FPS remains 12 cels at
  60 or 120 FPS output, while camera movement samples at output FPS between exposures.
- Tile-delta undo has bounded memory; repeated strokes leave no orphan textures/workers.

## 3. Assembly, mesh, rig and dependencies

| Fixture | Invariant |
| --- | --- |
| Part layer assembly | Pivot and world transform remain stable on reparent; reject cycles |
| Contour holes/concavity/islands | Mesh preserves silhouette and holes; no triangle outside the domain |
| Degenerate/self-intersecting contour | Clear diagnostic; no crash or silent invalid mesh publication |
| Mesh editing | Add/delete/move vertex, edge and density edits affect intended regions; UVs do not jump unexpectedly |
| Rigid/skinned parts | Rigid follows bone; skinned has valid rest/bind and at most 4 influences |
| Weights | Top 4 before normalization; sum 1 ± 0.001; report zero/orphan/nonfinite values |
| Joint pose suite | Elbow/knee bends, twist/tail and extreme poses do not flip triangles beyond fixture thresholds |
| Rest pose / IK | Correct rest/inverse bind matrices; acyclic hierarchy and explicit IK limits |
| Remesh / change bone rest | Mark stale weights/morphs/clips, preview rebind, cancel retains old version |
| Asset source replacement | Preserve compatible IDs, report users; never silently delete missing-target tracks |

Use silhouettes with holes, overlapping arms/body, narrow limbs, alpha hair/fur
and animals instead of only favorable demo characters. Test shared UI/MCP landmark
template keys/versions. Measure automation success; contour heuristics do not
establish anatomical understanding.

## 4. Clips and three time domains

- AnimationClip opens/edits in animate without a composition. Create independent
  walk/blink clips; disabled auto-key writes no pose and test poses leave rest pose untouched.
- Two instances use one clip at different offsets/rates; placement edits change
  neither source nor other instance. Edit Clip reports users; Make Unique separates IDs.
- Key/curve interpolation, step/hold, channel masks, blending, loop seams, trimming
  and root motion are correct. Never apply world travel twice.
- Exposure grids, film ticks and output samples convert through one owner. Test
  half-open intervals before/at/after boundaries. Never duplicate the final frame.
- Rational rates, source-in offsets, invalid negative/zero speeds and unaligned
  export ranges have deterministic behavior without silent rounding.
- At the same timestamp, preview/export share cel ID, key values, pose/vertices,
  camera matrix, shot and subtitle/audio timing.

## 5. Composition and sequence

- Assemble foreground/midground/background, character and prop on depth planes;
  drag/drop, parenting, pivot, snapping, visibility/lock survive reopening.
- Perspective camera routes pan/dolly/aim through layers with real parallax.
  Orthographic projection never scales by Z automatically. Artistic parallax,
  when used, is tested as an explicit persisted operator.
- Split stage/camera views select the same object; framing, safe area, path handles
  and keyframe editing never write the editor camera into the film camera accidentally.
- Two shots use different cameras in one composition; sequence trim/ripple/cut/
  dissolve leaves source assets/clips unchanged. Report missing transition handles.
- Audio sample ranges/rates, gain/fades and subtitle intervals survive cut/retime;
  preview mute/solo has explicit scope. Scrubbing does not duplicate audio sources.
- Selected/range export preserves start/end, shot order, transitions and sync.
  Save/reopen retains all dependencies, including libraries detached from source projects.

## 6. Commands, MCP and recovery

- Identical UI/MCP payloads produce identical state, diagnostics, revision and undo behavior.
- One committed transaction/batch increments revision once; save/query/preview
  never increase content revision. Strokes/drags commit once; failed batches never partially publish.
- Retrying an ID with the same payload returns the original result; a different
  payload is rejected. Reconnect queries revision/jobs before retry, never duplicating assets/strokes/clips/shots.
- Stale base revision and missing/stale/incompatible targets return structured
  errors with owners/IDs and rebind guidance, never applying to accidental UI selection.
- MCP knows active document/workspace capabilities and requires explicit target IDs
  for writes; contextual selection is advisory. Preview tools return images/resources
  and diagnostics for AI inspection. Do not assume every UI feature has a working tool.
- Job timeout/disconnect/cancel/resume leaks no processes/textures/uploads;
  completed jobs reference real artifacts, not only preview URLs or successful statuses.
- Test canonical paths, symlink/root escapes, MIME/dimensions/quotas, corrupt media,
  import chunk replay and shell-argument injection.
- Crash injection before/after generation publication and during migration retains
  a consistent project without overwritten backups. Concurrent saves preserve dirty revision correctly.

## 7. Visual parity and render output

Use the same snapshot revision, source hashes, quality/profile and timestamp;
compare cel/pose/vertex/camera state exactly or with defined numerical tolerance.
Pixel images use renderer/backend-specific goldens and perceptual/alpha-edge
tolerance; do not require byte identity across different GPUs/drivers.

Test start/mid/end points and all clip/exposure/shot boundaries. Include alpha
silhouette shadows, deformed mesh shadows, transparency sorting, normal color-space
and camera routes; selection/onion-skin/gizmo overlays never enter the film.

Probe real output dimensions, codec, pixel format/color tags, frame count,
timestamps, audio sample count and A/V duration. Specify the exact 2K preset,
2560×1440 or 2048×1080; 4K UHD is 3840×2160. Test 60/120 FPS per preset;
120 FPS output does not promise real-time rendering. Unsupported encoders report
fallback and resulting profile explicitly, never silently lowering FPS/resolution.

## 8. Benchmarks and usability

Baseline workloads: 2048×2048 canvas with 20 layers/100 cels; asset with 20 parts
and 50 bones; composition with 10 rigged instances + 20 props + 3 depth planes +
1 shadow light; 60-second sequence with 3 shots, audio and subtitles. These are
proposed measurement workloads, not product limits or achieved performance.

Record OS, CPU, driver, GPU backend, viewport resolution and quality first.
Measure pointer-to-visible latency p50/p95, frame time p50/p95, dropped preview
frames, mesh/rebind duration, peak RAM/VRAM, export throughput and cancellation
latency. Initial preview target is 60 FPS, equivalent to 16.7 ms/frame; final
latency/memory budgets require a spike. Regression >10% versus same-machine baseline
requires analysis. Measure Windows and Linux separately; one machine cannot certify all environments.

New-user usability tasks: draw 3 cels/holds; assemble 5 parts/rig; save 2 clips;
compose 3 depth planes/camera route; edit 2 shots and export video. Record task
success, time, wrong-context errors and assisted actions. Test keyboard, focus,
disabled/error/empty states, resizing and high DPI. Tablets require real-device testing.

## 9. Gates and command sources

Declared commands must run according to scope and report actual outcomes:

```sh
node scripts/quality/check-source-limits.mjs
node --test scripts/quality/source-limits.test.mjs
node scripts/quality/check-doc-sync.mjs
node --test scripts/quality/doc-sync.test.mjs
npm run check
npm test
npm run test:mcp
```

Do not claim benchmark/UI E2E scripts exist before checking files. Keep unit tests
beside owners as current source does; separate E2E fixtures/recordings from production.
Each test source file stays within 800 lines. Dependency/duplication checks, visual
fixtures, tablet and hardware tests are additional owned work, not enforced merely
by listing them in a Definition of Done. Revision/hash/token gates do not prove semantic translation.

References: [PLAN.md](PLAN.md), [PROJECT_FORMAT.md](PROJECT_FORMAT.md),
[MODULE_MAP.md](MODULE_MAP.md), [UI_SPECIFICATION.md](UI_SPECIFICATION.md),
[COMMAND_BUS.md](COMMAND_BUS.md), [MCP_TOOLS.md](MCP_TOOLS.md),
[AUTO_RIG.md](AUTO_RIG.md), [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md),
[RENDER_PROFILES.md](RENDER_PROFILES.md), [CODING_RULES.md](CODING_RULES.md).
