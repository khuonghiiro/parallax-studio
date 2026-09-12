# Chiến lược kiểm thử studio vẽ và dựng phim

Trạng thái: đề xuất nâng cấp 12/09/2026. Source đã có unit/integration tests trong
packages và `tests/mcp.integration.ts`; chưa đủ bằng chứng cho workflow studio
mới. Tài liệu này xác định test cần bổ sung, không tuyên bố chúng đã pass.

## 1. Tầng kiểm tra và bằng chứng

| Tầng | Phạm vi | Bằng chứng cần lưu |
| --- | --- | --- |
| Unit | Drawing, time, rig, geometry, dependency, composition thuần | Fixtures, invariant và kết quả xác định |
| Integration | Command, media, transaction, persistence, service/MCP | State/revision, side effects, lỗi và recovery |
| UI workflow | Bút/chuột/phím, panels, timelines, composition | Recording hoặc trace; không chỉ screenshot đẹp |
| Visual | Cel alpha, mesh bend, light/shadow, camera và export | Golden theo renderer, tolerance đã giải thích |
| Hardware | Windows/Linux, RTX 3060 12 GB, encoder | OS/driver/backend, workload, p50/p95, RAM/VRAM |
| E2E | Vẽ→rig→clip→compose→sequence→video, có MCP | Project fixture mở lại được và media probe |

Các test mới phải bảo vệ hành vi thật, không chỉ kiểm tra nút tồn tại hoặc mock
mọi thuật toán. Một task chỉ chạy checks liên quan; release chạy đầy đủ workflow
đã cam kết. Không coi không có test là feature đạt nghiệm thu.

## 2. Drawing, exposure và tablet

- Tạo DrawingDocument với raster/group/mask/reference layers; reorder, merge có
  preview, lock, clipping và opacity giữ alpha đúng sau save/reopen.
- Brush/eraser/fill/selection-transform tác động đúng cel/layer và tôn trọng mask,
  lock. Raster kết quả dùng cùng semantics qua UI và MCP.
- Stroke 200 pointer samples chỉ tạo một transaction/undo entry; undo/redo khôi
  phục pixels. Cancel, pointer capture loss, chuyển tab hoặc mất focus không để
  stroke nửa chừng. Kiểm tra cả bút pressure và chuột không pressure.
- Pressure/tilt capability không hỗ trợ phải có fallback rõ. Calibration test gồm
  pan/zoom/rotation, high DPI, nhanh/chậm, palm/touch policy; không suy ra tablet
  latency từ thời gian dispatch command.
- Linked cel sửa mọi exposure dùng cùng ID; duplicate cel sửa độc lập. Hold, blank,
  insert/delete/ripple exposure đúng duration; không chồng exposure trong layer.
- Onion skin chỉ preview; một giây vẽ 12 cel tại 12 FPS vẫn là 12 cel khi xuất 60
  hoặc 120 FPS, camera chuyển động giữa các exposure vẫn lấy mẫu theo output FPS.
- Tile delta undo có bounded memory; nhiều stroke không giữ texture/worker rác.

## 3. Assembly, mesh, rig và dependency

| Fixture | Invariant |
| --- | --- |
| Part layer assembly | Pivot và world transform ổn định khi reparent; cycle bị từ chối |
| Contour holes/concavity/islands | Mesh giữ silhouette, hole không bị lấp; không triangle ngoài miền |
| Degenerate/self-intersecting contour | Diagnostic rõ; không crash hoặc silently publish mesh |
| Mesh editing | Add/delete/move vertex, edge và density sửa đúng vùng; UV không nhảy bất ngờ |
| Rigid/skinned parts | Rigid theo bone; skinned có rest/bind đúng, tối đa 4 influence |
| Weights | Giữ top 4 trước normalize; tổng 1 ± 0.001; zero/orphan/nonfinite báo lỗi |
| Joint pose suite | Gập elbow/knee, twist/tail và extreme pose không flip triangle ngoài ngưỡng fixture |
| Rest pose / IK | Rest matrix/inverse bind đúng; hierarchy acyclic, giới hạn IK rõ |
| Remesh / change bone rest | Báo stale weights/morph/clip, preview rebind, cancel giữ bản cũ |
| Asset source replacement | IDs giữ khi tương thích, report nơi dùng; không tự xóa track mất target |

