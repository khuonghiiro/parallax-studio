# Catalog MCP tool và giao thức

Trạng thái: đề xuất thiết kế. Tên và schema tool dưới đây là API đề xuất, chưa phải
catalog đã hoạt động trong source.

## 1. Nguyên tắc chung

- MCP tool là adapter mỏng: nhận request từ AI agent, chuyển thành application
  command, trả kết quả. Không chứa nghiệp vụ riêng.
- Schema input/output dùng Zod, sinh JSON Schema cho MCP SDK.
- Tool ghi (command) đi qua command bus — cùng đường với UI.
- Tool đọc (resource) truy vấn project state — không tạo side effect.
- Idempotent: cùng `requestId` không tạo entity trùng khi retry.
- Error: trả message đọc được, không throw ngoại lệ không kiểm soát.

## 2. Quy ước đặt tên

```text
<domain>.<action>

Ví dụ: asset.create, rig.add_bone, animation.set_keyframe
```

Tên tool dùng snake_case cho phần action (theo MCP SDK convention).
Domain tương ứng với thư mục trong `apps/mcp/src/tools/`.

## 3. Catalog theo miền

### 3.1 Project

| Tool | Loại | Mô tả |
| --- | --- | --- |
| `project.get_info` | read | Metadata, revision, danh sách asset/scene |
| `project.save` | write | Lưu project, trả revision mới |
| `project.get_style_guide` | read | Style, palette, reference đã đặt |

### 3.2 Asset

| Tool | Loại | Mô tả |
| --- | --- | --- |
| `asset.create` | write | Tạo asset mới (character/prop/background) |
| `asset.list` | read | Danh sách asset với metadata |
| `asset.get_info` | read | Chi tiết một asset: views, layers, rig status |
| `asset.prepare_image_brief` | read | Brief và reference để agent sinh/sửa ảnh |
| `asset.import_image` | write | Nhập ảnh thật vào asset, trả asset ID và kiểm tra |
| `asset.attach_view` | write | Gắn ảnh vào góc nhìn của asset |
| `asset.attach_layer` | write | Gắn ảnh/mask vào layer bộ phận |
| `asset.validate_artwork` | read | Kiểm tra layer/view thiếu, vấn đề ảnh |
| `asset.get_preview` | read | Preview thumbnail hoặc render nhỏ |
| `asset.delete` | write | Xóa asset và dữ liệu liên quan |

### 3.3 Rig

| Tool | Loại | Mô tả |
| --- | --- | --- |
| `rig.create_skeleton` | write | Tạo bone hierarchy từ template hoặc tùy chỉnh |
| `rig.add_bone` | write | Thêm bone vào hierarchy |
| `rig.remove_bone` | write | Xóa bone và cập nhật bindings |
| `rig.set_weights` | write | Đặt weights cho binding bone-layer |
| `rig.get_hierarchy` | read | Bone tree, pivots, weights hiện tại |
| `rig.test_pose` | write | Áp pose tạm và trả preview (không lưu) |
| `rig.set_rest_pose` | write | Đặt rest pose cho view hiện tại |

### 3.4 Animation

| Tool | Loại | Mô tả |
| --- | --- | --- |
| `animation.create_clip` | write | Tạo clip mới trên track |
| `animation.set_keyframe` | write | Thêm/sửa keyframe tại thời điểm |
| `animation.delete_keyframe` | write | Xóa keyframe |
| `animation.list_clips` | read | Danh sách clip trên timeline |
| `animation.get_clip_info` | read | Keyframes, duration, easing của clip |
| `animation.preview_frame` | read | Render một frame tại thời điểm chỉ định |

### 3.5 Scene

| Tool | Loại | Mô tả |
| --- | --- | --- |
| `scene.create` | write | Tạo scene mới |
| `scene.add_instance` | write | Đặt asset instance vào scene |
| `scene.remove_instance` | write | Xóa instance |
| `scene.set_transform` | write | Đặt position/rotation/scale/depth |
| `scene.set_camera` | write | Cấu hình camera (type, position, zoom) |
| `scene.add_light` | write | Thêm đèn |
| `scene.set_light` | write | Sửa đèn (hướng, màu, cường độ, bóng) |
| `scene.get_info` | read | Instances, camera, lights hiện tại |
| `scene.create_shot` | write | Tạo shot trong timeline |
| `scene.list_shots` | read | Danh sách shot |

### 3.6 Export

| Tool | Loại | Mô tả |
| --- | --- | --- |
| `export.start_job` | write | Bắt đầu render với profile chỉ định |
| `export.get_job_status` | read | Progress, frame count, lỗi, thời gian còn lại |
| `export.cancel_job` | write | Hủy job đang chạy |
| `export.list_profiles` | read | Preset có sẵn (2K/4K, 60/120 FPS, codec) |
| `export.get_result` | read | Đường dẫn file kết quả khi job hoàn thành |

## 4. Schema ví dụ

### `asset.import_image` — Input

