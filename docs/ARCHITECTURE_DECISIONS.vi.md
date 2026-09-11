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

**Tham chiếu:** [PLAN.vi.md](PLAN.vi.md) mục 1, 9.

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

**Tham chiếu:** [PLAN.vi.md](PLAN.vi.md) mục 3, 4.

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

**Tham chiếu:** [IMAGE_WORKFLOW.vi.md](IMAGE_WORKFLOW.vi.md),
[PLAN.vi.md](PLAN.vi.md) mục 5.

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

**Tham chiếu:** [PLAN.vi.md](PLAN.vi.md) mục 3.

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

**Tham chiếu:** [PLAN.vi.md](PLAN.vi.md) mục 6,
[DEFORMATION_PIPELINE.vi.md](DEFORMATION_PIPELINE.vi.md) mục 7.

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

**Tham chiếu:** [PLAN.vi.md](PLAN.vi.md) mục 3.

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

**Tham chiếu:** [RENDER_PROFILES.vi.md](RENDER_PROFILES.vi.md) mục 2.

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
