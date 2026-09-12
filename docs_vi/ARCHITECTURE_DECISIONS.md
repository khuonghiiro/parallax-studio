# Nhật ký quyết định kiến trúc (ADR)

Mỗi quyết định quan trọng được ghi lại theo format: bối cảnh, quyết định và hệ quả.
Thứ tự theo thời gian. Trạng thái: `accepted` (đã chốt), `proposed` (đang xem xét),
`superseded` (bị thay thế bởi ADR khác).

---

## ADR-001: Kiến trúc 2D/2.5D, không dùng Blender/Godot

**Trạng thái:** accepted

**Bối cảnh:**
Phiên bản đầu tiên từng dự kiến dùng Blender làm backend render và Godot cho
viewport. Cả hai đều mạnh nhưng đòi hỏi người dùng cài thêm phần mềm lớn, pipeline
phức tạp và khó kiểm soát lifecycle trên Windows/Linux.

**Quyết định:**
Chuyển sang kiến trúc thuần 2D/2.5D: layered artwork, flat meshes, bones, deformers,
camera/light có chiều sâu. Không phụ thuộc Blender, Godot hoặc bất kỳ engine 3D
bên ngoài nào.

**Hệ quả:**
- App tự chủ về render pipeline, dễ đóng gói và phân phối.
- Không hỗ trợ model 3D hoàn chỉnh, cloth/fluid hoặc full 3D viewport.
- Parallax và bóng đạt được qua depth layers + camera, không phải true 3D geometry.
- Giới hạn ở góc nhìn mà asset 2D cung cấp; không có thể tích thực.

**Tham chiếu:** [PLAN.md](PLAN.md) mục 1, 9.

---

## ADR-002: Three.js + WebGL2 làm renderer duy nhất

**Trạng thái:** accepted

**Bối cảnh:**
Cần renderer hỗ trợ skinning, material (color + normal map + alpha), shadow và
camera projection. Ứng viên: Three.js, PixiJS, renderer tự viết.

**Quyết định:**
Dùng Three.js với WebGL2 làm renderer duy nhất cho cả preview và export.
Không ghép PixiJS và Three.js trong bản đầu.

**Lý do:**
- Three.js có sẵn SkinnedMesh, MeshStandardMaterial, shadow map và camera.
- MIT license, cộng đồng lớn, tài liệu tốt.
- Ghép hai renderer tạo chi phí đồng bộ pose, material, picking và shadow.
- WebGPU sẽ được đánh giá sau khi WebGL2 pipeline ổn định.

**Hệ quả:**
- Tất cả render logic nằm trong `packages/runtime/src/`.
- Preview và export dùng cùng Three.js scene graph.
- Hiệu năng phụ thuộc WebGL2; nếu cần GPU compute thì cân nhắc WebGPU sau.

**Tham chiếu:** [PLAN.md](PLAN.md) mục 3, 4.

---

## ADR-003: AI tạo ảnh dùng tool của client, không cài model local

**Trạng thái:** accepted

**Bối cảnh:**
App cần asset ảnh (nhân vật, bối cảnh, đạo cụ). Phương án: (a) cài Stable Diffusion /
ComfyUI local, (b) gọi API sinh ảnh bên ngoài với API key riêng, (c) dùng công cụ
sinh ảnh đã có trong AI client (Codex/Antigravity).

**Quyết định:**
Phương án (c): Agent trong Codex/Antigravity dùng công cụ sinh ảnh sẵn có của chính
client, rồi đưa kết quả vào app qua MCP. App không tự cài model, không yêu cầu
API key sinh ảnh riêng.

**Lý do:**
- Không cần người dùng cài model GB-level trên máy.
- Không cần người dùng cấu hình API key cho dịch vụ ảnh.
- Tận dụng hạn mức và chất lượng đã có của tài khoản AI.
- MCP chỉ cần tool nhập ảnh và kiểm tra, không cần gọi model.

**Hệ quả:**
- Phụ thuộc AI client có công cụ sinh ảnh khả dụng.
- Không thể sinh ảnh offline khi không có AI client.
- Cần protocol truyền file giữa client và app (local path hoặc upload).
- Chất lượng và style ảnh phụ thuộc model của client.

**Tham chiếu:** [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md),
[PLAN.md](PLAN.md) mục 5.

---

## ADR-004: TypeScript sở hữu logic chính, Rust chỉ cho hot path đã đo

**Trạng thái:** accepted

