# Parallax Studio — Kế hoạch studio 2D và làm phim 2.5D

Cập nhật 12/09/2026. Trạng thái: đề xuất vNext để người dùng xem trước khi triển khai.
Lượt này sửa tài liệu; không xác nhận app đã có hoặc đã đạt các chức năng bên dưới.

## 1. Định hướng và baseline

Mục tiêu: tự vẽ hoặc nhập ảnh nhiều layer → tạo clip vẽ tay/rig → lắp cảnh nhiều
lớp có chiều sâu → camera/light → dựng nhiều shot, audio/subtitle → xuất phim.
Không cần Blender, Godot hay model 3D. Mesh phẳng, camera và light trong không gian
3D phục vụ ảnh 2D; không biến sản phẩm thành phần mềm dựng model.

Code hiện có React editor, packages/contracts/core/application/runtime, service,
MCP và exporter. Có module không đồng nghĩa workflow đã hoàn tất.
Rà source ngày 12/09 cho thấy:

| Khu vực | Hiện trạng cần xử lý |
| --- | --- |
| UI | Setup/Animate; clip cố định idle/walk/ready; ngữ cảnh asset và shot trộn nhau |
| Dựng phim | Có scene composer nhưng chưa chứng minh luồng lắp lớp, camera path, sequence đầy đủ |
| Mesh/rig | Contour chưa giữ holes; UV/weights có giả định cần sửa và test trên nhiều dạng asset |
| MCP | Relay remote rồi vẫn mutate local; timeout fallback có thể chia state |
| Export | Luồng App ghi canvas 5 giây/24 FPS; chưa chứng minh xuất sequence đúng frame |

Không gọi code hiện tại là bản nháp chưa từng build; cần đo lại build/test và UI
thực tế khi triển khai. Bảng trên là kết quả đọc source, không phải nghiệm thu chạy app.

## 2. Luồng sáng tác và ranh giới dữ liệu

Năm workspace trong cùng project:

| Workspace | Công việc | Kết quả |
| --- | --- | --- |
| draw | Brush, layer assembly, cels, onion skin, exposure | DrawingDocument |
| rig | Mesh thủ công/tự động, skeleton, weights, test pose | AssetDefinition có binding hợp lệ |
| animate | Clip riêng của asset: keys, curves, cels, loop | AnimationClip tái sử dụng |
| compose | AssetInstance, planes theo Z, clip placements, camera/light | Composition và Shot |
| edit | Cắt/ghép shots, dialogue/music/SFX, subtitle, render queue | Sequence và video |

DrawingDocument chứa DrawingLayer, Cel và Exposure. AssetDefinition là bản gốc;
AssetInstance là một lần đặt vào Composition. AnimationClip ở thời gian local
của asset; ClipPlacement ánh xạ clip vào instance. Shot chọn composition, camera và
range; Sequence lắp shot placements theo thời gian phim.
Schema và timebase chính xác do [Project Format](PROJECT_FORMAT.md) sở hữu.

Frame-by-frame không cần xương. Rigid cutout, deformable mesh và cel substitutions
có thể kết hợp trong một asset. Nhiều góc nhìn cần ảnh/layer và binding tương ứng;
không suy ra góc khuất chính xác từ một ảnh. Chỉ morph giữa topology tương thích,
còn lại chuyển view rõ ràng. Normal map tạo phản ứng ánh sáng, không sinh thể tích.

## 3. Nền tảng và tái sử dụng thư viện

Giữ kiến trúc hiện có; không thay framework để sửa UI.

| Thành phần | Hướng triển khai |
| --- | --- |
| UI | React + TypeScript; hợp nhất component/tokens, Lucide và SVG chuyên dụng |
| Runtime | Three.js/WebGL2; cùng evaluator và renderer cho preview/export |
| Geometry | Tái sử dụng Earcut cho triangulation; tự sở hữu contour, constraints, UV và validation |
| Drawing | Raster-first, brush/stroke/tile cache; không thêm renderer scene thứ hai |
| Import | PNG/layer sequence trước; PSD qua adapter subset được kiểm tra |
| Contracts/MCP | Zod/schema chung, SDK MCP TypeScript; service là nơi quản lý project |
| Desktop | Tauri/Rust cho shell, file/process lifecycle và đóng gói Windows/Linux |
| Export | Frame sampling xác định + FFmpeg; probe NVENC và fallback rõ ràng |

