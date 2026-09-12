# MCP cho studio vẽ, diễn hoạt và dựng phim

Trạng thái: nâng cấp đề xuất ngày 2026-09-12. Source đã có MCP stdio và tool
baseline; catalog mở rộng dưới đây chưa được triển khai. Chỉ capability đã được
kiểm chứng mới xuất hiện như chức năng sẵn sàng trong UI và tool discovery.

## 1. Baseline và vấn đề cần thay

Đọc source tại `mcp/server.ts`, `mcp/director-tools.ts`,
`mcp/character-tools.ts` và `packages/application/src/service/http-server.ts`:

| Hiện trạng trong source | Khoảng cách với studio đích |
| --- | --- |
| Tool kiểu `project_create`, `asset_import_image`, `animation_set_keyframe` | Có catalog nhưng chưa có workspace Draw/Compose và typed context đầy đủ |
| Relay thử cổng 5173/3100, rồi chạy local handler sau remote success | Có thể sinh state/ID khác nhau; phải chỉ ghi vào một authority |
| Khi remote lỗi thì fallback local state | Có nguy cơ AI sửa project khác UI; phải báo disconnected |
| HTTP wildcard CORS, body gom không giới hạn, payload cast | Thiếu biên authentication, origin, quota và schema validation |
| Preview director trả metadata với `framing_verified` | Chưa phải ảnh render kiểm chứng; phải phân biệt metadata và image |
| Export director trả `queued` từ metadata | Chưa enqueue tại tool này; chỉ báo queued sau khi queue nhận job |
| Character tool có UV crop, đường ảnh mẫu và preset mặt | Chưa phải phân tách layer tự động tổng quát; không fallback ảnh mẫu |
| Import tin dimensions/alpha phía caller; hash từ timestamp | Phải decode bytes thật và tính hash nội dung |

Đây là evidence từ đọc code, chưa phải đánh giá chạy đầy đủ. Không xóa API cũ trong
lượt chỉnh plan; adapter tương thích chỉ được giữ sau kiểm tra semantics.

## 2. Nguyên tắc và phiên bản

- MCP là adapter mỏng gọi Application Service; UI và AI dùng cùng nghiệp vụ.
- Tên snake_case là convention dự án, không phải yêu cầu của MCP SDK.
- Tên mới trong tài liệu là đề xuất theo dạng `domain_action`. Giữ mapping API
  cũ bằng bảng migration có version; không đổi tên âm thầm.
- Pin protocol/SDK ở build và negotiate khi initialize. App API version, project
  schema version và MCP protocol version là ba giá trị riêng.
- Sinh input/output schema từ contract chung, trả structured content kèm text
  tóm tắt; validate request thực tế, không chỉ công bố schema trong tools/list.
- Tool annotations mô tả read-only, destructive, idempotent và external I/O;
  annotation không thay thế kiểm tra quyền ở service.
- Tool chỉ đọc có thể là query; tài liệu/template/blob lớn dùng resources có
  pagination và resource link. Không gọi mọi read tool là resource.

## 3. Connection và AI Connection Center

UI có Connection Center dùng chung cho mọi workspace, chứa client/session,
project, trạng thái, capability, recent operations và lỗi có hướng khắc phục.

Trạng thái đề xuất: `disconnected`, `connecting`, `ready`,
`degraded`, `incompatible`, `reconnecting`. Renderer/encoder/image capability
có trạng thái riêng; MCP connected không đồng nghĩa đã có image model hay NVENC.

Handshake của service trả:

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

Đây là response minh họa đích, không phải giá trị runtime hiện tại. Capability
phải được probe, không hardcode true từ cấu hình hoặc spec.

Service tạo discovery record per-user có endpoint, process instance và token
tham chiếu bảo vệ bởi quyền file; bridge xác minh handshake. Không dò cổng rồi
gửi mutation để đoán service. Không gửi token trong URL, docs hoặc stdout.
Stdio chỉ xuất MCP frames trên stdout; diagnostics đi stderr có redaction.
Một MCP bridge có thể reconnect nhưng không tạo writable fallback project.
Project switch tạo context mới; ID hoặc revision trùng ở project khác không hợp lệ.

## 4. Context mà AI thực sự cần

Query context nhận scope rõ ràng và có giới hạn kích thước. Response gồm:

- Project ID, revision, workspace ID và active document/asset/clip/composition/
  shot/sequence IDs; selection là gợi ý đọc, không phải target ngầm của write.
- Entity type, stable ID, tên hiển thị, owner, parent, reference và trạng thái lock.
- Units, coordinate space, pivot, canvas bounds, timebase và khoảng thời gian.
- Layer tree/draw order, source versus instance, missing media và dependency.
- Operation/capability được hỗ trợ, cảnh báo và next actions khả dụng.
- Preview resource kèm evaluated revision, time, dimensions và overlays.
- History origin UI/AI và receipt gần nhất; không gửi toàn bộ texture qua mỗi query.

