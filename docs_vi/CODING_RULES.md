# Quy tắc mã nguồn Parallax Studio

Đây là nguồn quy tắc chung cho AI và người sửa code trong dự án. Quy tắc do người
dùng yêu cầu có hiệu lực ngay; kiến trúc sản phẩm còn là đề xuất chờ duyệt.

File này là bản tiếng Việt gốc. Bản dịch cho AI nằm tại
`docs/CODING_RULES.md`; thay đổi phải đồng bộ theo
[chính sách tài liệu](DOCUMENTATION_POLICY.md).

## 1. Giới hạn file và trách nhiệm

- File source viết tay không được vượt **800 dòng vật lý**.
- Tính cả dòng trống/comment. Ký tự xuống dòng kết thúc file không tạo thêm
  một dòng trống giả; các dòng trống thực tế vẫn được tính.
- Áp dụng cho app, backend, MCP, test, script, shader và cấu hình viết tay.
- Dependency, output build, lockfile và code sinh tự động không chỉnh tay.
  Exclusion phải có nguồn sinh và vị trí rõ, không dùng để giấu code nghiệp vụ.
- Khoảng 400–500 dòng là tín hiệu xem lại trách nhiệm, không phải mức phải đạt.
- Chia theo nhiệm vụ: `camera-controller.ts`, `shadow-pass.ts`, `texture-cache.ts`.
  Không chia thành `part1.ts`, `part2.ts` chỉ để giảm số dòng.
- File chung lớn phải chia tiếp theo miền và public API. Không dồn các nghiệp vụ
  không liên quan vào `utils.ts`, `helpers.ts`, `common.ts` hoặc `manager.ts`.

## 2. Dễ đọc là bắt buộc

- Mỗi statement trên một dòng; thân hàm, if/else và vòng lặp có block nhiều dòng.
- Callback thuần một phép như `(node) => node.id` được viết gọn. Callback nhiều
  bước phải dùng block nhiều dòng hoặc hàm có tên.
- Không dồn nhiều khai báo state, biến hoặc hook vào một dòng.
- JSX nhiều thành phần phải xuống dòng, tách component theo trách nhiệm.
- Không lồng ternary. Dùng guard clause hoặc biến có tên cho điều kiện phức tạp.
- Không đặt type object dài trong generic/call site. Type dùng nhiều nơi thuộc
  contract hoặc miền sở hữu, không khai báo lại cho từng caller.
- Tên mô tả ý nghĩa: `asset`, `sceneNode`, `frameIndex`, `requestBody`; tránh
  `a`, `n`, `s`, `p` trong nghiệp vụ. Tên ngắn được dùng trong toán học/loop rõ ngữ cảnh.
- Comment giải thích vì sao, đơn vị, hệ tọa độ, ownership hoặc giới hạn;
  không chỉ đọc lại câu lệnh.
- Public API có return type rõ; không dùng `any`, ép kiểu hoặc non-null assertion
  để che lỗi thiết kế. Xử lý trạng thái thiếu dữ liệu tường minh.

Ví dụ phong cách chấp nhận được (minh họa, chưa phải API đã triển khai):

```ts
import type { SessionInfo } from '@parallax/contracts/session';
import type { HttpClient } from '../transport/http-client';

export class SessionClient {
  private token: string | null = null;

  constructor(private readonly httpClient: HttpClient) {}

  async connect(): Promise<SessionInfo> {
    const session = await this.httpClient.get<SessionInfo>('/api/session');

    this.token = session.token;

    return session;
  }

  getToken(): string | null {
    return this.token;
  }
}
```

`SessionInfo` có một định nghĩa trong contracts. `HttpClient` sở hữu HTTP, parse
lỗi và timeout. `SessionClient` giữ token theo từng instance, không dùng global
token chung cho nhiều session. File HTTP lớn thì chia `response-parser.ts`,
`request-errors.ts` theo chức năng; không tạo nhiều bản HTTP client.

Bố cục thông thường: imports → type cục bộ → constant → public API → private helper.
Component giữ phần props/state/effect/handler/render dễ tìm. Helper có thể đặt dưới
public API nếu cơ chế khai báo cho phép; tránh thứ tự gây lỗi khởi tạo.

## 3. Nơi sở hữu logic chung

Trước khi viết, dùng `rg` tìm implementation, hành vi và caller tương tự.

| Logic | Nơi sở hữu dự kiến |
| --- | --- |
| Schema/DTO/protocol enum | `packages/contracts/src/<domain>/` |
| Toán xương, weight, IK | `packages/core/src/rig/` |
| Keyframe, easing, clip sampling | `packages/core/src/animation/` |
| Chọn góc và topology compatibility | `packages/core/src/views/` |
| Warp/morph và pose composition | `packages/core/src/deformation/` |
| Mesh/material/shadow/GPU resources | `packages/runtime/src/<domain>/` |
| Command, revision, transaction, undo | `packages/application/src/` |
| HTTP/session và API transport | `apps/editor/src/services/` |
| UI riêng một tính năng | `apps/editor/src/features/<feature>/` |
| UI thuần dùng nhiều nơi | `apps/editor/src/ui/` |
| MCP schema mapping/tool handler | `apps/mcp/src/tools/` |
| File, process và service adapter | `apps/service/src/adapters/` |

