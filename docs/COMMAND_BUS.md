# Command bus, transactions and professional editing sessions

Status: proposed upgrade specification dated 2026-09-12. Source already contains
a Command Bus, Application Service, handlers, HTTP/SSE and an export queue; the
contracts below are not fully implemented. Current behavior and targets differ.

## 1. Baseline and gaps

- `packages/application/src/commands/command-bus.ts` provides registry dispatch,
  middleware and listeners; the shared boundary does not enforce revision/idempotency.
- `packages/contracts/src/commands/command-types.ts` has a generic payload with
  optional `expectedRevision` and record-shaped `data`. This is not yet a
  discriminated union validated for every command.
- `packages/application/src/history/transaction.ts` dispatches sequentially;
  on failure it marks rollback without reverting mutations already executed.
- `packages/application/src/commands/handlers/project-handlers.ts` can mark
  saved without a storage adapter. The target confirms only actual persistence.
- These observations come from source inspection, not end-to-end certification.

## 2. One service, three operation lanes

UI and MCP use the same authoritative Application Service for each project.
Renderer, editor and MCP bridge do not maintain independent writable projects.

| Lane | Examples | Revision and undo |
| --- | --- | --- |
| Durable mutation | Stroke, exposure, mesh, keyframe, instance, shot | One transaction, one revision, one history entry |
| Session state | Workspace, selection, tool, onion skin, playhead, editor view | No content revision; outside project undo |
| Query or job | Context read, pose evaluation, preview, export, save | Queries do not write; jobs are separate; save updates persisted revision |

Workspace IDs are stable: `draw`, `rig`, `animate`, `compose`, `edit`.
Switching workspace retains applicable selection and context breadcrumbs without
changing content. Scrubbing is session state; keying at the playhead is a mutation.
Moving a free editor camera does not edit the film camera unless camera editing is enabled.

## 3. Proposed transaction contract

The following names are target contracts, not automatic renames of existing APIs:

```ts
interface ProjectTransaction {
  readonly requestId: string;
  readonly projectId: string;
  readonly baseRevision: number;
  readonly label: string;
  readonly operations: readonly ProjectOperation[];
}

interface CommitReceipt {
  readonly requestId: string;
  readonly projectId: string;
  readonly previousRevision: number;
  readonly revision: number;
  readonly changedEntityIds: readonly string[];
  readonly historyEntryId: string;
  readonly warnings: readonly OperationWarning[];
}
```

- `ProjectOperation` is a union with a schema per operation; arbitrary property
  paths or agent-supplied JavaScript are not accepted.
- Project and target entity scope are required; never guess a write target from
  the first scene, first asset or current selection.
- A single command is a one-operation transaction. Default batches allow at most
  50 operations; the service advertises byte/cost limits checked before execution.
- The adapter maps legacy `expectedRevision` to `baseRevision`; reject
  conflicting values within the same request.
- The registry exposes schemas, permissions, cost and undo support. Contracts
  belong to `packages/contracts/`; logic to `packages/application/` and domain owners.

## 4. Commit, conflicts and idempotency

1. Authenticate the client and validate project, schema, quotas and artifact origin.
2. Check the receipt by client/project/request ID and canonical payload hash.
3. Check base revision; reject stale writes by default without implicit merging.
4. Validate and apply operations to a staged snapshot; stage artifacts outside state.
5. Validate the complete reference graph, rig, timeline and dependencies.
6. Commit atomically, increment content revision once, and store receipt/history.
7. Publish one revision event with changed IDs so UI/MCP update together.

The same request ID and payload return the old receipt. The same ID with another
payload returns `idempotency_conflict`. After disconnect at commit, query the receipt
before retry. Receipts persist with transactions for at least the advertised
recovery horizon; expiry returns `receipt_expired` instead of silently executing again.

Conflicts return current revision and affected entities so callers reread and
revise intent. Automatic merging requires a later ADR and command-specific tests.
Writers serialize per project; receipt lookup and commit share one critical section.

## 5. Gestures for drawing, mesh, rig and timeline

| Gesture | Temporary preview | Commit |
| --- | --- | --- |
| Brush/eraser | Stroke using pressure and canvas coordinates | One stroke with tile/content delta |
| Fill/selection transform | Candidate bitmap/mask on snapshot | One edit with before/after content refs |
| Vertex drag or weight brush | Candidate mesh/weights | Validate topology/influences then commit |
| Bone/IK posing | Temporary pose in Animate | Keyframe when keying is enabled; never alter bind pose |
| Instance/camera drag | Transform in Composition | One transform or explicitly scoped keyframe group |
| Exposure/shot/clip drag | Timeline draft and snapping | One timing edit with affected range |

Every gesture retains `gestureId`, snapshot revision, target IDs and starting state.
Pointer-up/Enter finishes; Escape/pointer cancel reverts preview. Focus loss must
finish or cancel according to the tool, never store a partial stroke.
Preview updates do not dispatch every point through HTTP/MCP or increment revision.
If AI edits the target during a gesture, retain the candidate for comparison but
reject the stale commit; never silently overwrite. Preview overlays cannot enter export snapshots.

## 6. Data ownership and workspace operations