Model dữ liệu: `DrawingDocument`, `DrawingLayer`, `Cel`, `Exposure`,
`AnimationClip`, `AssetDefinition`, `AssetInstance`, `Composition`,
`Shot`, `Sequence`. Scope và thời gian theo [PROJECT_FORMAT.md](PROJECT_FORMAT.md).
AI không được đoán layer qua tên hoặc sửa một scene mặc định thiếu target ID.

## 5. Catalog đích theo capability

Tên dưới đây chưa phải cam kết đã implement. Discovery chỉ công bố tool đã có
handler, schema, capability và kiểm tra tích hợp. Các tool cùng họ có thể nhận
operation union hữu hạn; không dùng generic execute-code hoặc patch tùy ý.

| Nhóm | Tool đề xuất | Luồng và kết quả |
| --- | --- | --- |
| Kết nối/context | `session_get_info`, `project_get_context` | Query context, version, capability, revision |
| Tìm entity | `project_find_entities` | Query có type/filter/page; trả IDs ổn định |
| Lịch sử | `project_get_receipt`, `project_apply_batch` | Query receipt hoặc durable transaction theo [COMMAND_BUS.md](COMMAND_BUS.md) |
| Lưu | `project_save` | Persistence operation; trả persisted revision thật |
| Brief | `asset_prepare_image_brief` | Query brief, source refs và yêu cầu layer |
| Artifact | `artifact_begin_upload`, `artifact_upload_chunk`, `artifact_finalize` | Staging I/O; chưa sửa project |
| Import | `asset_import_image` | Commit artifact đã validate vào asset/view/layer đích |
| Draw | `drawing_apply_edit` | Durable typed stroke/fill/mask/layer/cel/exposure operations |
| Rig candidate | `mesh_build_candidate`, `rig_build_candidate` | Job tạo candidate và validation report |
| Rig apply | `rig_apply_candidate` | Durable binding/mesh/rest pose sau kiểm tra revision |
| Animate | `animation_edit_clip` | Durable typed keys, curves, exposure và clip publish |
| Compose | `composition_edit` | Durable instance/layer/depth/parent/camera/light/clip placement |
| Edit | `sequence_edit` | Durable shot ordering, trim, transition, audio/subtitle timing |
| Preview | `preview_render` | Query/job; trả image resource thật và evaluated revision |
| Director plan | `director_validate_plan` | Query kiểm tra kế hoạch có cấu trúc, asset thiếu và operation diff |
| Director apply | `director_apply_plan` | Job điều phối các transaction có checkpoint, không all-or-nothing cả phim |
| Export | `export_start_job`, `job_get_status`, `job_cancel` | Snapshot job, progress, cancellation và artifact result |

V1 trước tiên hoàn thiện connection/context, receipt/batch, artifact, preview và
job lifecycle; workspace tools được mở theo milestone đã hoàn tất. Schema Draw
chỉ công bố brush/fill được hỗ trợ; chưa có brush engine thì không trả success
với một layer trống thay cho nét vẽ.

## 6. Mutation envelope và lỗi có cấu trúc

Write nhận `requestId`, `projectId`, `baseRevision`, target IDs và payload có
schema riêng. Gesture UI commit một transaction; AI gửi ý định cấp operation,
không stream hàng nghìn mouse event. Batch/retry/undo theo [COMMAND_BUS.md](COMMAND_BUS.md).

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

Tool failure dùng error indicator MCP phù hợp và structured error; không chỉ
ghi chuỗi error vào JSON success. Success trả receipt, changed IDs, revision,
warnings và resource refs. Không báo thành công toàn batch nếu một bước con lỗi.
Transport timeout có outcome unknown; caller tra receipt thay vì cấp ID mới ngay.

## 7. Artifact handoff thật

1. Agent lấy brief rồi gọi image tool của client nếu capability đó thực sự có.
2. Agent kiểm tra ảnh nguồn; cùng máy dùng file path trong allowlist, khác máy
   upload chunk có số thứ tự, length, total size và content hash.
3. Service decode MIME thực, dimensions, alpha, color metadata và checksum.
   Caller dimensions/alpha chỉ là hint, không phải dữ liệu tin cậy.
4. Finalize trả artifact ID bất biến; import gắn artifact vào entity với revision.
5. Preview sau import cho thấy layer thật. Flat image không tự biến thành nhiều
   bộ phận; crop UV không chứng minh đã hoàn thiện vùng bị che.

