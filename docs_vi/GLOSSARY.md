# Bảng thuật ngữ Parallax Studio

Thuật ngữ theo thứ tự abc. Mỗi mục ghi tên tiếng Anh, giải thích ngắn và tài liệu
liên quan.

## A

### Asset
Đơn vị tài nguyên: một nhân vật, đạo cụ hoặc bối cảnh. Chứa layers, views, rig,
mesh và material. Mỗi asset có UUID riêng.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md), [PLAN.md](PLAN.md) mục 2.

### Alpha mask
Ảnh xám hoặc kênh alpha xác định vùng trong suốt của layer. Dùng cho silhouette
shadow và composite. Nền caro giả vẽ trong ảnh không phải alpha hợp lệ.
→ [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) mục 5.

## B

### Batch (command)
Nhóm nhiều command thực hiện nguyên tử: tất cả thành công hoặc rollback toàn bộ.
Tạo một entry duy nhất trong history stack.
→ [COMMAND_BUS.md](COMMAND_BUS.md) mục 5.

### Bind pose
Tư thế tham chiếu của skeleton khi tạo weights. InverseBindMatrix được tính từ
bind pose. Đồng nghĩa với rest pose trong ngữ cảnh này.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) mục 2 bước 3.

### Bone
Đoạn xương trong skeleton, xác định bởi vị trí, rotation, chiều dài và parent.
Tạo thành hierarchy cây (acyclic). Điều khiển vị trí vertex qua skin weights.
→ [PLAN.md](PLAN.md) mục 2, [MODULE_MAP.md](MODULE_MAP.md).

## C

### Camera framing
Vùng nhìn của camera trong scene, xác định bởi loại (orthographic/perspective),
vị trí, zoom và near/far. Ảnh hưởng parallax và safe area.
→ [PLAN.md](PLAN.md) mục 4.

### Cel
Một hình vẽ raster riêng biệt có định danh ổn định trong cel library. Một cel có thể
được giữ (hold) trên nhiều frame qua các Exposure khác nhau.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) mục 3, [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) mục 3.

### Clip
Đoạn animation trên track, có start time, end time và danh sách keyframes.
Clip có thể tái sử dụng cho nhiều instance.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) mục 5.

### Command
Object bất biến mô tả ý định thay đổi project state. Có type, payload, commandId
và baseRevision. Thực hiện qua command bus.
→ [COMMAND_BUS.md](COMMAND_BUS.md) mục 2.

### Command bus
Lớp điều phối duy nhất cho mọi thay đổi state. UI và MCP đều dispatch command
qua đây. Chịu trách nhiệm validation, execution, history và revision.
→ [COMMAND_BUS.md](COMMAND_BUS.md).

### Composition
Sân khấu 2.5D chứa cây phân cấp node, các mặt phẳng chiều sâu (depth planes), các
AssetInstance, đường đi camera và nguồn sáng/bóng đổ.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) mục 6, [UI_SPECIFICATION.md](UI_SPECIFICATION.md) mục 7.

## D

### Deformation pipeline
Chuỗi xử lý biến dạng mesh theo thứ tự cố định: view selection → warp/morph →
bone skinning → instance transform → camera → shadow → render.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md).

### Depth (z)
Giá trị chiều sâu của instance trong scene. Quyết định thứ tự vẽ và mức parallax
với camera. Không tạo thể tích 3D thực.
→ [PLAN.md](PLAN.md) mục 4.

### Draw order
Thứ tự vẽ các layer trong một asset. Layer có draw order cao hơn vẽ đè lên layer
thấp hơn. Mỗi view có draw order riêng.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) mục 3.

### DrawingDocument
Tài liệu vẽ 2D chứa kích thước canvas, color profile, origin và cây layer (DrawingLayer).
Có thể mở và vẽ độc lập hoặc liên kết với asset.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) mục 3, [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) mục 2.

## E

### Easing
Hàm làm mượt giữa hai keyframe: linear, ease-in, ease-out, cubic bezier.
Xác định tốc độ chuyển đổi giá trị theo thời gian.
→ [MODULE_MAP.md](MODULE_MAP.md) — `core/animation/`.

