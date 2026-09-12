# Command bus, transaction và phiên làm việc chuyên nghiệp

Trạng thái: đặc tả nâng cấp đề xuất ngày 2026-09-12. Source đã có Command Bus,
Application Service, handler, HTTP/SSE và export queue; các contract dưới đây
chưa được triển khai đầy đủ. Tài liệu phân biệt hiện trạng với đích nâng cấp.

## 1. Hiện trạng và khoảng cách

- `packages/application/src/commands/command-bus.ts` có registry dispatch,
  middleware và listener; chưa cưỡng chế revision/idempotency ở biên chung.
- `packages/contracts/src/commands/command-types.ts` có payload chung với
  `expectedRevision` tùy chọn và `data` dạng record. Đây chưa phải discriminated
  union được validate theo từng command.
- `packages/application/src/history/transaction.ts` dispatch lần lượt; khi lỗi
  chỉ đánh dấu rollback, chưa hoàn tác các mutation đã chạy.
- `packages/application/src/commands/handlers/project-handlers.ts` có thể đánh
  dấu saved khi không có storage adapter. Đích mới chỉ xác nhận sau khi lưu thật.
- Các nhận xét này dựa trên đọc source, không phải chứng nhận end-to-end.

## 2. Một service, ba luồng thao tác

UI và MCP dùng cùng một Application Service có thẩm quyền với mỗi project.
Renderer, editor và MCP bridge không giữ bản project riêng có quyền ghi.

| Luồng | Ví dụ | Revision và undo |
| --- | --- | --- |
| Durable mutation | Nét vẽ, exposure, mesh, keyframe, instance, shot | Một transaction, một revision, một history entry |
| Session state | Workspace, selection, tool, onion skin, playhead, góc nhìn editor | Không đổi content revision; không vào project undo |
| Query hoặc job | Đọc context, evaluate pose, preview, export, save | Query không ghi; job quản lý riêng; save cập nhật revision đã lưu |

Các workspace có ID ổn định `draw`, `rig`, `animate`, `compose`, `edit`.
Đổi workspace giữ selection phù hợp và context breadcrumb, không đổi nội dung.
Scrub chỉ là session state; tạo keyframe tại playhead mới là mutation.
Di chuyển camera biên tập tự do không sửa camera quay phim khi chưa bật chỉnh camera.

## 3. Contract transaction đề xuất

Tên dưới đây là contract đích, không tự đổi tên API hiện có:

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

- `ProjectOperation` là union có schema riêng cho từng loại; không nhận đường
  property tùy ý hoặc JavaScript do agent gửi.
- Scope bắt buộc có project và entity đích; không dùng scene đầu tiên, asset đầu
  tiên hoặc selection hiện tại để đoán mục tiêu ghi.
- Command đơn là transaction một operation. Batch tối đa 50 operation mặc định;
  giới hạn byte và chi phí do capability service công bố, kiểm tra trước chạy.
- `expectedRevision` cũ được adapter ánh xạ sang `baseRevision`; không chấp nhận
  hai giá trị mâu thuẫn trong cùng request.
- Registry công bố schema, permission, cost và hỗ trợ undo. Contract owner là
  `packages/contracts/`; logic ở `packages/application/` và domain owner.

## 4. Commit, conflict và idempotency

1. Xác thực client, project, schema, hạn mức và nguồn artifact.
2. Kiểm tra receipt theo client/project/request ID cùng hash payload chuẩn hóa.
3. Kiểm tra base revision; mặc định reject stale write, không tự merge.
4. Validate và áp operations lên snapshot tạm; stage artifact ngoài state.
5. Validate toàn bộ graph tham chiếu, rig, timeline và dependency.
6. Commit atomically, tăng content revision một lần, lưu receipt và history.
7. Publish một event có revision và changed IDs để UI/MCP cùng cập nhật.

Cùng request ID và cùng payload trả receipt cũ. Cùng ID khác payload trả
`idempotency_conflict`. Mất kết nối sau commit thì tra receipt trước retry.
Receipt ghi bền cùng transaction và sống tối thiểu trong recovery horizon được
service công bố; hết hạn trả `receipt_expired`, không âm thầm thực thi lại.