```jsonc
{
  // ID yêu cầu, dùng cho idempotent retry
  "requestId": "req-uuid-v4",

  // Asset đích (tạo mới nếu chưa có)
  "assetId": "asset-uuid" | null,

  // Đường dẫn hoặc upload reference
  "source": {
    "type": "file_path",            // file_path | upload_chunk
    "path": "/path/to/image.png"
  },

  // Metadata
  "name": "Nhân vật chính — mặt trước",
  "viewId": "front",                // null nếu chưa gắn view
  "layerName": "full-body",          // null nếu chưa tách layer

  // Revision hiện tại để conflict check
  "baseRevision": 42
}
```

### `asset.import_image` — Output

```jsonc
{
  "success": true,
  "assetId": "asset-uuid",
  "sourceHash": "sha256:abcdef...",
  "dimensions": { "width": 2048, "height": 2048 },
  "hasAlpha": true,
  "alphaValid": true,               // false nếu phát hiện nền caro giả
  "revision": 43,
  "warnings": [
    "Ảnh nguồn 1024×1024, nhỏ hơn khuyến nghị cho output 4K"
  ]
}
```

### `export.start_job` — Input

```jsonc
{
  "requestId": "req-uuid-v4",
  "sceneId": "scene-uuid",
  "profile": {
    "resolution": "3840x2160",
    "fps": 60,
    "codec": "h264",
    "quality": "high"
  },
  "frameRange": {
    "start": 0.0,                    // giây
    "end": 10.0
  },
  "baseRevision": 42
}
```

### `export.start_job` — Output

```jsonc
{
  "success": true,
  "jobId": "job-uuid",
  "snapshotRevision": 42,
  "status": "rendering",            // rendering | encoding | waiting_renderer
  "totalFrames": 600,
  "estimatedDuration": "~5 minutes"
}
```

## 5. Trạng thái đặc biệt

| Trạng thái | Ý nghĩa | Tool trả về |
| --- | --- | --- |
| `waiting_renderer` | App chưa mở / renderer chưa sẵn sàng | `export.start_job` |
| `missing_view` | Asset thiếu góc nhìn cần thiết | `asset.validate_artwork` |
| `topology_mismatch` | Morph giữa mesh khác topology | `rig.test_pose` |
| `encoder_unavailable` | NVENC không có, dùng software fallback | `export.get_job_status` |

## 6. Idempotency và retry

- Mỗi tool ghi nhận `requestId`. Cùng `requestId` dispatch lại → trả kết quả
  đã lưu, không tạo entity mới.
- `requestId` lưu trong bộ nhớ session (mặc định) hoặc persist (nếu cần).
- TTL mặc định cho requestId: 1 giờ.
- Tool đọc không cần `requestId` vì không thay đổi state.

## 7. Mapping MCP tool → application command

| MCP tool | Application command |
| --- | --- |
| `asset.create` | `asset.create` |
| `asset.import_image` | `asset.import-image` |
| `rig.add_bone` | `rig.add-bone` |
| `animation.set_keyframe` | `animation.set-keyframe` |
| `export.start_job` | `export.start-job` |

MCP tool handler chỉ:
1. Parse input theo Zod schema.
2. Map sang command payload.
3. Dispatch qua application service.
4. Map command result sang MCP response.

Không chứa logic rig, animation, validation hay I/O.

## 8. Batch từ MCP

Agent có thể gửi nhiều command trong một lần gọi tool đặc biệt:

```jsonc
// Tool: batch.execute
{
  "requestId": "batch-uuid",
  "commands": [
    { "tool": "asset.create", "input": { ... } },
    { "tool": "asset.import_image", "input": { ... } },
    { "tool": "rig.create_skeleton", "input": { ... } }
  ]
}
```

Batch thực hiện nguyên tử qua command bus (xem [COMMAND_BUS.vi.md](COMMAND_BUS.vi.md)).

## 9. Luồng dựng phim hoàn chỉnh từ MCP

```text
1. project.get_info               → đọc project hiện tại
2. asset.prepare_image_brief      → lấy brief cho AI sinh ảnh
3. [Agent gọi tool sinh ảnh của client]
4. asset.import_image             → nhập ảnh thật
5. asset.attach_view              → gắn góc nhìn
6. asset.validate_artwork         → kiểm tra
7. rig.create_skeleton            → tạo xương
8. rig.set_weights                → đặt weights
9. rig.test_pose                  → test pose, xem preview
10. scene.create                  → tạo scene
11. scene.add_instance            → đặt nhân vật
12. scene.set_camera              → camera
13. scene.add_light               → đèn
14. animation.create_clip         → clip
15. animation.set_keyframe        → keyframes
16. animation.preview_frame       → xem trước
17. export.start_job              → xuất phim
18. export.get_job_status         → theo dõi tiến độ
19. export.get_result             → lấy file kết quả
```

## 10. Liên kết

- [PLAN.vi.md](PLAN.vi.md) mục 5 — AI/MCP và dữ liệu chung
- [IMAGE_WORKFLOW.vi.md](IMAGE_WORKFLOW.vi.md) — luồng tạo ảnh chi tiết
- [COMMAND_BUS.vi.md](COMMAND_BUS.vi.md) — command bus mà MCP tool gọi
- [MODULE_MAP.vi.md](MODULE_MAP.vi.md) — `apps/mcp/src/tools/`
