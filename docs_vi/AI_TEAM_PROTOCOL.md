# Giao thức làm việc của team AI

## 1. Mục tiêu

Team AI giúp Parallax Studio xử lý các task lớn theo nhiều chuyên môn mà vẫn có
một kiến trúc, một nguồn logic và một người chịu trách nhiệm tích hợp. Việc chia
agent nhằm giảm context và chạy song song phần độc lập; không nhằm tạo nhiều bản
triển khai cạnh tranh nhau.

Lead Agent chịu trách nhiệm cuối cùng về phạm vi, thứ tự phụ thuộc, contract,
tích hợp, kiểm tra và báo cáo cho người dùng.

## 2. Khi nào chia team

Nên giao cho specialist khi có ít nhất một trong các điều kiện:

- Task có từ hai phần độc lập, không sửa cùng file.
- Cần nghiên cứu chuyên sâu song song với phần triển khai.
- Thay đổi có rủi ro cao và cần reviewer độc lập.
- Cần kiểm chứng trên nhiều lớp như core, UI, MCP, desktop hoặc export.

Lead tự xử lý khi task nhỏ, chỉ có một owner, hoặc các bước phụ thuộc tuần tự đến
mức chia agent không giúp nhanh hay chính xác hơn.

Không mặc định gọi toàn bộ specialist. Số agent đồng thời phải phù hợp với task
và giới hạn của host; ưu tiên tối đa ba specialist hoạt động cùng Lead.

## 3. Vai trò

### `product-spec`

Sở hữu luồng người dùng, kịch bản thành shot, tiêu chí nghiệm thu, project format
và nội dung đặc tả gốc trong `docs_vi/`. Không triển khai UI hoặc thuật toán.

### `graphics-animation`

Sở hữu geometry, contour, triangulation, rig hierarchy, bind pose, weights, IK,
view selection, animation sampling, deformation, camera/light và runtime Three.js.
Không tạo command hoặc schema cạnh tranh với `contracts` và `application`.

### `editor-ux`

Sở hữu React editor, viewport interaction, timeline, asset/rig panels, design
system, keyboard workflow và accessibility. Không đặt business rule hoặc HTTP
parsing trực tiếp trong component.

### `application-mcp`

Sở hữu Application Service, Command Bus, transaction, revision, history, job,
ports, service transport, MCP tools/resources và image handoff orchestration.
Không viết lại thuật toán rig, animation hoặc renderer.

### `desktop-export`

Sở hữu Tauri/Rust shell, sidecar lifecycle, renderer transport, FFmpeg, NVENC,
GPU readback, resource limits, đóng gói và kiểm tra Windows/Linux. Không giữ một
bản project state hay animation sampler riêng.

### `qa-reviewer`

Review độc lập về correctness, regression, security, performance, resource leak,
dependency boundary và test coverage. Mặc định chỉ đọc source; chỉ sửa tooling
hoặc test khi Lead giao write scope rõ ràng.

### `spec-translator`

Dịch trung thành `docs_vi/` sang `docs/`, kiểm tra thuật ngữ và cập nhật manifest.
Không thay đổi quyết định sản phẩm, số liệu, schema hoặc trạng thái ADR.

### Ranh giới owner mặc định của kiến trúc đích

| Vai trò | Vùng mặc định |
| --- | --- |
| Lead | Public contract trong `packages/contracts/`, ADR và tích hợp cuối |
| `graphics-animation` | `packages/core/`, `packages/runtime/` |
| `editor-ux` | `apps/editor/` |
| `application-mcp` | `packages/application/`, `apps/mcp/`, phần service ngoài renderer/encoder, `image-handoff/` |
| `desktop-export` | `apps/desktop/`, adapter renderer/encoder, cấu hình sidecar và packaging |
| `qa-reviewer` | Review source; `tests/`, `scripts/quality/` hoặc CI khi được giao |
| `product-spec` | Nội dung sản phẩm và contract đề xuất trong `docs_vi/` |
| `spec-translator` | Cặp file trong `docs/` và manifest sau khi bản Việt ổn định |

Đây là owner mặc định, không tự cấp quyền sửa. Task packet phải thu hẹp thành danh
sách file hoặc thư mục cụ thể. Với source cũ trong `src/`, `shared/` và `engine/`,
dùng `AGENTS.md` gần nhất và Lead chọn một owner theo logic thực tế của file.

## 4. Task packet bắt buộc

Mỗi nhiệm vụ giao cho specialist phải có:

```text
Objective
Owned files or directories
Required documents
Public contracts involved
Acceptance criteria
Verification commands
Files that must not change
Expected result report
```

Nếu task packet không cấp write scope, agent chỉ được nghiên cứu và review.

## 5. Quyền sở hữu và thứ tự phụ thuộc

1. Một file chỉ có một write owner tại một thời điểm.
2. Không chia cùng một business rule cho nhiều agent triển khai.
3. Contract, schema và ADR dùng chung phải được chốt trước phần phụ thuộc.
4. Agent phát hiện cần đổi contract phải báo Lead; không tự sửa ngoài write scope.
5. Trong shared workspace, chỉ chạy song song các edit không giao nhau. Dùng
   worktree riêng khi host hỗ trợ và việc merge có lợi.
6. Specialist không tự sinh agent con trừ khi task packet cho phép rõ ràng.
7. QA không sửa source của specialist trong khi phần đó còn đang được viết.

## 6. Bàn giao và tích hợp

Kết quả specialist phải báo:

- file đã đọc và file đã thay đổi;
- quyết định hoặc contract đã dựa vào;
- kiểm tra đã chạy và kết quả thật;
- giả định, hạn chế và rủi ro còn lại;
- thay đổi ngoài scope cần Lead xử lý.

Lead phải đọc diff, kiểm tra trùng logic và dependency, giải quyết phản hồi của
reviewer, chạy verification tích hợp và chỉ sau đó báo hoàn thành.

## 7. Áp dụng theo thư mục

Mỗi thư mục source có thể có `AGENTS.md` ngắn mô tả trách nhiệm, dependency được
phép, invariant và lệnh kiểm tra của miền. Trước khi sửa file, agent phải đọc
root `AGENTS.md` và `AGENTS.md` gần file mục tiêu nhất.

Không sao chép toàn bộ root, skill hoặc tài liệu kiến trúc vào scoped file. Khi
module đích trong `apps/` hoặc `packages/` chưa tồn tại, không tạo thư mục rỗng
chỉ để đặt hướng dẫn; thêm scoped `AGENTS.md` cùng lúc tạo module thật.

## 8. Khi host không hỗ trợ subagent

Lead lần lượt áp dụng role charter tương ứng, vẫn giữ nguyên ranh giới owner,
task packet, self-review và verification. Kết quả không được thay đổi chỉ vì
runtime không có khả năng chạy agent song song.
