# MCP for drawing, animation and filmmaking

Status: proposed upgrade dated 2026-09-12. Source already contains stdio MCP and
baseline tools; the expanded catalog below is not implemented. Only verified
capabilities appear as ready functions in UI and tool discovery.

## 1. Baseline and required changes

Source inspected: `mcp/server.ts`, `mcp/director-tools.ts`,
`mcp/character-tools.ts` and `packages/application/src/service/http-server.ts`:

| Current source behavior | Gap to target studio |
| --- | --- |
| Tools such as `project_create`, `asset_import_image`, `animation_set_keyframe` | Catalog exists, but lacks complete Draw/Compose workspaces and typed context |
| Relay tries ports 5173/3100, then runs local handler after remote success | Can create divergent state/IDs; writes must reach only one authority |
| Remote failure falls back to local state | AI may edit a different project than UI; report disconnected |
| HTTP wildcard CORS, unbounded body collection, payload casts | Missing authentication, origin, quota and schema-validation boundaries |
| Director preview returns metadata with `framing_verified` | Not a verified rendered image; distinguish metadata from images |
| Director export returns `queued` from metadata | This tool does not enqueue; report queued only after queue acceptance |
| Character tools use UV crops, sample image paths and face presets | Not general automatic decomposition; never fall back to sample images |
| Import trusts caller dimensions/alpha; timestamp-based hash | Decode actual bytes and compute a content hash |

These are source observations, not full runtime validation. Do not remove old APIs
during planning; compatibility adapters require semantic verification first.

## 2. Principles and versions

- MCP is a thin adapter to Application Service; UI and AI share business rules.
- Snake_case names are a project convention, not an MCP SDK requirement.
- New names here use proposed `domain_action` form. Keep versioned migration
  mappings for older APIs rather than silently renaming them.
- Pin protocol/SDK at build and negotiate during initialization. App API version,
  project schema version and MCP protocol version are separate values.
- Generate input/output schemas from shared contracts; return structured content
  with a text summary. Validate actual requests, not merely tools/list schemas.
- Tool annotations describe read-only, destructive, idempotent and external I/O
  behavior; annotations do not replace service authorization.
- Read-only tools may be queries; large documents/templates/blobs use paginated
  resources and resource links. Not every read tool is a resource.

## 3. Connection and AI Connection Center

UI provides a Connection Center shared across workspaces showing client/session,
project, status, capabilities, recent operations and actionable errors.

Proposed states: `disconnected`, `connecting`, `ready`,
`degraded`, `incompatible`, `reconnecting`. Renderer/encoder/image capabilities
have separate status; connected MCP does not imply an image model or NVENC.

The service handshake returns:

```json
{
  "serviceInstanceId": "service-uuid",
  "sessionId": "session-uuid",
  "projectId": "project-uuid",
  "revision": 42,
  "apiVersion": "proposed-v2",
  "schemaVersion": 2,
  "capabilities": {
    "workspaces": ["draw", "rig", "animate", "compose", "edit"],
    "artifactUpload": true,
    "previewImage": true,
    "exportProfiles": ["4k-uhd-60"]
  },
  "limits": {
    "batchOperations": 50,
    "metadataBytes": 1048576
  }
}
```

This illustrates a target response, not current runtime values. Capabilities must
be probed rather than hardcoded true from configuration or specifications.

The service creates a per-user discovery record with endpoint, process instance
and a token reference protected by file permissions; the bridge verifies the handshake.
Do not probe ports by sending mutations. Never put tokens in URLs, docs or stdout.
Stdio emits only MCP frames on stdout; redacted diagnostics go to stderr.
A bridge may reconnect but must not create a writable fallback project.
Project switches establish new context; matching IDs/revisions in another project are invalid.

## 4. Context the AI actually needs

Context queries take explicit scopes and size limits. Responses include:

- Project ID, revision, workspace ID and active document/asset/clip/composition/
  shot/sequence IDs; selection is a read hint, not an implicit write target.
- Entity type, stable ID, display name, owner, parent, references and lock state.
- Units, coordinate space, pivot, canvas bounds, timebase and time range.
- Layer tree/draw order, source versus instance, missing media and dependencies.
- Supported operations/capabilities, warnings and available next actions.
- Preview resources with evaluated revision, time, dimensions and overlays.
- UI/AI history origin and recent receipts; no complete textures on every query.

