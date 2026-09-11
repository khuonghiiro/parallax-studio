# Chiến lược kiểm thử

Trạng thái: đề xuất. Chưa có test suite chính thức ngoài quality gate đo dòng/file.
Tài liệu này đặt ra phân loại, chiến lược và tiêu chí cho từng loại test.

## 1. Phân loại test

```mermaid
flowchart LR
  U[Unit test] --> I[Integration test]
  I --> V[Visual / Snapshot test]
  V --> B[Benchmark]
  B --> E2E[End-to-end / Smoke]
```

| Loại | Phạm vi | Công cụ dự kiến | Tốc độ |
| --- | --- | --- | --- |
| Unit | Một hàm / class, không I/O | Vitest | < 1s per file |
| Integration | Nhiều module phối hợp | Vitest + mock I/O | < 5s per suite |
| Visual / Snapshot | So sánh render output | Vitest + canvas snapshot | < 10s per case |
| Benchmark | Đo hiệu năng | Vitest bench hoặc script | Chạy riêng |
| E2E / Smoke | App thật, MCP thật | Script + MCP client | Chạy riêng |

## 2. Test theo module

### 2.1 Core — Rig

| Test | Loại | Kiểm tra |
| --- | --- | --- |
| Valid hierarchy | Unit | Topological sort thành công cho tree hợp lệ |
| Cyclic detection | Unit | Reject bone hierarchy có chu kỳ |
| Weight normalization | Unit | Tổng weight per vertex = 1.0 ± 0.001 |
| Max influences | Unit | Reject > 4 bone per vertex |
| IK solver | Unit | Kết quả IK trong giới hạn, hội tụ |
| Bind/unbind | Integration | Thêm/xóa binding cập nhật đúng mesh và weights |

### 2.2 Core — Animation

| Test | Loại | Kiểm tra |
| --- | --- | --- |
| Keyframe interpolation | Unit | Linear, ease-in, ease-out, cubic cho kết quả đúng |
| Clip sampling | Unit | Lấy mẫu tại boundary, giữa, ngoài clip range |
| Time → frame mapping | Unit | `frameIndex / fps` cho mọi preset FPS |
| 120 FPS frame count | Unit | 1 giây → 120 frame, không trùng timestamp |
| Hold keyframe | Unit | Giữ giá trị giữa hai key cùng value |

### 2.3 Core — Deformation

| Test | Loại | Kiểm tra |
| --- | --- | --- |
| Deformation order | Integration | Warp → morph → skinning → transform cho kết quả đúng |
| Warp grid identity | Unit | Grid không offset → vertex không đổi |
| Morph topology guard | Unit | Reject morph giữa mesh khác topology |
| Morph additive | Unit | Hai morph targets cộng đúng |
| Preview = Export | Integration | Cùng time, cùng pipeline → cùng pose output |

### 2.4 Core — Views

| Test | Loại | Kiểm tra |
| --- | --- | --- |
| View selection | Unit | Góc → đúng view ID |
| Hysteresis | Unit | Lắc nhẹ quanh boundary không nhảy view |
| Missing view | Unit | Thiếu góc → cảnh báo, giữ view cũ |
| View switch updates | Integration | Đổi view → mesh, texture, shadow đều cập nhật |

### 2.5 Application — Command Bus

| Test | Loại | Kiểm tra |
| --- | --- | --- |
| Dispatch → state change | Unit | Command handler cập nhật state đúng |
| Undo/Redo | Integration | Inverse command khôi phục state |
| Batch atomicity | Integration | Lỗi giữa batch → rollback tất cả |
| Revision increment | Unit | Mỗi commit tăng revision lên 1 |
| Conflict detection | Unit | baseRevision không khớp → reject hoặc merge |
| Idempotent retry | Unit | Cùng commandId → không tạo entity trùng |

### 2.6 Runtime — Render

| Test | Loại | Kiểm tra |
| --- | --- | --- |
| Frame output size | Visual | Đúng resolution theo profile |
| Shadow follows pose | Visual | Bóng cập nhật khi pose thay đổi |
| Alpha silhouette | Visual | Bóng theo alpha, không phải hình chữ nhật |
| Normal map lighting | Visual | Normal map thay đổi phản ứng ánh sáng |

