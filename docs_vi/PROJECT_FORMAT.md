# Định dạng project và schema dữ liệu

Trạng thái: đề xuất thiết kế để triển khai tại mốc 0–1. Chưa có schema chính thức
trong source; tài liệu này đặt ra hướng và ràng buộc để chốt khi triển khai.

## 1. Cấu trúc thư mục project trên disk

```text
<project-root>/
  manifest.json            Metadata, phiên bản schema, asset registry
  assets/
    <asset-id>/
      source/              Ảnh gốc (PNG, PSD layers), normal map, mask
      views/               Ảnh/layer theo từng góc nhìn
      landmarks.json       Tọa độ các điểm khớp (chin, wrist, knee...) cho auto-rig
      rig.json             Bone hierarchy, weights, bindings
      mesh.json            Contour, triangulation, UV, edge loops
      material.json        Tint, normal map ref, roughness
      meta.json            Tên, tag, nguồn gốc (AI brief, reference hash)
  scenes/
    <scene-id>/
      scene.json           Instance list, camera, light, depth, shot
      timeline.json        Track, clip, keyframe
  cache/                   Dữ liệu tạo lại được
    thumbnails/            Preview nhỏ cho asset browser
    atlas/                 Texture atlas đã đóng gói
    render/                Frame trung gian của job đang chạy
  history/                 Lịch sử undo (tùy chiến lược, xem COMMAND_BUS)
```

### Nguyên tắc

- `manifest.json` là điểm vào duy nhất; mở project bắt đầu từ đọc file này.
- `cache/` có thể xóa toàn bộ mà không mất dữ liệu nguồn. App tạo lại khi cần.
- Asset ID và scene ID dùng UUID v4, không dùng tên file hoặc chỉ số tăng dần.
- Tên thư mục/file con dùng slug tiếng Anh, không chứa ký tự đặc biệt ngoài `-_`.
- Đường dẫn trong manifest dùng `/` (forward slash), tương đối từ project root.

## 2. Manifest schema

Đây là phác thảo — schema chính thức sẽ được định nghĩa bằng Zod trong
`packages/contracts/src/project/` và sinh JSON Schema từ đó.

```jsonc
{
  // Phiên bản schema manifest, dùng để migration
  "schemaVersion": 1,

  // Metadata
  "name": "Phim ngắn mẫu",
  "createdAt": "2026-09-11T04:00:00Z",
  "updatedAt": "2026-09-11T04:30:00Z",

  // Revision toàn cục, tăng mỗi lần command commit thành công
  "revision": 42,

  // Registry asset
  "assets": {
    "<asset-id>": {
      "name": "Nhân vật chính",
      "type": "character",         // character | prop | background
      "directory": "assets/<asset-id>",
      "views": ["front", "quarter-left", "quarter-right"],
      "hasRig": true,
      "sourceHash": "sha256:abcdef...",
      "createdRevision": 5,
      "updatedRevision": 38
    }
  },

  // Registry scene
  "scenes": {
    "<scene-id>": {
      "name": "Cảnh mở đầu",
      "directory": "scenes/<scene-id>",
      "createdRevision": 10,
      "updatedRevision": 42
    }
  },

  // Cài đặt mặc định
  "defaults": {
    "timelineFps": 24,
    "previewFps": 60,
    "exportProfile": "4k-uhd-60"   // Tham chiếu tên preset trong RENDER_PROFILES
  }
}
```

### Quy tắc phiên bản schema

- `schemaVersion` là số nguyên tăng dần, bắt đầu từ 1.
- Khi mở project có `schemaVersion` cũ hơn phiên bản app hỗ trợ: chạy migration
  tự động, tạo bản sao lưu manifest cũ (`.manifest.v<N>.bak.json`), ghi log thay đổi.
- Khi mở project có `schemaVersion` mới hơn: báo lỗi rõ, không cố parse.
- Migration không được làm mất dữ liệu. Trường cũ bị xóa phải có mapping rõ ràng
  sang cấu trúc mới trong hàm migration.

## 3. Asset data

### Layer và view

Mỗi view (góc nhìn) của một asset chứa:

| Trường | Kiểu | Mô tả |
| --- | --- | --- |
| `viewId` | string | Tên góc: `front`, `quarter-left`, `side-left`, `back` |
| `layers` | Layer[] | Danh sách layer có thứ tự draw order |
| `pivot` | `{ x, y }` | Điểm gốc trong tọa độ texture, đơn vị pixel |
| `drawOrder` | number[] | Chỉ số sắp xếp layer khi vẽ |

Mỗi layer:

| Trường | Kiểu | Mô tả |
| --- | --- | --- |
| `layerId` | string | UUID |
| `name` | string | Tên mô tả: `head`, `torso`, `left-arm` |
| `colorPath` | string | Đường dẫn ảnh màu, tương đối từ asset dir |
| `alphaMaskPath` | string? | Nếu alpha tách riêng khỏi ảnh màu |
| `normalMapPath` | string? | Normal map tùy chọn |
| `bounds` | `{ x, y, width, height }` | Vị trí và kích thước trong canvas asset |

### Rig

```jsonc
{
  "bones": [
    {
      "boneId": "bone-001",
      "name": "spine",
      "parentId": null,             // null = root bone
      "position": { "x": 0, "y": 0 },  // local offset từ parent, đơn vị pixel
      "rotation": 0,                // radian, local
      "length": 50                  // pixel
    }
  ],
  "bindings": [
    {
      "layerId": "layer-001",
      "boneId": "bone-001",
      "weights": [/* per-vertex weights */]
    }
  ]
}
```