Data model: `DrawingDocument`, `DrawingLayer`, `Cel`, `Exposure`,
`AnimationClip`, `AssetDefinition`, `AssetInstance`, `Composition`,
`Shot`, `Sequence`. Scope/time follow [PROJECT_FORMAT.md](PROJECT_FORMAT.md).
AI must not guess layers by name or edit a default scene without a target ID.

## 5. Target capability catalog

These names do not claim implementation. Discovery exposes only tools with
handlers, schemas, capabilities and integration checks. Tool families may accept
finite operation unions, never generic execute-code or arbitrary patches.

| Group | Proposed tools | Lane and result |
| --- | --- | --- |
| Connection/context | `session_get_info`, `project_get_context` | Context, version, capability and revision queries |
| Entity lookup | `project_find_entities` | Typed/filterable/paginated query with stable IDs |
| History | `project_get_receipt`, `project_apply_batch` | Receipt query or durable transaction per [COMMAND_BUS.md](COMMAND_BUS.md) |
| Save | `project_save` | Persistence operation returning an actual persisted revision |
| Brief | `asset_prepare_image_brief` | Brief, source references and layer requirements query |
| Artifact | `artifact_begin_upload`, `artifact_upload_chunk`, `artifact_finalize` | Staging I/O; no project mutation yet |
| Import | `asset_import_image` | Commit a validated artifact into the target asset/view/layer |
| Draw | `drawing_apply_edit` | Durable typed stroke/fill/mask/layer/cel/exposure operations |
| Rig candidate | `mesh_build_candidate`, `rig_build_candidate` | Candidate-generation job and validation report |
| Rig apply | `rig_apply_candidate` | Durable binding/mesh/rest pose after revision checks |
| Animate | `animation_edit_clip` | Durable typed keys, curves, exposure and clip publishing |
| Compose | `composition_edit` | Durable instance/layer/depth/parent/camera/light/clip placement |
| Edit | `sequence_edit` | Durable shot ordering, trim, transition, audio/subtitle timing |
| Preview | `preview_render` | Query/job returning an actual image resource and evaluated revision |
| Director plan | `director_validate_plan` | Structured-plan validation query, missing assets and operation diff |
| Director apply | `director_apply_plan` | Checkpointed transaction-orchestration job, not film-wide all-or-nothing |
| Export | `export_start_job`, `job_get_status`, `job_cancel` | Snapshot job, progress, cancellation and result artifact |

V1 first completes connection/context, receipts/batches, artifacts, previews and
job lifecycle; workspace tools unlock with completed milestones. Draw schemas
advertise only supported brushes/fills; without a brush engine, never return
success with an empty layer instead of a stroke.

## 6. Mutation envelopes and structured errors

Writes take `requestId`, `projectId`, `baseRevision`, target IDs and typed payloads.
UI gestures commit one transaction; AI sends operation-level intent rather than
streaming thousands of mouse events. Batch/retry/undo follow [COMMAND_BUS.md](COMMAND_BUS.md).

```json
{
  "ok": false,
  "requestId": "req-uuid",
  "projectId": "project-uuid",
  "error": {
    "code": "revision_conflict",
    "message": "The composition changed after the snapshot.",
    "retryable": false,
    "currentRevision": 43,
    "fieldPath": "baseRevision",
    "entityIds": ["composition-uuid"],
    "recoveryAction": "reload_context"
  }
}
```

Tool failures use the appropriate MCP error indicator and structured errors,
rather than embedding an error string inside success JSON. Success returns
receipt, changed IDs, revision, warnings and resource refs. Never report whole-batch
success after a child operation fails. Transport timeouts have unknown outcome;
callers query receipts before immediately generating new request IDs.

## 7. Real artifact handoff

1. The agent obtains a brief, then calls the client's image tool if available.
2. The agent inspects the source; on the same machine use an allowlisted path,
   otherwise upload chunks with sequence, length, total size and content hash.
3. The service decodes actual MIME, dimensions, alpha, color metadata and checksum.
   Caller dimensions/alpha are hints rather than trusted data.