**Bối cảnh:**
Dự án có Tauri (Rust) cho desktop shell. Câu hỏi: rig/timeline/animation logic
nên nằm trong TypeScript hay Rust?

**Quyết định:**
TypeScript sở hữu toàn bộ logic nghiệp vụ (rig, animation, deformation, scene,
commands). Rust chỉ cho Tauri shell, lifecycle sidecar và hot path đã đo được
lợi ích rõ ràng.

**Lý do:**
- UI (React), MCP (SDK TS) và renderer (Three.js) đều dùng TypeScript — logic
  chung trong TS cho phép import trực tiếp mà không cần bridge.
- Duy trì một nguồn triển khai, một bộ test.
- Chuyển sang Rust/WASM chỉ khi benchmark cho thấy JS là bottleneck.

**Hệ quả:**
- Rust không giữ bản rig/timeline thứ hai.
- Không cần serialize/deserialize qua FFI cho mọi thao tác.
- Hot path (nếu cần) dùng WASM module có interface TypeScript.
- Cần đo trước khi migrate; không migrate preventive.

**Tham chiếu:** [PLAN.md](PLAN.md) mục 3.

---

## ADR-005: Một renderer cho preview và export

**Trạng thái:** accepted

**Bối cảnh:**
Có thể tách renderer preview (nhanh, lossy) và renderer export (chậm, chính xác).

**Quyết định:**
Dùng cùng một renderer (Three.js) cho cả preview và export. Cùng pose evaluator,
cùng deformation pipeline, cùng material/shadow.

**Lý do:**
- Tránh "preview trông khác export" — vấn đề phổ biến khi có hai pipeline.
- Giảm code duplication.
- Preview có thể giảm resolution/shadow quality nhưng cùng logic.

**Hệ quả:**
- Export chạy offline, render từng frame và stream sang FFmpeg.
- Preview có thể skip frame để giữ framerate tương tác.
- Cần test contract: cùng time → cùng pose output.

**Tham chiếu:** [PLAN.md](PLAN.md) mục 6,
[DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) mục 7.

---

## ADR-006: Không ghép PixiJS và Three.js

**Trạng thái:** accepted

**Bối cảnh:**
PixiJS mạnh về 2D sprite rendering. Three.js mạnh về 3D nhưng cũng xử lý được
2D với flat mesh. Có ý kiến dùng PixiJS cho UI/sprite và Three.js cho 3D effect.

**Quyết định:**
Chỉ dùng Three.js. Không thêm PixiJS vào dependency.

**Lý do:**
- Ghép hai renderer cần đồng bộ: pose state, z-order, picking, event handling.
- Shadow pass cần thấy cùng mesh mà PixiJS render → phức tạp.
- Three.js xử lý flat mesh 2D với texture đủ tốt cho use case này.

**Hệ quả:**
- Tất cả render logic đồng nhất trong Three.js.
- Không có sprite-specific optimization của PixiJS (batch rendering).
- Nếu hiệu năng 2D sprite là bottleneck, tối ưu trong Three.js trước.

**Tham chiếu:** [PLAN.md](PLAN.md) mục 3.

---

## ADR-007: Export FPS tách biệt preview FPS

**Trạng thái:** accepted

**Bối cảnh:**
Yêu cầu output 60/120 FPS nhưng preview viewport có thể không đạt framerate đó
ở 4K.

**Quyết định:**
Tách ba loại FPS: timeline FPS, preview FPS, output FPS. Output FPS quyết định
frame count và timestamp của video, không phụ thuộc tốc độ render thực tế.

**Lý do:**
- 4K/120 FPS có thể render chậm hơn thời gian thực — đó là dự kiến.
- Preview có thể chạy ở resolution thấp hơn và skip frame.
- Timeline FPS là đơn vị cho authoring (đặt keyframe).

**Hệ quả:**
- Export luôn lấy đủ frame: `totalFrames = duration × outputFps`.
- Không nhân đôi frame 60 FPS để gọi là 120 FPS.
- Preview giảm quality nhưng vẫn dùng cùng pose evaluator.

**Tham chiếu:** [RENDER_PROFILES.md](RENDER_PROFILES.md) mục 2.

---

## ADR-008: Auto-Rig Mixamo-style và Mesh Topology chuẩn cho 2D Animation

**Trạng thái:** accepted

