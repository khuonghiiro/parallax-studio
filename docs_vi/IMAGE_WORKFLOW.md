# Vẽ, chuẩn bị ảnh và tạo layer 2D

Trạng thái: đề xuất nâng cấp ngày 12/09/2026. Có mã geometry/rig hiện hữu;
các khả năng vẽ và biên tập dưới đây phải được nghiệm thu riêng. Tài liệu này
thay thế luồng chỉ nhập ảnh rồi auto-rig.

## 1. Đối tượng và workspace

| Đối tượng | Ý nghĩa |
| --- | --- |
| `DrawingDocument` | Canvas nguồn, kích thước, màu và cây layer |
| `DrawingLayer` | Layer raster, nhóm hoặc mask có tên, visibility, lock, transform |
| `Cel` | Một hình vẽ raster có revision; nhiều exposure có thể dùng chung |
| `Exposure` | Khoảng giữ cel; ô trống khác tiếp tục giữ hình |
| `AnimationClip` | Hoạt ảnh tái sử dụng, có exposure và/hoặc track rig |
| `AssetDefinition` | Artwork, rig tùy chọn và clip dùng chung |
| `AssetInstance` | Một lần đặt asset trong `Composition`, phát clip độc lập |
| `Composition` | Không gian layer/instance, camera và light |
| `Shot` | Khoảng dùng composition và camera đã chọn |
| `Sequence` | Thứ tự shot và các track dựng phim |

Đây là thuật ngữ thiết kế theo [PROJECT_FORMAT.md](PROJECT_FORMAT.md), không phải
khẳng định mọi type đã tồn tại. Workspace dùng ID `draw`, `rig`, `animate`,
`compose`, `edit` theo [UI_SPECIFICATION.md](UI_SPECIFICATION.md).
Asset tĩnh hoặc vẽ từng hình không bắt buộc qua rig.

## 2. Workspace vẽ và sửa artwork

Workspace `draw` có canvas trung tâm, tool strip trái, cây layer/thuộc tính phải,
màu và brush preset dễ truy cập. Khi sửa cel, exposure strip phía dưới hiển thị
clip, layer, cel đang sửa và breadcrumb quay lại animation.

- Raster trước: brush, eraser, eyedropper, fill, lasso/rectangle selection,
  move/scale/rotate selection, zoom/pan/rotate canvas.
- Brush có size, opacity, hardness, spacing, stabilization, pressure curve.
  Bút hỗ trợ pressure điều khiển size/opacity; chuột dùng giá trị mặc định.
  Tilt và brush engine tùy biến nâng cao là giai đoạn sau.
- Fill có tolerance, contiguous, sample active/visible layers nhưng chỉ ghi
  layer đích rõ ràng; không âm thầm thay tất cả layer.
- Layer có rename, reorder, group, duplicate, hide, lock, alpha lock, clipping
  mask, opacity, transform, mask không phá hủy. Blend mode đầu: Normal, Multiply,
  Screen; import mode không hỗ trợ phải báo.
- Selection, brush outline và onion skin là overlay, không nằm trong artwork.
  Layer/mask bị khóa phải vô hiệu công cụ ghi rõ ràng.
- Một stroke/transform là một undo item: preview trong session, commit qua
  application transaction chung với MCP. Hủy stroke bỏ thay đổi tạm.
- Undo lưu dirty regions/tiles và phục hồi pixel/bounds; không copy cả canvas
  cho mỗi pointer event.
- SVG có thể nhập rồi rasterize ở độ phân giải chọn trước, giữ bản gốc.
  Full vector editor, Bézier, boolean path và vector tween là mở rộng sau.

## 3. Cel và exposure

Workspace `animate` sở hữu clip timeline; `draw` chỉnh cel đang chọn.
Chuyển workspace giữ time/selection liên quan, không ghi sửa lên instance khác.

1. Tạo clip của asset, chọn nhịp vẽ.
2. Tạo cel trống hoặc duplicate hình, kéo exposure để giữ hình.
3. Vẽ, onion skin trước/sau, scrub và loop work range.
4. Kết hợp exposure với rig/transform track rồi preview asset độc lập.
5. Đặt nhiều instance vào composition, phát clip với offset khác nhau.