### Export FPS → xem Output FPS.

### Exposure
Khoảng thời gian (tính bằng frame hoặc tick) giữ một Cel cụ thể hoặc để trống (blank)
trên một DrawingLayer.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) mục 3, [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) mục 3.

## F

### Frame index
Chỉ số frame nguyên (0, 1, 2...) trong video xuất. Liên hệ với thời gian:
`time = frameIndex / outputFps`.
→ [RENDER_PROFILES.md](RENDER_PROFILES.md) mục 2.

## H

### Hysteresis threshold
Ngưỡng ổn định khi chuyển view: tránh nhấp nháy khi góc nhìn dao động quanh
ranh giới hai view. Mặc định ±5°.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) mục 2 bước 1.

## I

### Instance
Bản đặt (placement) của một asset trong scene. Có position, rotation, scale, depth.
Nhiều instance có thể tham chiếu cùng một asset.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) mục 4.

### Inverse command
Command ngược lại dùng để undo. Khi command A thêm bone, inverse A xóa bone đó.
→ [COMMAND_BUS.md](COMMAND_BUS.md) mục 6.

## K

### Keyframe
Điểm neo giá trị tại thời điểm cụ thể trên timeline. Giá trị giữa hai keyframe
được nội suy theo easing function.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) mục 5.

## L

### Layer
Một lớp ảnh trong asset: ảnh màu, alpha mask, tùy chọn normal map. Tên layer
mô tả bộ phận: `head`, `torso`, `left-arm`.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) mục 3.

### Linear Blend Skinning (LBS)
Thuật toán biến dạng vertex theo trọng số xương. Mỗi vertex chịu ảnh hưởng
tối đa 4 bone. Có candy-wrapper artifact khi xoay > 180°.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) mục 2 bước 3.

## M

### Manifest
File `manifest.json` ở gốc project. Chứa schema version, asset registry,
scene registry, revision và defaults.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) mục 2.

### Morph target
Bộ delta vertex positions cho một biểu cảm hoặc biến dạng cụ thể.
Áp dụng additive với blend weight. Yêu cầu topology tương thích.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) mục 6.

## N

### Normal map
Ảnh mã hóa hướng bề mặt để tạo cảm giác nổi khối khi có ánh sáng. Chỉ thay đổi
phản ứng ánh sáng, không sinh hình khối hay góc khuất thực.
→ [PLAN.md](PLAN.md) mục 2.

### NVENC
Hardware encoder của NVIDIA cho H.264/HEVC. Ưu tiên dùng khi driver hỗ trợ;
có fallback software encoder.
→ [RENDER_PROFILES.md](RENDER_PROFILES.md) mục 3.

## O

### Output FPS
FPS của file video xuất ra (24/30/60/120). Xác định frame count và timestamp.
Độc lập với tốc độ render thực tế và preview FPS.
→ [RENDER_PROFILES.md](RENDER_PROFILES.md) mục 2.

## P

### Parallax
Hiệu ứng chuyển động tương đối giữa các lớp có chiều sâu khác nhau khi camera
di chuyển. Đạt được qua depth values + camera projection, không cần model 3D.
→ [PLAN.md](PLAN.md) mục 4.

### Pivot
Điểm gốc (origin) của asset hoặc layer, dùng làm tâm xoay và tham chiếu vị trí.
Mỗi view có pivot riêng.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) mục 3.

### Pose
Trạng thái tổng hợp tại một thời điểm: bone transforms + warp parameters +
morph weights + view selection. Kết quả của pose evaluator.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) mục 4.

### Preview FPS
FPS mục tiêu cho viewport editor (mặc định 60). Có thể giảm resolution hoặc
skip frame khi tải nặng. Khác output FPS.
→ [RENDER_PROFILES.md](RENDER_PROFILES.md) mục 2.

## R

### Rest pose / Rest space
Tư thế và không gian tọa độ mặc định của mesh khi chưa áp animation. Warp và
morph hoạt động trong rest space trước khi bone skinning.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) mục 2 bước 2.