Conflict trả current revision và entity bị ảnh hưởng để caller đọc lại rồi sửa
ý định. Merge tự động chỉ bổ sung sau ADR có test cho từng command.
Các writer được serialize theo project; receipt check và commit cùng critical section.

## 5. Gesture cho vẽ, mesh, rig và timeline

| Gesture | Preview tạm | Commit |
| --- | --- | --- |
| Brush/eraser | Stroke theo pressure và canvas coordinates | Một stroke cùng tile/content delta |
| Fill/selection transform | Candidate bitmap/mask trên snapshot | Một edit với before/after content refs |
| Kéo vertex hoặc weight brush | Mesh/weights candidate | Validate topology/influences rồi commit |
| Pose bone/IK | Pose tạm trong Animate | Keyframe nếu keying bật; không đổi bind pose |
| Kéo instance/camera | Transform trong Composition | Một transform hoặc bộ keyframe rõ scope |
| Kéo exposure/shot/clip | Timeline draft và snapping | Một timing edit, hiển thị affected range |

Mỗi gesture giữ `gestureId`, snapshot revision, target IDs và trạng thái bắt đầu.
Pointer-up/Enter kết thúc; Escape/pointer cancel hoàn tác preview. Mất focus phải
kết thúc hoặc hủy theo tool, không lưu một nửa nét vẽ.
Update preview không dispatch từng điểm qua HTTP/MCP và không tăng revision.
Nếu target bị AI sửa trong lúc gesture mở, giữ candidate để so sánh nhưng reject
commit cũ; không ghi đè im lặng. Preview overlay không được lọt vào export snapshot.

## 6. Ownership dữ liệu và operation theo workspace

| Workspace | Entity sở hữu | Nhóm operation đề xuất |
| --- | --- | --- |
| Draw | `DrawingDocument`, `DrawingLayer`, `Cel`, `Exposure` | Tạo layer/cel, stroke, fill, mask, reorder, exposure hold/blank/duplicate |
| Rig | `AssetDefinition` và binding của layer | Pivot, contour, mesh candidate, bind/rest pose, weights, constraints |
| Animate | `AnimationClip` | Typed tracks, keyframe, curves, drawing exposure, clip publish |
| Compose | `Composition`, `AssetInstance` | Layer/instance placement, parent, depth, camera/light, clip assignment |
| Edit & Export | `Shot`, `Sequence` | Trim/split/reorder shot, camera binding, audio/subtitle timing, export range |

`AssetDefinition` là nguồn tái sử dụng; `AssetInstance` chứa override cục bộ.
Sửa instance không sửa asset nguồn. Edit source và make unique phải là ý định riêng.
`Cel` lưu nội dung; `Exposure` tham chiếu cel theo khoảng thời gian. Hold dùng lại
nội dung; duplicate-and-edit tạo bản riêng hoặc copy-on-write, không sửa các hold khác
ngoài ý định. Paint layer khác composition layer; API không dùng một layer ID mơ hồ.
Track bắt buộc định danh clip/composition, target và property có kiểu.
Thời gian theo timebase và khoảng nửa mở trong [PROJECT_FORMAT.md](PROJECT_FORMAT.md);
không ngầm giả định 24 FPS hay số giây dạng float.

## 7. Undo/redo và persistence

- Undo/redo chạy như transaction mới với validation và content revision mới.
- Một gesture hoặc batch là một entry. Undo nét vẽ phục hồi tile/content refs,
  không chạy lại brush khác phiên bản.
- History lưu origin UI/AI, label, changed IDs và artifact dependencies; mặc định
  100 entry, thêm ngân sách byte cho raster để tránh giữ vô hạn VRAM/RAM.
- Redo bị xóa khi có mutation mới. Không dùng request ID cũ cho redo.
- Undo mặc định theo lịch sử project chung có tên người/agent thực hiện; không
  hứa selective undo riêng từng client khi chưa có dependency-aware design.
- History phiên đầu không bắt buộc persist; journal/receipt recovery không phải
  undo stack. Asset refs còn phục vụ undo không bị garbage collection sớm.
- Save ghi snapshot revision thật qua storage adapter; chỉ cập nhật
  `persistedRevision` sau thành công, không tăng content revision.