Exposure là khoảng nửa mở theo timebase project, không nội suy pixel.
Linked exposure cùng cel phản ánh cùng hình; copy độc lập là thao tác rõ ràng.
X-sheet/dope sheet hỗ trợ blank, duplicate, hold, split hold, move, trim, extend
và range selection. Blank khác với tiếp tục giữ hình trước.

Onion skin có số cel trước/sau, màu, opacity, active-layer filter; mặc định dùng
cel lân cận khác nhau để hold dài không phủ một hình nhiều lần.
Nhịp vẽ 12/24 FPS hoặc giữ trên hai/ba frame độc lập output 60/120 FPS;
camera/rig vẫn nội suy ở output rate, không hứa tự sinh in-between.
Sửa timing instance không ghi lại clip nguồn; in/out, loop và speed dùng contract chung.

## 4. AI tạo ảnh và nhập artifact

AI client sinh/sửa ảnh bằng khả năng có sẵn; app nhận artifact qua MCP.
Không thêm model local/API key mặc định. Server MCP không mặc nhiên gọi ngược
công cụ ảnh của client.

1. Brief gồm request ID, revision, style/reference, kích thước, alpha mong muốn,
   layer/view đích và tỷ lệ artwork.
2. Agent sinh ảnh, xem kết quả thật, nhập file hoặc upload có hash.
3. App kiểm tra artifact, trả ID/revision/diagnostics/preview.
4. Artwork vào `draw` để sửa mask, vẽ bù phần khuất, pivot và bố cục.
5. Chọn cel animation, rigid cutout hoặc deform mesh theo nội dung.

UI chuẩn bị brief phải báo chờ agent nếu chưa có cơ chế gọi client.
Không giả định ảnh AI luôn có alpha, layer hay view nhất quán. Nhập/vẽ thủ công
vẫn dùng được khi không có khả năng sinh ảnh.
Tên tool/payload thật thuộc [MCP_TOOLS.md](MCP_TOOLS.md). Raster lớn dùng artifact
hoặc upload giới hạn, không lặp base64 theo từng mẫu bút.

## 5. Kiểm tra và bảo toàn nguồn

- Đọc MIME, dimensions, alpha, decompressed size và hash thật. Caro vẽ sẵn không là alpha.
- Provenance theo từng artifact/view/layer; giữ nguồn và revision. Retry không nhân đôi.
- Cloud path không là local path. Kiểm tra quyền truy cập file/upload và quota;
  không tin filename hoặc shell argument từ MCP.
- Hiển thị pixel budget theo camera crop; output 4K không tăng chi tiết ảnh nhỏ.
- Lưu source canvas, crop offset và pivot. UV dùng texture thật và crop/atlas
  transform, không tự kéo contour bounding box ra toàn texture.
- PSD nhập raster layer được hỗ trợ, báo group/mask/blend chưa chuyển được;
  không flatten âm thầm; giữ nguồn để reimport có kiểm soát.
- Save/reopen/export giữ alpha, mask, màu và quan hệ cel/exposure.

## 6. Lắp ghép bộ phận

Ảnh flatten có thể bind rigid hoặc deform một mesh. Tách layer cần khi bộ phận
phải có occlusion, pivot và chuyển động độc lập; không nói ảnh một layer không thể rig.

Layer assembly cho kéo artwork vào cùng canvas, snap/pivot, reference overlay,
isolate/solo và nhóm đầu/thân/tay/chân/đuôi/cánh tùy asset.
Chọn mask/lasso tạo bộ phận hoặc AI sinh từng phần; vẽ bù vùng khuất và kiểm tra
overlap qua nhiều pose. Canvas cắt nhỏ phải giữ offset, không bắt tất cả cùng kích thước.

Draw order riêng từng view là thứ tự trong asset; depth instance trong composition
là tọa độ không gian khác. Pivot theo khớp/ngữ nghĩa, chỉnh được bằng số và kéo.
Đổi pivot sau bind phải báo ảnh hưởng rig/clip, không âm thầm dịch artwork.

## 7. Nhiều góc nhìn

Một view đủ khi shot chỉ dùng một hướng. Chỉ thêm front, quarter-left/right,
side-left/right hoặc back khi nội dung cần. Chốt design reference rồi kiểm tra
trang phục, tỷ lệ, màu, phần khuất, pivot và tên layer từng view.