**Bối cảnh:**
Rigging nhân vật 2D thủ công (đặt từng xương, chỉnh pivot, vẽ trọng số cho từng vertex)
rất tốn thời gian. Người dùng cần cơ chế nhanh như Mixamo trong 3D: chỉ cần đánh dấu
các vị trí then chốt (chin, wrists, knees, ankles...) là app tự sinh toàn bộ skeleton,
bind pose và auto-weights. Đồng thời, biến dạng 2D uốn cong mượt mà đòi hỏi mesh
phải có topology chuẩn tương tự edge loops trong 3D.

**Quyết định:**
1. Triển khai hệ thống Auto-Rig 2D dựa trên Landmark Detection và Rig-Ready Image Templates.
2. Chuẩn hóa quy trình: Landmarks → Auto-skeleton → Auto-weights (khoảng cách nghịch đảo kết hợp layer bounds).
3. Đặt quy chuẩn Mesh Topology: bắt buộc ≥1-2 edge loops quanh các khớp uốn cong (khuỷu, gối, vai, hông) và vertex rings quanh mắt/miệng.
4. Cung cấp bộ Animation Templates mẫu (walk, run, idle, gesture) tự động retarget vào skeleton đã sinh.

**Lý do:**
- Giảm thời gian tạo nhân vật có thể cử động từ hàng giờ xuống ~30 giây.
- Cho phép AI agent qua MCP tự động sinh asset, gắn rig và gán chuyển động mẫu mà không cần can thiệp thủ công.
- Ngăn ngừa hiện tượng gãy nếp, méo mesh hoặc hở khớp khi biến dạng góc lớn.

**Hệ quả:**
- Cần thuật toán trích xuất contour, thêm vertex nội bộ và tạo edge loops trong `packages/core/src/geometry/`.
- Cần thư viện Rig-Ready Templates chuẩn hóa tỷ lệ và tư thế (T-pose, A-pose).
- Ảnh nguồn từ AI cần tuân thủ bố cục để thuật toán landmark nhận diện chính xác nhất.

**Tham chiếu:** [AUTO_RIG.md](AUTO_RIG.md), [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md).

---

## ADR-009: Kiến trúc UI 2 chế độ (Setup / Animate), Command Bus và Hệ thống Icon chuẩn

**Trạng thái:** partially superseded by ADR-010 (phần 2 chế độ Setup/Animate bị thay thế bởi ADR-010; Command Bus và hệ thống Icon tiếp tục accepted)

**Bối cảnh:**
Phần mềm làm phim hoạt hình 2D/2.5D có khối lượng công cụ rất lớn (vẽ mesh, tạo xương,
weight paint, keyframe timeline, dopesheet, graph editor, scene layout, camera/lighting).
Nếu dồn vào một màn hình sẽ gây rối loạn giao diện và khó thao tác. Ngoài ra, AI qua MCP
và người dùng qua UI cần điều khiển chung một trạng thái. Cuối cùng, icon hệ thống (Windows/macOS/Linux)
gây phân mảnh giao diện và không đồng bộ cross-platform.

**Quyết định:**
1. Tách UI thành 2 chế độ làm việc cốt lõi (học hỏi từ Spine, Live2D, Rive, Moho):
   - **Setup Mode**: Dành riêng cho tạo asset, chỉnh layer, sinh mesh, đặt landmarks, gắn xương, vẽ weights, test pose.
   - **Animate Mode**: Dành riêng cho diễn hoạt timeline, dopesheet, curves/graph, đạo cụ, camera, ánh sáng và preview shot.
2. Tất cả thao tác UI (click button, kéo vertex, xoay bone, đặt keyframe) đều phát command qua Command Bus — hoàn toàn khớp với MCP tools của AI.
3. Chuẩn hóa Hệ thống Icon:
   - Ưu tiên 1: Dùng thư viện mã nguồn mở Lucide Icons (stroke outline 24×24, `currentColor`, ISC license).
   - Ưu tiên 2: Với công cụ đặc thù 2D animation mà thư viện thiếu, AI tự sinh SVG inline theo đúng spec hình học (viewBox 0 0 24 24, stroke-width 2, không dùng font/raster).
   - Tuyệt đối không dùng icon hệ điều hành native hoặc emoji.

**Lý do:**
- Giao diện trực quan, rõ ràng, không bị quá tải công cụ không liên quan đến giai đoạn làm việc.
- Đồng bộ tuyệt đối giữa thao tác của User (UI) và thao tác của AI (MCP) qua Command Bus.
- Đồng bộ hiển thị 100% trên cả Windows, Linux và Web mà không phụ thuộc font hệ thống.