Dùng silhouette có lỗ, tay chồng thân, chi hẹp, lông/tóc alpha và animal để tránh
chỉ test nhân vật demo thuận lợi. Test landmark template keys/version chung
UI/MCP. Mức tự động thành công phải đo; không coi contour heuristic là hiểu anatomy.

## 4. Clip và ba miền thời gian

- AnimationClip mở/sửa ở animate không cần composition. Tạo walk, blink độc lập;
  auto-key tắt không ghi pose, test pose không sửa rest pose.
- Hai instance dùng một clip ở offset/rate khác nhau; sửa placement không sửa
  source hoặc instance khác. Edit Clip cập nhật nơi dùng có báo; Make Unique tách ID.
- Key/curve interpolation, step/hold, channel masks, blend, loop seam, clip trim
  và root motion đúng. Không áp world travel hai lần.
- Exposure grid, film ticks và output samples chuyển đổi qua một owner. Half-open
  interval kiểm ở trước/bằng/sau biên. Không duplicate frame cuối.
- Rate hữu tỉ, source-in offset, negative/zero invalid speed và export range không
  align đều có hành vi xác định. Không round silently.
- Preview/export tại cùng timestamp có cùng cel ID, key values, pose/vertex,
  camera matrix, shot và subtitle/audio timing.

## 5. Composition và sequence

- Lắp tối thiểu foreground/midground/background, character và prop ở depth planes;
  drag/drop, parenting, pivot, snapping, visibility/lock giữ đúng khi mở lại.
- Perspective camera route pan/dolly/aim qua các lớp tạo parallax thật. Orthographic
  không tự scale theo Z. Nếu dùng artistic parallax, test operator được lưu rõ.
- Split stage/camera views chọn cùng object; camera framing, safe area, path handles
  và keyframe editing không ghi nhầm camera preview vào camera phim.
- Hai shot của cùng composition dùng camera khác; sequence trim/ripple/cut/dissolve
  không đổi asset hoặc clip nguồn. Thiếu transition handles phải báo.
- Audio sample range/rate, gain/fade và subtitle intervals đúng sau cut/retime;
  mute/solo preview có scope rõ. Scrub không nhân đôi audio source.
- Export selection/range giữ đúng start/end, shot order, transitions và sync.
  Save/reopen giữ mọi dependency, kể cả reusable library đã tách project nguồn.

## 6. Command, MCP và khôi phục

- UI/MCP cùng payload tạo cùng state, diagnostics, revision và undo behavior.
- Một transaction/batch commit tăng revision một lần; save/query/preview không
  tăng content revision. Stroke/drag commit một lần; lỗi batch không partial publish.
- ID retry cùng payload trả kết quả cũ; ID giống payload khác bị từ chối. Reconnect
  query revision/job trước retry, không tạo bản sao asset/stroke/clip/shot.
- Stale base revision, missing/stale/incompatible target trả structured error có
  owner/ID và hướng rebind; không apply nhầm selection đang mở ở UI.
- MCP biết active document/workspace capability, có explicit target IDs cho write;
  contextual selection chỉ là gợi ý. Tool preview trả ảnh/resource và diagnostics
  để AI tự kiểm tra. Không mặc định chức năng UI nào cũng có tool đã hoạt động.
- Job timeout/disconnect/cancel/resume không bỏ process/texture/upload rác; completed
  job trỏ artifact thật, không chỉ URL preview hoặc status thành công.
- Kiểm canonical path, symlink/root escape, MIME/dimensions/quotas, corrupt media,
  import chunk replay và shell-argument injection.
- Crash injection trước/sau generation publish và trong migration giữ một project
  nhất quán; backup không bị ghi đè. Save concurrent edit vẫn dirty đúng revision.