Invariant:
- Hierarchy phải acyclic; validate bằng topological sort khi load.
- Mỗi vertex có tối đa 4 bone influence; weights chuẩn hóa tổng = 1.0.
- Rest pose là trạng thái khi chưa áp animation; lưu riêng cho mỗi view.

### Landmarks

Dùng cho quy trình Auto-Rig (Mixamo-style, xem [AUTO_RIG.md](AUTO_RIG.md)):

```jsonc
{
  "templateId": "humanoid-v1",
  "status": "confirmed",            // estimated | confirmed | manual
  "points": {
    "chin": { "x": 512, "y": 280 },
    "neck": { "x": 512, "y": 320 },
    "left_shoulder": { "x": 420, "y": 360 },
    "right_shoulder": { "x": 604, "y": 360 },
    "left_elbow": { "x": 360, "y": 480 },
    "right_elbow": { "x": 664, "y": 480 },
    "left_wrist": { "x": 310, "y": 600 },
    "right_wrist": { "x": 714, "y": 600 },
    "left_knee": { "x": 460, "y": 750 },
    "right_knee": { "x": 564, "y": 750 },
    "left_ankle": { "x": 450, "y": 920 },
    "right_ankle": { "x": 574, "y": 920 }
  }
}
```

### Mesh

```jsonc
{
  "contours": [/* mảng điểm viền */],
  "vertices": [/* tọa độ sau triangulation */],
  "indices": [/* tam giác */],
  "uvs": [/* UV tương ứng vertices */],
  "edgeLoops": [/* mảng danh sách vertex index tạo thành vòng quanh khớp */],
  "topology": "earcut-v1"          // Đánh dấu phương pháp triangulation
}
```

## 4. Scene data

```jsonc
{
  "instances": [
    {
      "instanceId": "inst-001",
      "assetId": "<asset-id>",
      "position": { "x": 0, "y": 0, "z": 0 },  // z = depth
      "scale": { "x": 1, "y": 1 },
      "rotation": 0
    }
  ],
  "camera": {
    "type": "orthographic",         // orthographic | perspective
    "position": { "x": 0, "y": 0, "z": 100 },
    "zoom": 1,
    "near": 0.1,
    "far": 1000
  },
  "lights": [
    {
      "lightId": "light-001",
      "type": "directional",
      "direction": { "x": -1, "y": -1, "z": -1 },
      "color": "#ffffff",
      "intensity": 1.0,
      "castShadow": true
    }
  ],
  "shadowReceivers": [
    {
      "type": "plane",
      "normal": { "x": 0, "y": 1, "z": 0 },
      "offset": -100
    }
  ]
}
```

## 5. Timeline và animation

```jsonc
{
  "duration": 10.0,                 // giây
  "tracks": [
    {
      "trackId": "track-001",
      "targetType": "instance",     // instance | camera | light
      "targetId": "inst-001",
      "clips": [
        {
          "clipId": "clip-001",
          "startTime": 0.0,
          "endTime": 5.0,
          "keyframes": [
            {
              "time": 0.0,          // giây, tương đối từ startTime
              "property": "position.x",
              "value": 0,
              "easing": "ease-in-out"
            }
          ]
        }
      ]
    }
  ]
}
```

Thời gian trong timeline luôn tính bằng giây. Chuyển sang frame index dùng
`frameIndex = time × fps`. Xem [RENDER_PROFILES.md](RENDER_PROFILES.md) cho
ba loại FPS và cách lấy mẫu.

## 6. Lưu và mở project

### Lưu (save)

1. Serialize state hiện tại thành JSON theo schema.
2. Ghi file tạm (`<file>.tmp`) rồi rename atomic — tránh corrupt nếu crash giữa chừng.
3. Cập nhật `revision` trong manifest.
4. Cache (thumbnail, atlas) được ghi riêng, không chặn save.

### Mở (load)

1. Đọc `manifest.json`, kiểm tra `schemaVersion`.
2. Migration nếu cần (xem mục 2).
3. Validate tham chiếu: asset ID trong scene phải tồn tại trong manifest.
4. Lazy-load texture và mesh — không đọc toàn bộ ảnh vào RAM khi mở project.
5. Báo lỗi cụ thể nếu thiếu file, ID không hợp lệ hoặc schema version không hỗ trợ.

### Autosave và recovery

- Autosave định kỳ (mặc định 2 phút) vào thư mục tạm riêng.
- Khi mở project phát hiện autosave mới hơn manifest: hỏi người dùng có khôi phục.
- Không âm thầm ghi đè project gốc bằng autosave.

## 7. Phân biệt source vs. cache

| Loại | Ví dụ | Xóa được? | Nằm trong VCS? |
| --- | --- | --- | --- |
| Source | Ảnh gốc, rig, mesh, scene, timeline | ❌ | ✅ |
| Cache | Thumbnail, atlas, render frame tạm | ✅ | ❌ (.gitignore) |
| History | Undo stack, snapshot | Tùy policy | ❌ |

## 8. Liên kết

- [PLAN.md](PLAN.md) mục 5, 7 — yêu cầu project format
- [COMMAND_BUS.md](COMMAND_BUS.md) — cách revision và undo tương tác với lưu project
- [MODULE_MAP.md](MODULE_MAP.md) — `packages/contracts/src/` sở hữu schema,
  `apps/service/src/adapters/persistence/` sở hữu I/O
- [AUTO_RIG.md](AUTO_RIG.md) — chi tiết landmarks và auto-rig format
- [UI_SPECIFICATION.md](UI_SPECIFICATION.md) — tương tác UI với cấu trúc project