**Hệ quả:**
- Cần triển khai state switcher giữa Setup Mode và Animate Mode trong `apps/editor/`.
- Mọi UI component phải map 1-1 với Application Command.
- Bộ icon được quản lý tập trung trong `apps/editor/src/ui/icons/`.

**Tham chiếu:** [UI_SPECIFICATION.md](UI_SPECIFICATION.md), [COMMAND_BUS.md](COMMAND_BUS.md), [MCP_TOOLS.md](MCP_TOOLS.md).

---

## ADR-010: Năm workspace chuyên biệt (Draw, Rig, Animate, Compose, Edit) thay thế kiến trúc hai chế độ Setup / Animate

**Trạng thái:** proposed

**Bối cảnh:**
Mô hình 2 chế độ Setup / Animate trong ADR-009 gom quá nhiều trách nhiệm vào mỗi chế độ:
Setup vừa vẽ layer, vừa nắn mesh, vừa gắn xương; Animate vừa diễn hoạt asset, vừa dàn cảnh
đa mặt phẳng, vừa lia camera và cắt dựng phim. Điều này khiến timeline bị trộn lẫn giữa key của
asset và shot, không hỗ trợ tốt luồng vẽ cel frame-by-frame, và làm lẫn lộn giữa bản gốc
(AssetDefinition) với bản thể hiện trong cảnh (AssetInstance).

**Quyết định:**
1. Thay thế mô hình 2 chế độ bằng 5 workspace chuyên biệt trong cùng một project:
   - `draw`: Vẽ raster, quản lý layer, cels, exposure sheet và onion skin.
   - `rig`: Biên tập mesh (thủ công/tự động giữ holes), khung xương, weights và test pose.
   - `animate`: Tạo và tinh chỉnh các AnimationClip tái sử dụng của asset (dope sheet, curves, cels).
   - `compose`: Dàn cảnh 2.5D đa mặt phẳng (multiplane), đặt AssetInstance, chỉnh đường đi camera và ánh sáng/bóng đổ với hai khung nhìn đồng thời (Stage Perspective/Top/Side và Final Camera View).
   - `edit`: Dựng phim hoàn chỉnh (Sequence, cắt ghép Shot, track audio, subtitle, và hàng đợi render/xuất video).
2. Giữ nguyên tính hợp lệ của Command Bus thống nhất và hệ thống Icon chuẩn (Lucide + custom SVG inline) từ ADR-009.

**Lý do:**
- Phân định rõ quyền sở hữu dữ liệu và ranh giới tác vụ giữa vẽ, tạo rig, diễn hoạt asset, dàn cảnh và dựng phim.
- Khắc phục triệt để việc trộn lẫn keyframe của nhân vật và keyframe camera/shot.
- Cho phép tái sử dụng clip trên nhiều instance với time offset khác nhau mà không sửa asset gốc.
- Phù hợp với toàn bộ quy trình làm phim 2.5D hoàn chỉnh từ asset đến video xuất bản.

**Hệ quả:**
- Bố cục UI, shell navigation và command routing được tổ chức lại quanh 5 workspace ID ổn định: `draw`, `rig`, `animate`, `compose`, `edit`.
- Timeline được module hóa thành 3 adapter chuyên biệt: Exposure sheet (`draw`), Clip dope sheet/curves (`animate`), và Sequence timeline (`edit`).
- Viewport hỗ trợ chế độ xem kép trong Compose (Stage 3D view và Camera framing view).
- ADR-009 được chuyển thành partially superseded (phần kiến trúc 2 chế độ bị thay thế, phần Command Bus và Icon được giữ nguyên).

**Tham chiếu:** [UI_SPECIFICATION.md](UI_SPECIFICATION.md), [PLAN.md](PLAN.md) mục 2 và 4, [PROJECT_FORMAT.md](PROJECT_FORMAT.md), [MODULE_MAP.md](MODULE_MAP.md).

---

## Template cho ADR mới

```markdown
## ADR-NNN: [Tiêu đề]

**Trạng thái:** proposed | accepted | superseded by ADR-XXX

**Bối cảnh:**
[Vấn đề cần giải quyết và các phương án.]

**Quyết định:**
[Phương án được chọn.]

**Lý do:**
[Tại sao chọn phương án này.]

**Hệ quả:**
[Ảnh hưởng tích cực và tiêu cực.]

**Tham chiếu:** [Link đến tài liệu liên quan.]
```