## 7. Visual parity và render output

Chọn cùng snapshot revision, source hashes, quality/profile và timestamp; so sánh
cel/pose/vertex/camera state chính xác hoặc tolerance số đã định nghĩa. Pixel image
dùng golden riêng theo renderer/backend cùng tolerance perceptual/alpha-edge;
không yêu cầu byte-identical giữa GPU/driver khác nhau.

Test mốc đầu/giữa/cuối và mọi boundary clip/exposure/shot. Bao gồm alpha silhouette
shadow, deformed mesh shadow, transparency sorting, normal color-space và camera
route; overlay selection/onion skin/gizmo không xuất vào phim.

Probe output thật: dimensions, codec, pixel format/color tags, total frames,
timestamps, audio sample count và A/V duration. 2K phải ghi preset chính xác
2560×1440 hoặc 2048×1080; 4K UHD là 3840×2160. Test 60/120 FPS riêng từng preset;
120 FPS output không hứa render real-time. Khi encoder không hỗ trợ, báo fallback
và profile kết quả rõ, không âm thầm hạ FPS/resolution.

## 8. Benchmark và usability

Baseline gồm: canvas 2048×2048 với 20 layer/100 cel; asset 20 parts với 50 bones;
composition 10 rigged instances + 20 props + 3 depth planes + 1 shadow light;
sequence 60 giây có 3 shot, audio và subtitle. Đây là workload đề xuất để đo,
không là giới hạn sản phẩm hoặc số hiệu năng đã đạt.

Ghi OS, CPU, driver, GPU backend, viewport resolution và chất lượng trước đo.
Đo pointer-to-visible latency p50/p95, frame time p50/p95, dropped preview frames,
mesh/rebind duration, peak RAM/VRAM, export throughput và cancellation latency.
Mục tiêu ban đầu preview 60 FPS tương ứng 16.7 ms/frame; giới hạn latency/memory
cuối phải chốt sau spike. Regression >10% so baseline cùng máy cần phân tích.
Đo Windows và Linux riêng; kết quả một máy không chứng nhận mọi môi trường.

Usability test cho người mới hoàn thành: vẽ 3 cel/hold; lắp 5 part/gắn rig; lưu
2 clip; dựng 3 depth planes/camera route; cắt 2 shot và xuất video. Ghi task success,
thời gian, lỗi chọn nhầm context và thao tác cần trợ giúp. Kiểm keyboard, focus,
disabled/error/empty, resizing và high DPI. Tablet cần test thiết bị thật.

## 9. Gate và nguồn lệnh

Các lệnh đã khai báo cần chạy theo scope và báo kết quả thật:

```sh
node scripts/quality/check-source-limits.mjs
node --test scripts/quality/source-limits.test.mjs
node scripts/quality/check-doc-sync.mjs
node --test scripts/quality/doc-sync.test.mjs
npm run check
npm test
npm run test:mcp
```

Không gọi script benchmark/UI E2E là đã tồn tại nếu chưa kiểm file. Lưu unit test
cạnh owner như source hiện có; E2E fixtures/recordings tách khỏi production.
Mỗi source test tối đa 800 dòng. Dependency/duplicate checks, visual fixtures,
tablet và hardware tests là hạng mục bổ sung có owner; không chỉ viết vào DoD rồi
coi đã enforced. Gate tài liệu so revision/hash/tokens không chứng minh bản dịch đúng nghĩa.

Tham chiếu: [PLAN.md](PLAN.md), [PROJECT_FORMAT.md](PROJECT_FORMAT.md),
[MODULE_MAP.md](MODULE_MAP.md), [UI_SPECIFICATION.md](UI_SPECIFICATION.md),
[COMMAND_BUS.md](COMMAND_BUS.md), [MCP_TOOLS.md](MCP_TOOLS.md),
[AUTO_RIG.md](AUTO_RIG.md), [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md),
[RENDER_PROFILES.md](RENDER_PROFILES.md), [CODING_RULES.md](CODING_RULES.md).