Mỗi view có artwork/mesh/binding riêng, chung semantic bone mapping.
Mặc định switch toàn asset rời rạc tại key rõ ràng. Vertex morph cần correspondence,
topology revision và indices tương thích. Đổi đầu/thân độc lập là giai đoạn sau.

## 8. Mesh tự động và chỉnh tay

Workspace `rig` có Artwork → Mesh → Bones → Bind → Test Pose.
Mỗi layer chọn rigid cutout hoặc deform mesh; không bắt mọi đạo cụ thành lưới dày.

1. Alpha/mask với threshold/tolerance có preview.
2. Tìm mọi connected component, outer ring và hole.
3. Làm sạch trùng điểm, self-intersection, orientation, cạnh suy biến.
   Simplification không đóng hole hoặc nối hai phần rời nhau.
4. Triangulate polygon hợp lệ, thêm điểm/cạnh ràng buộc qua backend đã kiểm chứng.
5. UV theo texture/crop, wireframe/diagnostics rồi chỉnh, bind và test nhiều pose.

Earcut xử lý polygon rings/holes; Poisson points tùy ý đưa vào Earcut không thành
constrained triangulation. Chọn refinement backend bằng spike có fixture, license
và benchmark trước khi chốt thư viện.

Công cụ bắt buộc: chọn vertex/edge/triangle, box/lasso, move, add/delete vertex,
split edge, constrained edge, local retriangulate, lock boundary, density vùng
khớp và quality overlay. Validator chặn index/UV sai, zero-area, hole bị lấp,
self-intersection, triangle đảo; không lưu mesh hỏng như kết quả thành công.
Mật độ và edge refinement là công cụ kiểm soát, không bảo đảm hết pinching.

## 9. Thay artwork và topology

Repaint giữ canvas/topology có thể reuse binding sau validation.
Đổi alpha không tự regenerate; báo mesh cần review khi silhouette lệch.
Đổi đỉnh/indices, UV, rest pose hoặc crop tạo dependency impact report.

Chọn giữ bản cũ, rebind/retarget có preview hoặc tạo asset revision mới.
Weights/morphs/clip tham chiếu topology cũ phải báo cần sửa; không cắt array
hoặc gán weights theo index mới khi chưa có mapping.
Undo phục hồi artifact, mesh, binding và dependency status cùng nhau.

## 10. Nghiệm thu và hiệu năng

| Giai đoạn | Điều kiện hoàn thành |
| --- | --- |
| Drawing foundation | 3 layer, draw/erase/fill/lasso/mask, undo/redo, save/reopen giữ pixel/cấu trúc |
| Cel animation | 12 cel có hold/blank/link/copy, onion skin; 60/120 FPS giữ exposure đúng |
| Layer assembly | Nhân vật cutout và đạo cụ tĩnh; pivot/overlap đúng; source update có kiểm soát |
| Mesh repair | Donut, nhiều đảo, alpha mảnh, pose gập khớp; holes/UV đúng, mesh hỏng bị chặn |
| Film handoff | Hai instance cùng asset phát lệch clip trong composition nhiều depth với camera pan |

Đo stroke latency, dirty-tile upload, undo memory, texture residency và thumbnail
trên canvas 2048/4096 với 1/8/32 layer. Mục tiêu thử nghiệm p95 phản hồi preview
dưới 50 ms trên fixture công bố; chưa đo, không cam kết mọi canvas 4K giữ 120 FPS.
Dùng dirty tiles, revision cache, undo budget và job hủy được.

## 11. Hiện trạng và liên kết

Rà soát 12/09/2026: contour extraction hiện trả holes rỗng, theo outer component
đầu; triangulation tính UV theo contour bounding box. Đây là khoảng cách cần
sửa/test, không phải thuật toán đích.

- [AUTO_RIG.md](AUTO_RIG.md): binding, weights, test pose.
- [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md): cel/clip sampling và render.
- [UI_SPECIFICATION.md](UI_SPECIFICATION.md): workspace và tương tác.
- [PROJECT_FORMAT.md](PROJECT_FORMAT.md): contract và migration.