4. Finalize returns an immutable artifact ID; import attaches it with revision checks.
5. Post-import preview shows actual layers. Flat images do not automatically become
   parts; UV crops do not establish that occluded regions were reconstructed.

Never fall back to a default image on path errors. Chat thumbnails are not sources.
Uploads have expiry, quota, cleanup and duplicate-safe chunk retries; staging does
not dirty projects. UI prepares briefs and shows waiting-for-agent without client
launch support; the MCP server does not reverse-call image tools.
Artwork and decomposition details follow [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md).

## 8. AI director from script to Sequence

1. Read library/context, timebase and output profile; prepare a plan with stable
   plan ID, source script hash, base revision, scenes, shots and asset/clip references.
2. Map every shot to Composition, camera, duration, staging, action clips and
   dialogue/audio/subtitle cues. Never overwrite one shared shot camera in a loop.
3. Validate missing assets/clips, unsupported effects, overlaps, camera overscan,
   dependencies and total duration. Return diff and cost before applying.
4. Within user-authorized scope, apply per shot or bounded transaction group.
   Store checkpoints/receipts; failures identify committed and unexecuted work.
5. Render contact sheets and representative start/middle/end frames with the real
   renderer. Mark visual review pending without images; metadata does not verify framing.
6. Revise plans/shots from results, enqueue snapshot export, poll or subscribe to
   jobs, then return an actual completed video and measured output properties.

Retry/resume use plan ID and checkpoints without duplicating shots/assets/clips.
Do not repeatedly request confirmation within assigned scope; destructive changes
outside scope require a separate explicit choice. Preserve plan source and execution
reports for audit. The current rule-based parser is only a baseline, not a complete AI director.

## 9. Security boundaries and limits

- Loopback HTTP requires authenticated sessions, origin/host allowlists and DNS
  rebinding protection; no wildcard CORS for mutations.
- Validate schemas at MCP and service boundaries: finite numbers, enums, lengths,
  bounds and graph references. TypeScript casts are not validation.
- Resolve canonical paths and block traversal/symlink escape; allow read/write
  roots explicitly. MCP roots provide context, not automatic filesystem permission.
- Cap request/upload bytes, decoded pixels, stroke points, mesh vertices and job
  concurrency. Advertise limits through capabilities and test before allocation.
- Disable active content/external fetch in SVG/PSD/importers; artifact URLs cannot
  enable SSRF or arbitrary network access.
- Spawn FFmpeg with argument arrays rather than filename-derived shell strings.
- Delete/replace reports reference impact and supports undo/trash where possible;
  destructive annotations still require permission and scope checks.
- Logs/resource URIs must not expose tokens, credentials or out-of-project paths.
- Verify session authority; occupied ports must not be ignored as success.

## 10. Connection and workflow acceptance

1. Two MCP clients and UI on one project see one mutation/revision; reconnect
   creates no separate state or duplicate entity.
2. Service restart or project switch rejects stale tokens/context without wrong-target writes.
3. Unsupported API/schema/capability shows incompatible/degraded with appropriate tools.
4. Invalid import paths, fake alpha, bad hashes and oversized chunks fail before commit.
5. Create a 3-cel drawing with hold exposures, publish a clip, place 2 instances in
   a Composition, and create 2 Shots and a Sequence; preview/export use correct source/time mapping.
6. Invalid mesh candidates preserve existing meshes; AI gets overlays and specific errors.
7. Director retry after network loss retains created shots without checkpoint duplication.
8. Preview returns a decodable image at the correct revision/time, not metadata in its place.
9. Export tools return real jobs; cancellation works; completed results contain verifiable videos.
10. Test JSON-RPC over stdio and a real HTTP service, not only private SDK handlers;
    verify clean stdout, timeouts, malformed payloads, file permissions and UI synchronization.

## 11. References

- [COMMAND_BUS.md](COMMAND_BUS.md) — transactions, gestures and revisions.
- [PROJECT_FORMAT.md](PROJECT_FORMAT.md) — entities and time.
- [UI_SPECIFICATION.md](UI_SPECIFICATION.md) — workspaces and Connection Center.
- [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) — actual images and layers.
- [AUTO_RIG.md](AUTO_RIG.md) — rig candidates and validation.
- [RENDER_PROFILES.md](RENDER_PROFILES.md) — snapshot/export capabilities.
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) — integration checks.