| Workspace | Owning entity | Proposed operation groups |
| --- | --- | --- |
| Draw | `DrawingDocument`, `DrawingLayer`, `Cel`, `Exposure` | Create layer/cel, stroke, fill, mask, reorder, exposure hold/blank/duplicate |
| Rig | `AssetDefinition` and layer binding | Pivot, contour, mesh candidate, bind/rest pose, weights, constraints |
| Animate | `AnimationClip` | Typed tracks, keyframe, curves, drawing exposure, clip publish |
| Compose | `Composition`, `AssetInstance` | Layer/instance placement, parent, depth, camera/light, clip assignment |
| Edit & Export | `Shot`, `Sequence` | Trim/split/reorder shot, camera binding, audio/subtitle timing, export range |

`AssetDefinition` is reusable source; `AssetInstance` holds local overrides.
Instance edits do not edit the source asset. Edit source and make unique are separate intents.
`Cel` stores content; `Exposure` references a cel over a time range. Holds reuse
content; duplicate-and-edit creates independent content or copy-on-write rather
than unintentionally changing other holds. Paint layers differ from composition
layers; APIs must not use ambiguous layer IDs.
Tracks require clip/composition identity, target and a typed property.
Time follows the timebase and half-open ranges in [PROJECT_FORMAT.md](PROJECT_FORMAT.md);
never implicitly assume 24 FPS or floating-point seconds.

## 7. Undo/redo and persistence

- Undo/redo run as new validated transactions with new content revisions.
- One gesture or batch is one entry. Undoing a stroke restores tile/content refs,
  rather than rerunning a brush of another version.
- History stores UI/AI origin, label, changed IDs and artifact dependencies; default
  100 entries plus a raster byte budget to avoid unlimited VRAM/RAM retention.
- New mutations clear redo. Redo must not reuse the original request ID.
- Default undo follows shared project history with user/agent attribution; do not
  promise per-client selective undo without a dependency-aware design.
- Initial session history need not persist; journal/receipt recovery is not the
  undo stack. Artifact refs needed by undo must not be garbage-collected early.
- Save writes a real snapshot revision through the storage adapter; update
  `persistedRevision` only after success, without incrementing content revision.
- Edits during save keep the project dirty when revision exceeds the saved one.
  Multi-file persistence uses generation/manifest commit; separate file renames
  are not an atomic project transaction.

## 8. Queries, jobs and side effects

Preview/evaluation take explicit revision, scope and time, and return the evaluated
revision. Mesh generation, image decode and export jobs have IDs, status, progress,
cancellation, failures and result artifacts. Jobs do not hold long write transactions.
Mesh/AI output is a candidate with source hash and base revision; a separate apply
step revalidates before commit. Cancelled/failed jobs leave no partial entities.

Export pins an immutable snapshot revision and dependency graph without changing
content revision. Its queue persists separately; report queued only after real enqueue.
Import stages bytes, decodes and checks hash/dimensions/alpha, then commits references.
Do not mix rendering, unfinished uploads or image-model calls into batches.
HTTP/MCP adapters only parse, authorize, dispatch and map results; they contain no
separate drawing, decomposition, rigging, directing or geometry algorithms.

## 9. Events, recovery and errors

Events include session identity, project identity, event sequence and revision.
A client detecting a gap or restart fetches a fresh snapshot instead of blindly
replaying deltas. Receipt and job queries support reconnect; never silently open
an empty project in place of an inaccessible one.

| Proposed code | Repair information |
| --- | --- |
| `validation_failed` | Field path, constraint, entity ID |
| `revision_conflict` | Expected/current revision, changed IDs |
| `idempotency_conflict` | Request ID without leaking private payloads |
| `receipt_expired` | Horizon and required state reconciliation before new intent |
| `asset_dependency_changed` | Source/candidate hash and rebuild scope |
| `capability_unavailable` | Missing capability and supported fallback |
| `artifact_invalid` | MIME/dimensions/hash/alpha report |
| `service_unavailable` | Retry policy; no independent-state fallback |
| `internal_error` | Correlation ID with tokens/sensitive paths redacted in logs |

Errors preserve old state. Failed batches discard candidates and staged refs
instead of executing inverses for already published mutations to simulate atomicity.
Do not convert errors to success using fallback quads, sample images or export metadata.

## 10. Acceptance criteria

1. UI and MCP read the same project/revision; an AI edit appears exactly once in UI.
2. A layer + cel + exposure batch failing at its last step changes no entity,
   revision or history.
3. Timeout after commit followed by the same request returns the original receipt
   without duplication.
4. A 500-point stroke creates one history entry; cancel restores exactly; undo/redo
   preserve identical pixel content.
5. AI editing an instance during a user drag produces a clear conflict, retains
   the candidate and does not overwrite the newer transform.
6. Pose preview, workspace switch, scrub and onion-skin toggle do not dirty the project.
7. Editing one instance leaves others unchanged; source edits update dependencies
   by explicit policy and do not silently invalidate animation clips.
8. Saving without storage fails; saving an older snapshot does not clear newer dirty state.
9. Cancelled export never reports completed; results exist only for actual artifacts.
10. UI and MCP validation return identical error codes for identical invalid topology/references.

## 11. References

- [UI_SPECIFICATION.md](UI_SPECIFICATION.md) — workspaces and gestures.
- [PROJECT_FORMAT.md](PROJECT_FORMAT.md) — identity, references, timebase and storage.
- [MCP_TOOLS.md](MCP_TOOLS.md) — connections, context and tool mapping.
- [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) — artifacts and layers.
- [MODULE_MAP.md](MODULE_MAP.md) — logic and adapter ownership.
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) — integration and recovery checks.
