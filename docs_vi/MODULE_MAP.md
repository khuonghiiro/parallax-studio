# Bản đồ module cho studio vẽ và dựng phim

Trạng thái: đề xuất nâng cấp 12/09/2026. Đã có `packages/contracts/`,
`packages/core/`, `packages/application/`, `packages/runtime/`, UI ở `src/`,
service ở `service/`, MCP ở `mcp/`. `apps/` chưa tồn tại. Bản đồ dưới đây
phân trách nhiệm, không bắt buộc di chuyển toàn bộ thư mục trước khi cải tiến.
Chỉ tạo module khi có trách nhiệm thật; không tạo scaffold rỗng.

## 1. Owner theo workflow

| Workspace | UI owner trong cấu trúc hiện tại | Domain owner và contract |
| --- | --- | --- |
| `draw` | `src/features/drawing/` | DrawingDocument, DrawingLayer, Cel, Exposure tại contracts/drawing; core/drawing |
| `rig` | `src/features/rig/`, asset assembly dùng assets | AssetDefinition tại contracts/asset; geometry và rig tại core |
| `animate` | `src/features/animation/` | AnimationClip, ClipPlacement tại contracts/animation; core/animation |
| `compose` | `src/features/composition/` | Composition, AssetInstance tại contracts/composition; core/scene |
| `edit` | `src/features/sequence/` | Shot, Sequence, AudioClip, SubtitleCue tại contracts/sequence; core/sequence |

Các path mới là owner đề xuất, không phải tuyên bố đã triển khai. Feature assets
sở hữu library/import/parts/views dùng chung; feature stage sở hữu viewport host,
picking và điều phối overlay; không sở hữu quy tắc mesh, transform hay sampling.
Timeline shell có chung ruler, zoom, selection và accessibility; exposure sheet,
clip dope sheet/curves và sequence edit có adapter riêng theo domain.

## 2. Ranh giới module dùng chung

| Owner | Trách nhiệm duy nhất | Không được làm |
| --- | --- | --- |
| `packages/contracts/src/drawing/` | Drawing/layer/cel/exposure schemas, stroke command DTO | Brush rasterization, UI state |
| `packages/contracts/src/asset/` | Definition, part, view, media reference schemas | Mutable instance pose |
| `packages/contracts/src/animation/` | Typed tracks, clips, placements, channel masks | React timeline state |
| `packages/contracts/src/composition/` | Composition node, depth plane, camera route schemas | Duplicate scene transforms |
| `packages/contracts/src/sequence/` | Shot, sequence, audio/subtitle, transition schemas | Encoder logic |
| `packages/core/src/drawing/` | Exposure evaluation, tile edit semantics, masks, brush sampling rules | Device event listeners, storage |
| `packages/core/src/geometry/` | Contours/holes, topology edits, triangulation validation, UV | Assume Earcut repairs invalid input |
| `packages/core/src/rig/` | Hierarchy, rest/bind, influence normalize, weights, IK | UI-specific weight algorithm |
| `packages/core/src/animation/` | Time mapping, keys/easing, clip blending, exposure scheduling | Another exporter sampler |
| `packages/core/src/scene/` | Parenting/world transforms, depth, camera route sampling | GPU resources |
| `packages/core/src/sequence/` | Shot mapping, transitions, audio/subtitle timing | FFmpeg process |
| `packages/core/src/dependencies/` | Typed-ref graph, invalidation, compatibility/rebind plan | File I/O |
| `packages/application/src/` | Authoritative commands, transactions, gestures commit, jobs, history | Reimplement core algorithms |
| `packages/runtime/src/` | Raster/tile texture upload, deformed meshes, camera/light/shadow, frame graph | Write project state |
| `service/` | Persistence/media/renderer/encoder adapters and lifecycle | Second command authority |
| `mcp/` | Schema-driven tools/resources, job and context adapters | Local state or private rig/drawing algorithms |

Drawing renderer backend thực thi cùng brush/tile contract cho UI và MCP;
device input adapter chỉ cấp points/pressure/tilt chuẩn hóa. Chọn rasterization
CPU/GPU cần spike và tolerance fixtures trước triển khai; không viết thuật toán
riêng trong UI, Node và Rust. Source tiles đã import và delta đã commit có thẩm quyền.

## 3. Allowed dependencies

- Contracts chỉ phụ thuộc schema library; core phụ thuộc contracts và thuật toán thuần.
- Application phụ thuộc contracts/core/ports, không React/Three.js hay storage cụ thể.
- Runtime phụ thuộc contracts/core/Three.js, không React/MCP hoặc project writer.
- UI gọi service client, contracts và core cho transient preview; không HTTP parsing
  trong component. MCP cũng gọi cùng service client.