Không fallback ảnh mặc định khi path sai. Không xem thumbnail chat là source.
Upload có expiry, quota, cleanup và retry chunk không nhân đôi; staging không
làm project dirty. UI tạo brief và hiển thị waiting-for-agent nếu không có cơ chế
gọi client; MCP server không tự reverse-call image tool.
Chi tiết artwork và decomposition theo [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md).

## 8. AI director từ kịch bản tới Sequence

1. Đọc library/context, timebase và output profile; lập plan có stable plan ID,
   source script hash, base revision, scenes, shots, asset/clip references.
2. Map từng shot tới Composition, camera, thời lượng, staging, action clip,
   dialogue/audio/subtitle cues. Không thay camera chung của mọi shot trong vòng lặp.
3. Validate plan: asset/clip thiếu, unsupported effect, overlap, camera overscan,
   dependency và tổng duration. Trả diff và cost trước apply.
4. Trong scope user đã yêu cầu, apply theo shot hoặc nhóm transaction bounded.
   Lưu checkpoint/receipt; failure chỉ rõ phần đã commit và phần chưa chạy.
5. Render contact sheet và frame đại diện đầu/giữa/cuối shot bằng renderer thật.
   Ghi visual review pending nếu chưa có ảnh; metadata không là framing verified.
6. Sửa plan/shot theo kết quả, enqueue export snapshot; poll hoặc subscribe job,
   trả file video thực đã hoàn tất và thông số đo từ output.

Retry/resume dùng plan ID cùng checkpoint, không nhân đôi shot/asset/clip.
Không yêu cầu xác nhận lặp cho scope đã được giao; các thay đổi phá hủy ngoài scope
phải hiện thành lựa chọn riêng. Plan source và execution report lưu để audit.
Parser rule-based hiện tại chỉ là baseline; không gọi nó là đạo diễn AI hoàn chỉnh.

## 9. Biên an toàn và giới hạn

- HTTP loopback yêu cầu authenticated session, allowlist origin/host và chống DNS
  rebinding; không dùng wildcard CORS cho mutation.
- Validate schema ở MCP lẫn service boundary; finite numbers, enums, length,
  bounds và graph references. Không tin cast TypeScript.
- Resolve canonical paths; chặn traversal/symlink thoát root; read/write roots
  được cho phép tường minh. MCP roots là context, không tự cấp quyền file.
- Cap request/upload bytes, decoded pixels, stroke points, mesh vertices và job
  concurrency. Giới hạn công bố qua capability, test vượt ngưỡng trước allocate.
- SVG/PSD/importer vô hiệu hóa active content/external fetch; artifact URL không
  cho SSRF hoặc truy cập mạng tùy ý.
- Spawn FFmpeg bằng argument array; không nối command shell từ filename.
- Delete/replace báo reference impact, hỗ trợ undo/trash khi có thể; annotation
  destructive vẫn cần kiểm tra quyền và scope.
- Logs và resource URI không lộ token, credential hay path ngoài project.
- Session authority phải xác minh được; port occupied không bị bỏ qua như success.

## 10. Nghiệm thu kết nối và quy trình

1. Hai MCP client và UI cùng project thấy một mutation/revision; reconnect không
   tạo state riêng hay nhân đôi entity.
2. Service restart hoặc đổi project khiến token/context cũ lỗi rõ, không ghi nhầm.
3. Unsupported API/schema/capability hiển thị incompatible/degraded và tool phù hợp.
4. Import path sai, fake alpha, hash sai, oversized chunk bị reject trước commit.
5. Tạo drawing 3 cel với hold exposure, publish clip, đặt 2 instance vào Composition,
   tạo 2 Shot và Sequence; preview/export dùng đúng source và time mapping.
6. Mesh candidate invalid không thay mesh hiện có; AI nhận overlay cùng lỗi cụ thể.
7. Director retry sau mất mạng giữ các shot đã tạo; checkpoint không nhân đôi.
8. Preview trả ảnh giải mã được và revision/time đúng; không trả metadata thay ảnh.
9. Export tool trả job thật, cancel hoạt động, completed có video kiểm tra được.
10. Test JSON-RPC qua stdio và HTTP service thật, không chỉ gọi private SDK handler;
    kiểm tra stdout sạch, timeout, malformed payload, quyền file và đồng bộ UI.

## 11. Liên kết

- [COMMAND_BUS.md](COMMAND_BUS.md) — transaction, gesture và revision.
- [PROJECT_FORMAT.md](PROJECT_FORMAT.md) — entity và thời gian.
- [UI_SPECIFICATION.md](UI_SPECIFICATION.md) — workspace và Connection Center.
- [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) — ảnh và layer thật.
- [AUTO_RIG.md](AUTO_RIG.md) — candidate và kiểm tra rig.
- [RENDER_PROFILES.md](RENDER_PROFILES.md) — snapshot/export capability.
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) — kiểm tra tích hợp.