### 2.7 Export

| Test | Loại | Kiểm tra |
| --- | --- | --- |
| Frame count | Integration | N giây × F FPS = đúng số frame |
| Timestamp accuracy | Integration | Frame timestamps đều và chính xác |
| Encoder probe | Integration | Phát hiện NVENC, fallback software |
| Cancel job | Integration | Hủy → giải phóng buffer, không file corrupt |
| Resolution match | Integration | Output file đúng kích thước pixel |

### 2.8 MCP

| Test | Loại | Kiểm tra |
| --- | --- | --- |
| Tool → command mapping | Integration | MCP call → đúng application command |
| Schema validation | Unit | Input sai schema → lỗi rõ ràng |
| Idempotent import | Integration | Cùng requestId → cùng assetId |
| Batch execute | Integration | Nhiều tool trong batch → atomic |
| UI/MCP consistency | Integration | Cùng command từ UI và MCP → cùng state |

### 2.9 Asset Creation / Decomposition

| Test | Loại | Kiểm tra |
| --- | --- | --- |
| Layer alpha validity | Unit | Alpha thật (RGBA), không phải nền caro vẽ sẵn |
| Halo/fringe detection | Unit | Mép layer không có fringe từ nền cũ |
| Canvas alignment | Unit | Mọi layer cùng canvas size với ảnh gốc |
| Layer composite | Integration | Tất cả layer ghép lại khớp ảnh gốc (PSNR/SSIM) |
| Overlap coverage | Integration | Vùng nối (vai-thân, đùi-hông) có đủ pixel phủ |
| Occluded fill | Integration | Phần bị che đã vẽ bù, không lộ khoảng trống khi xoay bone |
| Part naming | Unit | Tên layer đúng quy ước (head, torso, left-arm...) |
| Pivot at joint | Unit | Pivot đặt tại khớp tự nhiên, không ở tâm bounding box |
| Draw order valid | Unit | Draw order hợp lệ, không trùng index |
| Import idempotent | Integration | Cùng source hash → không nhân đôi layer |
| Flatten rejection | Unit | Ảnh flatten (1 layer) → cảnh báo chưa tách |

### 2.10 Multi-View Consistency

| Test | Loại | Kiểm tra |
| --- | --- | --- |
| Height consistency | Unit | Chiều cao nhân vật giữa views sai khác ≤ 5% |
| Color palette match | Visual | Tông da, tóc, quần áo nhất quán (ΔE ≤ threshold) |
| Part name matching | Unit | Cùng tên bộ phận giữa mọi view của asset |
| Pivot alignment | Unit | Pivot cùng ý nghĩa (cổ, vai, hông) khớp vị trí tương đối |
| Draw order per view | Unit | Mỗi view có draw order riêng, hợp lệ |
| View angle label | Unit | Góc nhìn ghi đúng (front, quarter-left, side...) |
| Missing view warning | Unit | Thiếu góc bắt buộc → cảnh báo, không block |
| View switch pivot stable | Integration | Chuyển view không nhảy pivot hoặc lệch vị trí nhân vật |
| Costume consistency | Visual | Trang phục, phụ kiện, hoa văn nhất quán giữa views |
| Topology compatibility | Unit | Views dùng morph phải có cùng vertex count + indices |

### 2.11 Mesh Generation

| Test | Loại | Kiểm tra |
| --- | --- | --- |
| Contour from alpha | Unit | Alpha sạch → contour khớp silhouette, không lệch |
| Contour simplification | Unit | Douglas-Peucker giảm vertex nhưng PSNR contour ≥ threshold |
| Triangulation valid | Unit | Không degenerate triangles (area > 0), không overlap |
| UV mapping accuracy | Unit | UV coords khớp texture, không lệch pixel |
| Vertex density zones | Unit | Vùng khớp có nhiều vertex hơn vùng tĩnh |
| Edge loop placement | Integration | Edge loop tại vị trí khớp → deform mượt hơn khi test pose |
| Mesh density modes | Unit | low/medium/high cho vertex count trong khoảng dự kiến |
| Mesh preview render | Integration | Wireframe overlay đúng vị trí trên texture |
| Mesh refine additive | Integration | Thêm vertex ở vùng chỉ định không phá mesh hiện tại |
| Mesh validate pass | Unit | Mesh hợp lệ không có degenerate/overlap/UV lỗi |
| Contour fail on noise | Unit | Alpha bẩn (caro, fringe) → cảnh báo, không tạo mesh rác |

