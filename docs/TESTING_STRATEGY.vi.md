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

Xem [CODING_RULES.vi.md](CODING_RULES.vi.md) mục 6 cho danh sách đầy đủ gate dự kiến.

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
  integration/
    command-bus.test.ts
    preview-export-consistency.test.ts
    mcp-tools.test.ts
    export-pipeline.test.ts
  visual/
    shadow-accuracy.test.ts
    render-output.test.ts
  benchmark/
    preview-frametime.bench.ts
    export-throughput.bench.ts
```

Test files thuộc cùng quy tắc source limits: tối đa 800 dòng, đọc được.
Test dài chia theo test case, không dồn vào một file.

## 8. Liên kết

- [PLAN.vi.md](PLAN.vi.md) mục 7 — mốc nghiệm thu và test quan trọng
- [RENDER_PROFILES.vi.md](RENDER_PROFILES.vi.md) mục 6 — tiêu chí chấp nhận render
- [CODING_RULES.vi.md](CODING_RULES.vi.md) mục 6 — gate tự động
- [DEFORMATION_PIPELINE.vi.md](DEFORMATION_PIPELINE.vi.md) mục 7 — test contract
- [COMMAND_BUS.vi.md](COMMAND_BUS.vi.md) — test undo/redo và batch