Quan hệ phụ thuộc nằm trong [module map](MODULE_MAP.md). Đây là đường dẫn đề xuất;
không tạo folder rỗng hoặc di chuyển file khi nhiệm vụ chỉ là lập kế hoạch.

## 4. Không trùng lặp nghiệp vụ

- Một nghiệp vụ/thuật toán có một nơi triển khai; caller dùng public API/transport.
- Browser và export cùng pose evaluator, easing và thứ tự deform.
- Không chép schema TypeScript sang Rust bằng tay. Nếu native cần schema,
  sinh từ cùng nguồn và kiểm thử compatibility.
- Trích xuất phần thực sự có cùng ý nghĩa. Không ép hai hành vi khác nhau vào
  helper nhiều cờ boolean chỉ vì vài dòng nhìn giống nhau.
- Helper nằm tại phạm vi hẹp nhất có các caller thực tế. Chỉ nâng thành package
  khi có nhu cầu dùng chung rõ ràng.
- Adapter có thể khác theo OS/transport, nhưng không chứa bản sao rig/timeline.
- Clone detector chỉ hỗ trợ; review phải tìm cả trùng lặp về ý nghĩa.
  Không kết luận “0 duplicate” chỉ từ một scan.

## 5. Ranh giới và invariant

- Core không import React, DOM, Three.js, Node I/O, MCP hoặc Tauri.
- Runtime không gọi UI/MCP. UI/MCP không sửa project bằng đường đi riêng.
- Sửa scene qua application command bus; lưu thành công mới xác nhận.
- Schema không thay thế kiểm tra revision, ID reference, chu kỳ xương,
  weight/topology và trạng thái job.
- Đơn vị, hướng trục, local/world/UV và thứ tự deform phải tường minh.
- Texture, geometry, worker, listener và session có lifecycle/dispose rõ.
- Không dựng lại geometry hoặc cả React tree mỗi frame nếu dữ liệu không đổi.
- Export có snapshot revision, progress, cancellation và lỗi đọc được.

## 6. Format và gate tự động

Cấu hình đã chuẩn bị: `.editorconfig`, `.prettierrc.json`, `rustfmt.toml`.
Prettier print width 100 là mục tiêu format, không phải giới hạn cứng.
Dòng source vượt 120 ký tự cần chỉnh; literal đặc biệt không ngắt hợp lý cần lý do
và exemption hẹp được review, không bỏ kiểm tra cả file.

Công cụ hiện có, không cần dependency:

```sh
node scripts/quality/check-source-limits.mjs
node --test scripts/quality/source-limits.test.mjs
node scripts/quality/check-doc-sync.mjs
node --test scripts/quality/doc-sync.test.mjs
```

- Hơn 800 dòng/file làm check thất bại.
- Dòng source dài hơn 120 ký tự được báo và làm check thất bại.
- Doc-sync kiểm tra đủ cặp file, revision, review status và hash hiện hành.
- Check này không kiểm tra syntax, semantic duplicate, import boundary hay toàn bộ style.

Khi triển khai mốc 0, bổ sung dependency khóa phiên bản và gate sau:

1. Prettier check cho TS/TSX/JS/JSON/CSS, rustfmt cho Rust, formatter Python nếu cần.
2. ESLint, TypeScript strict, kiểm tra control flow và unused code.
3. Import graph/module boundary và vòng phụ thuộc.
4. Clone detection cho khối code sao chép, kèm review về ý nghĩa.
5. Test theo thay đổi; integration UI/MCP cùng command, preview/export cùng pose.
6. CI chạy gate trước khi chấp nhận thay đổi; không tắt rule để làm CI xanh.

Chưa cài formatter/linter/clone detector hoặc nối đầy đủ CI trong lượt lập kế hoạch.
Không báo các công cụ này đã chạy. Mã nháp cũ còn fail readability; nhiệm vụ planning
chỉ báo kết quả, không tự chuyển thành một đợt refactor toàn app.

## 7. Luồng làm việc của AI

1. Đọc `AGENTS.md`, kế hoạch và module map; xác định scope được giao.
2. Tìm nơi sở hữu logic và caller trước khi tạo file.
3. Chọn public API/đường phụ thuộc; chia trách nhiệm trước khi file phình lớn.
4. Sửa các caller của phần dùng chung, không để hai triển khai song song.
5. Format, kiểm tra phù hợp, xem diff như người sẽ bảo trì code.
6. Báo thay đổi, kiểm tra đã chạy, lỗi còn lại và giới hạn đã quan sát.

Rule/skill không thay thế gate. Nếu client chưa nhận skill mới, đọc trực tiếp file
được dẫn trong `AGENTS.md` thay vì bỏ qua hướng dẫn.