Kiểm tra dependency/version/license thực tế trước khi thêm thư viện. Đây là hướng
dùng lại, không khẳng định tất cả adapter đã cài. Không đưa runtime thương mại có
điều kiện vào lõi chỉ vì editor của họ có chức năng tương tự.
TypeScript giữ logic chung; chỉ chuyển hot path sang Rust/WASM sau số đo.
Không thêm model local, Python service hay API key tạo ảnh riêng vào luồng mặc định.

## 4. UI, camera và chất lượng hình

[UI Specification](UI_SPECIFICATION.md) thay thiết kế hai mode bằng các workspace
có timeline riêng: exposure, asset keys/curves, composition clips/camera và sequence.
Compose có Stage Perspective/Top/Side để sắp layer cùng Final Camera View để xem
khung hình. Editor navigation camera khác camera của phim; kéo viewer không tạo key.

Perspective + planes theo Z tạo parallax; orthographic giữ hành vi phẳng.
Draw order trong plane khác depth. Instance có transform, time offset và clip
riêng, không di chuyển source asset. Camera hỗ trợ path/ease/pan/dolly/zoom với scope rõ.
Light/shadow theo alpha và hình đã deform; sàn/tường nhận bóng là plane có sẵn.
Phong cách unlit, bóng silhouette và bóng mỹ thuật có tên rõ. Card 2D có giới hạn
khi nhìn cạnh/sau; không cam kết bóng thể tích như model đầy đủ.

Mesh phải giữ holes/islands, UV theo ảnh nguồn, weights hợp lệ và khớp không rách.
Cần preview/apply, sửa đỉnh/xương/weight thủ công và test extreme poses;
không dùng số đỉnh hay cam kết auto-rig 30 giây thay cho kiểm chứng.
Chi tiết ở [Auto Rig](AUTO_RIG.md), [Image Workflow](IMAGE_WORKFLOW.md) và
[Deformation Pipeline](DEFORMATION_PIPELINE.md).

## 5. AI/MCP và độ tin cậy

UI/MCP cùng Application Service và project revision. Durable commands, session
selection/playback và read/job APIs tách riêng. Một gesture commit một lần;
transaction phải atomic, retry có receipt/idempotency và conflict có đường phục hồi.
Không mutate local sau remote success hoặc timeout không rõ kết quả.

AI đọc khả năng và context → lập shot plan → tạo/import ảnh thật bằng công cụ của
client → lắp asset/clip/shot → render preview có artifact → review/sửa → export job.
MCP không mặc nhiên gọi được tool ảnh nội bộ của Codex/Antigravity. UI hiển thị
handoff/waiting nếu chưa có client hoặc file. Không coi metadata là ảnh preview.
Connection Center hiển thị service/session/project/capabilities và lỗi xử lý được.
[Command Bus](COMMAND_BUS.md), [MCP Tools](MCP_TOOLS.md) sở hữu các contract này.

## 6. Preview, audio và export

Cel authored FPS, preview FPS và output FPS độc lập. Camera/bone được sample ở
thời điểm output; cel hold vẫn step có chủ ý. Thời gian dùng ticks/rational rates,
range nửa mở và ánh xạ sequence → shot → composition → clip theo Project Format.
Dùng chung evaluator/deformation pipeline; không nhân đôi frame 60 để gọi là 120.

Bản làm phim đầu tiên cần cuts, audio tracks với waveform/gain/fade/A-V sync và
subtitle cơ bản. Không để audio thành phần chưa xác định sau khi tuyên bố phim hoàn chỉnh.
Render queue chọn Sequence/Shot/Range và snapshot revision; lấy đủ frame offline,
stream buffer giới hạn sang FFmpeg, hiển thị lỗi/cancel/file thật. Headless để sau.
[Render Profiles](RENDER_PROFILES.md) giữ đầu ra Full HD/2K/QHD/4K và 24/30/60/120 FPS.

RTX 3060 12 GB là GPU mục tiêu, không phải bằng chứng mọi cảnh đạt preview 4K/120.
Preview mục tiêu 60 FPS ở resolution thích ứng; 120 FPS tùy benchmark.
Export 4K/120 có thể chậm hơn thời gian thực mà vẫn đúng đầu ra.