- Service adapter hiện thực application port. Desktop quản lý native lifecycle,
  không có reducer rig/timeline/composition khác.
- UI session giữ tool/selection/panel/playhead; project revision chỉ đổi khi transaction commit.

## 4. Một owner cho mỗi logic

### Drawing và gesture

Input adapter chuẩn hóa pointer, pressure, tilt, zoom/pan mapping. Drawing feature
sở hữu tool state và overlay; core/drawing sở hữu stroke semantics; runtime thực
thi raster operation; application ghi tile delta một lần. Stroke cancel không
commit, retry cùng command ID không tạo stroke thứ hai. Onion skin lấy mẫu exposure
bằng core; không thêm vào source hoặc export.

### Assembly, mesh và dependency

Assets feature chọn/lắp parts và pivot; core/scene quản lý transform; core/geometry
sửa contour/vertex/edge, core/rig quản lý bind/weights. Application điều phối
dependency report, preview, commit hoặc cancel rebind. UI và MCP nhận cùng IDs,
diagnostics và invalidation; không tự remesh khi đổi một property không liên quan.

### Ba timeline

Timeline primitives chia sẻ ruler, zoom, hit testing và keyboard helpers, không
gom mọi domain vào một reducer. Drawing exposure, AnimationClip và Sequence có
command/property contracts riêng; core/animation điều phối thời gian clip, core/
drawing chọn cel, core/sequence chọn shot. Runtime/export gọi cùng evaluation path.
Camera route thuộc composition, không thuộc clip nhân vật. Sequence trim không sửa
clip nguồn. Các API dùng typed targets thay chuỗi property ghi trực tiếp state.

### Media, service và MCP

Một service giữ project revision có thẩm quyền. Offline mode nếu hỗ trợ cần
session/authority rõ, không tự tạo state cục bộ thứ hai sau mất kết nối. Reconnect
query revision/jobs/dependencies trước retry; adapter không tự nhân đôi operation.
Image generation ở AI client; ingestion/validation qua application ports.
Encoding và GPU readback không được ghép vào React viewport controller.

## 5. Ánh xạ source hiện có sang trách nhiệm đề xuất

| Source hiện có | Hướng refactor khi được giao triển khai |
| --- | --- |
| `src/app/EditorContext.tsx` | Tách service session, document context và ephemeral workspace store; bỏ hard-coded clip union |
| `src/features/timeline/TimelinePanel.tsx` | Tách exposure/clip/sequence adapters; bỏ duration và shot demo cố định |
| `src/features/stage/scene-composer.ts` | Adapter composition model và runtime; không giữ stage data riêng |
| `src/features/stage/mesh-builder.ts` | Tái dùng geometry owner, giữ GPU adapter có trách nhiệm rõ |
| `src/features/stage/weight-painter.ts` | Input/overlay adapter; weight edit policy thuộc core/rig + application |
| `packages/contracts/src/scene/` | Migrate instance/camera/shot sang owner mới có compatibility adapter |
| `packages/application/src/projects/project-state.ts` | Registry mới và revision/transaction thống nhất |
| `packages/core/src/director/script-parser.ts` | Script→shot proposal; không dựng một sequence engine riêng |

Bản source đã có logic và tests cần đánh giá tái dùng. Không gọi toàn bộ source
là bản nén cũ hoặc viết lại mọi thứ. Mỗi migration giữ import compatibility cần
thiết có thời hạn, không giữ hai schema owner song song. Không sửa source trong task plan.

## 6. Quy tắc triển khai và kiểm tra

Trước khi song song: chốt schema refs/time/clip placement, command boundaries và
test fixtures. Một file có một write owner. Mỗi source file tối đa 800 dòng, tách
theo trách nhiệm; geometry lớn chia contour/topology/triangulation, drawing chia
brush/tiles/exposure/masks, không chuyển vào generic utils.

Nghiệm thu ownership: UI/MCP cùng command tạo cùng state; draw/animate/compose/edit
không có sampler hoặc time conversion riêng; remesh dùng một dependency validator;
save/reopen giữ mọi tài liệu và source code dependency graph không có vòng.

Tham chiếu: [PLAN.md](PLAN.md), [CODING_RULES.md](CODING_RULES.md),
[PROJECT_FORMAT.md](PROJECT_FORMAT.md), [COMMAND_BUS.md](COMMAND_BUS.md),
[UI_SPECIFICATION.md](UI_SPECIFICATION.md), [TESTING_STRATEGY.md](TESTING_STRATEGY.md),
[MCP_TOOLS.md](MCP_TOOLS.md), [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md),
[IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md), [AUTO_RIG.md](AUTO_RIG.md),
[RENDER_PROFILES.md](RENDER_PROFILES.md).