### Revision
Số nguyên tăng dần mỗi lần command commit thành công. Dùng cho conflict detection,
snapshot export và undo tracking.
→ [COMMAND_BUS.md](COMMAND_BUS.md) mục 7.

## S

### Scene
Không gian dựng cảnh 2.5D (xem thêm [Composition](#composition)). Trong định dạng mới,
Composition là thực thể chính thức quản lý các depth plane, instance và camera.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) mục 6.

### Sequence
Bản dựng hoàn chỉnh của một tập hợp các Shot được sắp xếp theo trục thời gian tuyến tính
của phim, kèm các track audio và subtitle cue.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) mục 6, [UI_SPECIFICATION.md](UI_SPECIFICATION.md) mục 8.

### Shadow proxy
Hình đơn giản (mesh phụ) dùng để tạo bóng có thể tích hơn cho card phẳng.
Là mở rộng sau bản đầu.
→ [PLAN.md](PLAN.md) mục 4.

### Shadow receiver
Plane đơn giản (sàn, tường) trong scene nhận bóng đổ từ nhân vật/đạo cụ.
App cung cấp, không cần người dùng làm model 3D.
→ [PLAN.md](PLAN.md) mục 4.

### Shot
Đoạn phim trong timeline, tương ứng một camera setup và khoảng thời gian.
Timeline có thể chứa nhiều shot liên tiếp.
→ [PLAN.md](PLAN.md) mục 7 mốc 3.

### Skinning → xem Linear Blend Skinning.

### Snapshot revision
Revision tại thời điểm bắt đầu export job. Đảm bảo toàn bộ frame trong một job
được render từ cùng một trạng thái scene.
→ [RENDER_PROFILES.md](RENDER_PROFILES.md) mục 5.

## T

### Timeline
Trục thời gian chứa tracks, clips và keyframes. Thời gian tính bằng giây.
Chuyển sang frame index qua `frameIndex = time × fps`.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) mục 5.

### Timeline FPS
Đơn vị chia frame khi người dùng đặt keyframe và clip. Ví dụ 24 FPS: snap
keyframe theo bội của 1/24 giây.
→ [RENDER_PROFILES.md](RENDER_PROFILES.md) mục 2.

### Topology
Cấu trúc kết nối của mesh: số vertex, triangle indices. Morph chỉ hoạt động
giữa mesh có topology tương thích (cùng vertex count, cùng indices).
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) mục 6.

### Track
Đường trên timeline gắn với một target (instance, camera, light). Chứa một
hoặc nhiều clips.
→ [PROJECT_FORMAT.md](PROJECT_FORMAT.md) mục 5.

## V

### View / View set
Bộ góc nhìn của asset: front, quarter-left, quarter-right, side, back. Mỗi view
có layers, mesh, bindings và pivot riêng. Chuyển view theo hướng camera hoặc
parameter điều khiển.
→ [PLAN.md](PLAN.md) mục 2, [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) bước 1.

## W

### Warp grid
Lưới điều khiển n×m dùng để biến dạng mesh trước skinning. Control point có offset;
vertex nội suy bilinear từ 4 góc cell chứa nó. Dùng cho quay mặt nhẹ, squash/stretch.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) mục 5.

### Weights / Skin weights
Trọng số xác định mức ảnh hưởng của mỗi bone lên mỗi vertex. Tối đa 4 bone per
vertex. Tổng weights per vertex = 1.0.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) mục 2 bước 3.

### Workspace
Bố cục giao diện và bộ công cụ chuyên biệt cho từng giai đoạn làm việc trong cùng một
project (`draw`, `rig`, `animate`, `compose`, `edit`). Chuyển workspace không làm thay
đổi hay phân mảnh trạng thái dự án.
→ [UI_SPECIFICATION.md](UI_SPECIFICATION.md) mục 2, [PLAN.md](PLAN.md) mục 2.

### World space
Không gian tọa độ chung của scene. Gốc tại tâm scene, X→, Y↑, Z+ ra ngoài.
Đơn vị pixel (scene units). Sau instance transform, trước camera transform.
→ [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) mục 3.