### 2.12 Auto-Rig

| Test | Loại | Kiểm tra |
| --- | --- | --- |
| Landmark minimum count | Unit | Thiếu landmarks bắt buộc → lỗi rõ ràng |
| Landmark duplicate | Unit | Hai landmarks cùng vị trí → cảnh báo |
| Auto-skeleton hierarchy | Unit | Skeleton sinh ra acyclic, bones có length > 0 |
| Bone symmetry | Unit | Left/right bones length sai khác ≤ 10% → OK, > 10% → cảnh báo |
| Auto-weights normalized | Unit | Tổng weight per vertex = 1.0 ± 0.001 |
| Auto-weights max influences | Unit | ≤ 4 bone per vertex |
| Layer-aware weights | Integration | Vertex thuộc layer arm bind vào arm bone, không spine |
| Auto-weights no orphan | Unit | Không có vertex với tất cả weights = 0 |
| Skeleton preview render | Integration | Skeleton overlay đúng vị trí trên nhân vật |
| Test pose after auto-rig | Integration | Xoay bone ±45° → deformation hợp lý, không rách |
| Landmark adjust → reskeleton | Integration | Sửa landmark → skeleton cập nhật đúng |

### 2.13 Rig-Ready Image Templates

| Test | Loại | Kiểm tra |
| --- | --- | --- |
| Template schema valid | Unit | Rig-Ready Template JSON hợp lệ, proportions đầy đủ |
| Proportions → landmarks | Unit | Proportions × image size → tọa độ pixel chính xác |
| Apply template one-step | Integration | `apply_rig_template` → landmarks + skeleton + weights |
| Template prompt includes hint | Unit | basePrompt + promptHint có trong brief sinh ảnh |
| Drag-adjust real-time | Integration | Kéo landmark → skeleton + weights cập nhật ngay |
| Drag does not reset others | Unit | Kéo 1 landmark không đổi vị trí landmarks khác |
| Chibi proportions different | Unit | Template chibi head ≈ 35% height, khác humanoid |
| Template mismatch warning | Unit | Ảnh không khớp tỷ lệ template → cảnh báo |
| Template list includes defaults | Unit | list_rig_templates trả ≥ 6 templates mặc định |

### 2.14 Animation Templates

| Test | Loại | Kiểm tra |
| --- | --- | --- |
| Template schema valid | Unit | Template JSON hợp lệ, có đủ required fields |
| Template skeleton match | Unit | Template humanoid chỉ áp lên skeleton humanoid |
| Retarget scale | Unit | Nhân vật to hơn → translation scale tỷ lệ |
| Missing bone fallback | Unit | Bone trong template không có → giữ rest pose |
| Extra bone untouched | Unit | Bone trong nhân vật không trong template → rest pose |
| Loop animation | Integration | Loopable template: frame cuối = frame đầu (smooth) |
| Template preview | Integration | Áp template → preview animation đúng |
| Template adjust | Integration | Sửa keyframe sau áp → lưu đúng, undo hoạt động |

## 3. Test contract: Preview = Export

Đây là test quan trọng nhất cho tính nhất quán. Phương pháp:

1. Tạo scene có rig, animation, camera, light.
2. Render frame tại `time = T` bằng preview pipeline.
3. Render frame tại `time = T` bằng export pipeline.
4. So sánh pixel output:
   - Vị trí mesh: identical.
   - Màu sắc: cho phép sai khác anti-aliasing ≤ 2 pixel ở mép.
   - Shadow: cùng vị trí và hình dáng.

Test này phải chạy cho ít nhất 3 time points khác nhau (đầu, giữa, cuối clip).

## 4. Benchmark protocol

### Hardware chuẩn

- GPU: NVIDIA RTX 3060 12 GB VRAM
- Ghi kèm: CPU, RAM, driver version, OS

### Workload tham chiếu