## 7. Mốc triển khai và điều kiện chuyển mốc

| Mốc | Phạm vi | Điều kiện đạt trước khi mở rộng |
| --- | --- | --- |
| P0. Contract và baseline | Inventory UI thực, thống nhất entity/timebase/migration, service authority, save/recovery, mockup tương tác 5 workspace | Shared contracts chốt; không split state/false success; project cũ có đường mở/migrate |
| P1. Lát cắt làm phim | Draw raster tối thiểu → clip cel/rigid → Compose nhiều planes/camera → Edit 3 cuts + audio/subtitle → export ngắn | User hoàn tất và mở lại phim 15 giây từ UI; MCP điều khiển cùng dữ liệu |
| P2. Studio asset | Brush/selection/mask/exposure hoàn chỉnh theo spec; mesh manual/auto/holes/UV; skeleton/weights/test poses; clip keys/curves | UX-01/02/03; fixture deform, undo stroke và replace-source/rebind đạt |
| P3. Dàn cảnh và dựng | Instance reuse, clip timing, path camera, light/shadow, shot trim/split/ripple, audio/subtitle chỉnh sửa đầy đủ | UX-04/05/06; không nhầm source/instance, cut và A/V sync đúng |
| P4. AI đạo diễn và recovery | Kịch bản → assets → shots → preview thật → sửa → export; jobs, reconnect, conflict, import handoff | UX-07; AI/UI cùng revision, retry không duplicate, không báo hoàn thành giả |
| P5. Chất lượng sản xuất | Render presets, cache/readback, DPI/keyboard/stylus, autosave, Windows/Linux packaging | UX-08/09/10; video và benchmark thực, queue/cancel/recovery đạt |

P1 là workflow nhỏ xuyên suốt, không yêu cầu mọi brush/effect đạt mức cuối ngay.
MCP và deterministic export bắt đầu ở P0/P1 rồi được mở rộng; không để đến P4/P5
mới phát hiện editor và AI dùng hai bộ nghiệp vụ.
Mỗi mốc gồm vertical slice, kiểm tra hành vi và demo project; không triển khai đồng
loạt mọi panel rỗng rồi gọi là xong UI.

[Testing Strategy](TESTING_STRATEGY.md) sở hữu ma trận kiểm thử. Mỗi nghiệm thu cần
project mở lại được, video/screenshot workflow, output decode/probe khi có render,
cấu hình máy và số đo. Test riêng lẻ hoặc tên module không thay chứng cứ này.

## 8. Quy tắc code và team AI

[Coding Rules](CODING_RULES.md), [Module Map](MODULE_MAP.md) và
[AI Team Protocol](AI_TEAM_PROTOCOL.md) tiếp tục áp dụng: tối đa 800 dòng vật lý
mỗi source file, không nén mã để lách, đặt tên rõ và chia theo trách nhiệm.
Một nghiệp vụ có một chủ sở hữu; tìm nơi có sẵn trước khi tạo thêm helper/service.

Lead chốt contract, giao một write owner mỗi file; chỉ song song hóa phạm vi
độc lập. Nhóm UI, graphics, application/MCP, desktop/export và QA dùng cùng
acceptance workflow. Dịch đồng thời docs_vi sang docs trong mỗi thay đổi yêu cầu.
Không tạo implementation từ một yêu cầu chỉ duyệt/sửa plan.

## 9. Phạm vi hoãn và bước tiếp theo

Hoãn: full vector editor, brush engine ngang phần mềm vẽ chuyên dụng lâu năm,
model 3D/GLB authoring, cloth/fluid, lip-sync tự động nâng cao, motion blur/DOF nâng cao,
cloud collaboration/render và headless export. Tạo giọng nói không mặc định có
provider; bản đầu nhận audio file. Không hứa tự rig mọi silhouette hoặc suy đủ góc từ một ảnh.

Bước triển khai kế tiếp là P0 và mockup tương tác cho Draw/Compose/Edit dùng asset
mẫu, sau đó P1 với dữ liệu thật. Các thay đổi kiến trúc mới được ghi là proposed
trong [Architecture Decisions](ARCHITECTURE_DECISIONS.md); phần code chỉ triển khai
khi người dùng giao việc tương ứng.