- Nếu edit xảy ra trong lúc save, project vẫn dirty khi revision mới hơn revision
  vừa lưu. Lưu nhiều file theo generation/manifest commit; không coi từng rename
  riêng lẻ là một transaction toàn project.

## 8. Query, job và side effect

Preview/evaluate nhận revision, scope và time rõ ràng; trả revision đã evaluate.
Job mesh generation, image decode hoặc export có job ID, trạng thái, progress,
cancel, failure và result artifact. Job không giữ transaction ghi mở lâu.
Kết quả mesh/AI là candidate có source hash và base revision; bước apply riêng
revalidate rồi commit. Cancel hoặc failed job không để lại entity một nửa.

Export chốt snapshot revision và dependency graph bất biến, không đổi content
revision. Job queue được lưu riêng; báo queued chỉ khi enqueue thật thành công.
Import stage bytes trước, decode và kiểm tra hash/dimensions/alpha, rồi commit
references. Không trộn render, upload chưa xong hoặc gọi image model vào batch.
Adapter HTTP/MCP chỉ parse, authorize, dispatch và map result; không có thuật toán
vẽ, tách layer, rig, đạo diễn hay geometry riêng.

## 9. Event, recovery và lỗi

Event có session identity, project identity, event sequence và revision.
Client phát hiện gap hoặc restart phải lấy snapshot mới; không phát lại delta mù.
Receipt query và job query hỗ trợ reconnect; không tự mở project rỗng để thay thế
project không truy cập được.

| Mã lỗi đề xuất | Dữ liệu để sửa |
| --- | --- |
| `validation_failed` | Field path, constraint, entity ID |
| `revision_conflict` | Expected/current revision, changed IDs |
| `idempotency_conflict` | Request ID; không lộ payload riêng tư |
| `receipt_expired` | Horizon và yêu cầu đối chiếu state trước ý định mới |
| `asset_dependency_changed` | Source/candidate hash và phạm vi cần rebuild |
| `capability_unavailable` | Capability thiếu và fallback được hỗ trợ |
| `artifact_invalid` | MIME/dimensions/hash/alpha report |
| `service_unavailable` | Retry policy; không chuyển sang state riêng |
| `internal_error` | Correlation ID, log đã che token/path nhạy cảm |

Error giữ state cũ nguyên vẹn. Failed batch loại candidate và staged refs; không
gọi inverse của từng mutation đã publish để giả lập atomicity.
Không đổi lỗi thành success bằng fallback quad, ảnh mẫu hay export metadata.

## 10. Tiêu chí nghiệm thu

1. UI và MCP đọc cùng project/revision; một AI edit xuất hiện đúng một lần ở UI.
2. Batch tạo layer + cel + exposure lỗi bước cuối: không entity, revision hay
   history nào thay đổi.
3. Timeout sau commit rồi retry cùng request: nhận đúng receipt, không nhân đôi.
4. 500 điểm brush tạo một history entry; cancel phục hồi chính xác; undo/redo
   giữ cùng pixel content.
5. AI đổi cùng instance khi user đang kéo: conflict rõ, candidate không mất và
   không ghi đè transform mới.
6. Preview pose, đổi workspace, scrub và bật onion skin không làm project dirty.
7. Edit một instance không sửa instance khác; edit source cập nhật dependency
   theo policy rõ, không tự hủy animation clip.
8. Save không có storage phải lỗi; save snapshot cũ không làm mất dirty mới.
9. Export cancel không báo completed; result chỉ tồn tại khi có artifact thật.
10. Validation từ UI và MCP trả cùng mã lỗi cho cùng topology hoặc reference sai.

## 11. Liên kết

- [UI_SPECIFICATION.md](UI_SPECIFICATION.md) — workspace và gesture.
- [PROJECT_FORMAT.md](PROJECT_FORMAT.md) — identity, reference, timebase và lưu.
- [MCP_TOOLS.md](MCP_TOOLS.md) — connection, context và tool mapping.
- [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) — artifact và layer.
- [MODULE_MAP.md](MODULE_MAP.md) — owner của logic và adapter.
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) — kiểm tra tích hợp và recovery.