Theo PLAN mục 7:
- 10 nhân vật có rig (mỗi nhân vật ~50 bone, ~20 morph targets)
- 20 layer và đạo cụ
- 1 đèn đổ bóng
- Camera orthographic

### Metrics cần đo

| Metric | Preview | Export |
| --- | --- | --- |
| Frame time p50 | ✅ | ✅ |
| Frame time p95 | ✅ | ✅ |
| Total render time | — | ✅ |
| Encode time | — | ✅ |
| RAM usage | ✅ | ✅ |
| VRAM usage | ✅ | ✅ |
| Encoder used | — | ✅ (NVENC / software) |

### Quy tắc báo cáo

- Không suy hiệu năng từ VRAM specification đơn thuần.
- Không gọi export offline là "preview 4K/120 thời gian thực".
- Ghi rõ driver version vì NVENC capabilities phụ thuộc driver.
- Benchmark Windows và Linux riêng biệt.

## 5. CI pipeline

### Gate chặn merge (required)

1. **Source limits**: `node scripts/quality/check-source-limits.mjs`
   — Không file > 800 dòng, không dòng > 120 ký tự.
2. **TypeScript strict**: `tsc -b --noEmit`
   — Không lỗi type.
3. **Unit + Integration tests**: `vitest run`
   — Tất cả pass.
4. **Prettier check**: `prettier --check .`
   — Format đúng.

### Gate cảnh báo (advisory)

5. **Import graph check**: Kiểm tra dependency boundaries theo module map.
6. **Clone detection**: Phát hiện code trùng lặp.
7. **Benchmark regression**: So sánh frame time với baseline.

### Chưa triển khai trong lượt này

- ESLint config cho dự án.
- Import boundary checker tự động.
- Clone detector (jscpd hoặc tương đương).
- CI runner (GitHub Actions / GitLab CI).

Xem [CODING_RULES.md](CODING_RULES.md) mục 6 cho danh sách đầy đủ gate dự kiến.

## 6. Cross-platform testing

| Hệ điều hành | Kiểm tra thêm |
| --- | --- |
| Windows | NVENC driver, đường dẫn có dấu cách/Unicode, atomic write trên NTFS |
| Linux | Mesa/NVIDIA driver, file permissions, FFmpeg binary path |

- Không suy một OS đã đạt từ OS còn lại.
- Test cùng workload tham chiếu trên cả hai.
- Ghi rõ OS version, GPU driver version trong báo cáo.

## 7. Test file organization

```text
tests/
  unit/
    rig/
      hierarchy.test.ts
      weights.test.ts
    animation/
      interpolation.test.ts
      sampling.test.ts
    deformation/
      warp.test.ts
      morph.test.ts
      pipeline-order.test.ts
    asset/
      layer-alpha.test.ts
      canvas-alignment.test.ts
      part-naming.test.ts
      pivot-placement.test.ts
      draw-order.test.ts
    views/
      view-selection.test.ts
      height-consistency.test.ts
      pivot-alignment.test.ts
      topology-compatibility.test.ts
  integration/
    command-bus.test.ts
    preview-export-consistency.test.ts
    mcp-tools.test.ts
    export-pipeline.test.ts
    layer-composite.test.ts
    overlap-coverage.test.ts
    view-switch-stability.test.ts
  visual/
    shadow-accuracy.test.ts
    render-output.test.ts
    color-palette-match.test.ts
    costume-consistency.test.ts
  benchmark/
    preview-frametime.bench.ts
    export-throughput.bench.ts
```

Test files thuộc cùng quy tắc source limits: tối đa 800 dòng, đọc được.
Test dài chia theo test case, không dồn vào một file.

## 8. Liên kết

- [PLAN.md](PLAN.md) mục 7 — mốc nghiệm thu và test quan trọng
- [RENDER_PROFILES.md](RENDER_PROFILES.md) mục 6 — tiêu chí chấp nhận render
- [CODING_RULES.md](CODING_RULES.md) mục 6 — gate tự động
- [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md) mục 7 — test contract
- [COMMAND_BUS.md](COMMAND_BUS.md) — test undo/redo và batch
- [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) — luồng tách thành phần và tạo bộ góc
