# Đặc tả UI — studio vẽ, diễn hoạt và dựng phim

Cập nhật 12/09/2026. Trạng thái: đề xuất vNext để triển khai theo từng mốc.
Tài liệu này thay thế thiết kế hai mode Setup/Animate. Nó mô tả hành vi đích;
không xác nhận các chức năng đã có hoặc đã được nghiệm thu trên app hiện tại.

## 1. Vấn đề và hướng thiết kế

Code đã có editor và các package nghiệp vụ. Tuy nhiên, tại lần đọc source này:
- MenuBar/ViewportPanel vẫn dùng Setup/Animate; EditorContext giữ state theo asset.
- Clip được chọn từ tập cố định idle/walk/ready; timeline trộn key của asset và shot.
- Export trong App ghi canvas 5 giây ở 24 FPS, chưa là luồng xuất sequence hoàn chỉnh.
- Có SceneComposer nhưng chưa đủ chứng minh user có thể tự lắp cảnh, đặt camera path và dựng phim.

Mục tiêu là tạo một tác phẩm xuyên suốt: vẽ một nhân vật nhiều lớp, làm clip đi bộ,
đặt nhiều instance vào bối cảnh nhiều mặt phẳng, lia camera rồi cắt thành phim.
Công cụ phải cho biết đang sửa bản vẽ, rig, clip, instance hay shot.
Chất lượng chuyên nghiệp được đánh giá bằng workflow hoàn tất được và sửa lại được,
không bằng số icon hoặc hiệu ứng trang trí.

## 2. Năm workspace và ngữ cảnh tài liệu

| ID | Nhãn UI tiếng Việt / tiếng Anh | Đối tượng chính | Timeline | Hành động tiếp theo |
| --- | --- | --- | --- | --- |
| draw | Vẽ & Layer / Draw | DrawingDocument, DrawingLayer, Cel | Exposure sheet | Chuẩn bị rig hoặc tạo clip vẽ tay |
| rig | Lưới & Xương / Rig | AssetDefinition, mesh, skeleton | Test pose, không ghi key mặc định | Tạo AnimationClip |
| animate | Diễn hoạt / Animate | AnimationClip của asset | Dopesheet + curves + cels | Đưa clip vào cảnh |
| compose | Dàn cảnh / Compose | Composition, AssetInstance, camera, light | Clip placement + đường camera | Tạo Shot |
| edit | Dựng phim / Edit & Export | Sequence, Shot, audio, subtitle | Sequence edit | Review, render, xuất phim |

Workspace là bố cục và công cụ của cùng một project; không phải năm ứng dụng hay
năm bản state. Chuyển workspace không phát playback, không tạo key và không thay
đổi asset. Có thể mở nhiều tab tài liệu và quay lại đúng selection/playhead trước đó.

Breadcrumb luôn hiện Project / Asset hoặc Composition / Clip hoặc Shot.
Inspector có nhãn rõ: Sửa bản gốc, Sửa instance, hoặc Sửa tại thời điểm.
Double-click clip placement mở clip gốc; quay lại composition giữ nguyên shot.
Sửa clip gốc ảnh hưởng mọi nơi tham chiếu: hiện số nơi sử dụng; có Duplicate/Make Unique.

## 3. Shell và bố cục chung

Dùng panel liền mạch, resizable và dock theo vùng. Menu File/Edit/View/Animation/
Scene/Render/Help, tabs workspace, tabs tài liệu và context toolbar có nhãn.
Library, hierarchy và inspector là các panel khác nhau; không nhét tất cả vào
một cây project luôn mở. AI Activity là drawer tùy mở, không chiếm canvas mặc định.

| Vùng | Nội dung | Kích thước đề xuất ở 1920 × 1080 |
| --- | --- | --- |
| Header | Menu, project/save status, workspace, tài liệu | 72–104 px tổng |
| Trái | Library hoặc cây đúng ngữ cảnh, tìm kiếm/filter | 240–300 px |
| Giữa | Canvas/stage, toolbar ngắn, viewer tabs | Phần còn lại, ưu tiên lớn nhất |
| Phải | Inspector và Tool Options theo selection | 280–340 px |
| Dưới | Timeline đúng workspace, transport | 220–320 px, thu gọn được |
| Status | Scope, frame/timecode, preview scale, job/connection | 24–28 px |

Ở 1366 × 768 tự chuyển library thành tab, inspector thành drawer khi cần; không
thu chữ nhỏ để ép đủ panel. Tại DPI 125–200%, drag handle, menu và timeline không
che nhau. Có Reset Layout, Focus Canvas và lưu workspace theo máy; layout không
được serialize vào nội dung phim.

Empty state có hành động đúng chỗ: New Drawing, Import Layers, New Clip, Add
Composition, Add Shot. Tool chưa hỗ trợ bị disable kèm lý do và lối xử lý.
Lỗi phải hiện cạnh tác vụ và có Retry/Locate/Fix; không chỉ dùng alert hoặc console.

## 4. Draw — vẽ và lắp asset nhiều layer

Canvas hiển thị pixel document, giấy trong suốt/checkerboard, zoom/rotate/mirror
view và reference riêng. Mirror view không lật nội dung xuất.

| Panel/tool | Hành vi bắt buộc đợt đầu |
| --- | --- |
| Brush / Eraser | Size, hardness, opacity, màu, pressure curve, smoothing; mouse fallback |
| Fill / Selection | Tolerance/contiguous, lasso/rectangle, feather, invert, transform selection |
| Layers | Thumbnail, rename, visibility, solo, lock, alpha lock, opacity, group, mask |
| Import | PNG nhiều lớp/sequence; PSD theo subset được hỗ trợ, báo phần không nhập được |
| Assembly | Move/rotate/scale, pivot, snap, align, parent/group, giữ offset khi reparent |
| Palette | Swatch và recent colors theo project, không chỉ một color picker |
| Exposure sheet | New blank cel, duplicate cel, hold, split hold, insert/delete frame, loop range |
| Onion skin | Trước/sau theo cel khác nhau, số lượng và opacity/tint; exclude layer tùy chọn |

Không bắt user tạo mesh/xương để vẽ frame-by-frame. Vẽ một layer held nhiều frame
phải hiện nhãn đang sửa cel được dùng ở những frame nào; có Make Unique trước khi
vẽ khác ở một frame. Delete exposure khác delete source cel.
Một stroke là một undo; pen cancel mất capture không để nét dở đã commit.
Không gửi mỗi pointer sample thành một command HTTP.

Phiên bản đầu ưu tiên raster; SVG nhập giữ source và rasterize có preview.
Full vector path editor, boolean vector và brush engine tương đương Krita thuộc
mở rộng sau. UI không quảng cáo là vector editor khi mới có vài shape.
Brush preset/export raster phải cho kết quả có thể khôi phục; lưu delta/tile và
snapshot phù hợp thay vì mỗi nét chụp lại toàn canvas 4K.

Asset assembly có chế độ kiểm tra khớp: overlap, pivot, thứ tự lớp và khoảng trống.
Mỗi layer chọn None, Rigid Cutout hoặc Deformable Mesh. Props tĩnh không cần rig.
Clip vẽ tay có thể kết hợp rig và cel thay miệng; binding phải tương thích hoặc
dùng rigid binding cho cel có silhouette/topology khác.

## 5. Rig — lưới, xương và kiểm tra biến dạng

Luồng có trạng thái rõ: Artwork → Mesh → Skeleton → Bind → Validate.
Cho phép quay lại mỗi bước; không biến thành wizard bắt buộc tuần tự cho chuyên gia.
Trái: layer/mesh/bone theo tab. Giữa: asset ở rest pose. Phải: mesh settings,
weights hoặc bone constraints. Dưới: pose test presets và vấn đề chưa xử lý.

| Giai đoạn | Công cụ và phản hồi |
| --- | --- |
| Auto mesh | Alpha threshold, contour tolerance, margin, density/joint zones; preview trước Apply |
| Manual mesh | Vertex/edge/face select, add/move/delete, split edge, constrained edge, local retriangulate |
| Diagnostics | Holes/islands, crossings, zero-area, UV stretch, unweighted vertices; click lỗi để focus |
| Skeleton | Template + landmark chỉnh tay, add/reparent bone, pivot/rest transforms, FK/IK |
| Weights | Chọn bone, heatmap có thang số, add/subtract/smooth, normalize, lock influence |
| Test pose | Bend/rotate theo giới hạn, extreme pose, so sánh rest/deformed, Reset Test Pose |

Tự tạo mesh phải giữ vùng rỗng như giữa tay/thân, các đảo rời và UV đúng khung ảnh.
Mesh có nhiều đỉnh chưa chắc đẹp; tiêu chí là giữ silhouette, không lật tam giác,
không rách khớp và biến dạng kiểm soát được. Không cam kết tự rig mọi con vật.
Regenerate/replace source hiển thị binding/clip nào bị ảnh hưởng; tạo revision
mới, preview transfer/rebind, cho phép cancel. Không âm thầm bỏ weights/keys.
Test pose là session preview, chỉ Bake to Clip mới tạo key bền vững.
Chi tiết ở [Auto Rig](AUTO_RIG.md) và [Image Workflow](IMAGE_WORKFLOW.md).

## 6. Animate — tạo animation riêng cho asset

Mở asset trong studio riêng, nền/camera tham chiếu tùy chọn và clip browser.
New/Duplicate/Rename/Delete clip, duration, authored FPS, loop, markers và thumbnail.
Không giới hạn animation vào idle/walk/ready. Clip dùng lại qua nhiều instance.

Timeline có ba chế độ cùng dữ liệu:
- Dopesheet: bone/layer/deformer channels; box-select, move/copy/paste keys, snapping.
- Graph: numeric channels, tangents, ease, stepped/linear/Bezier, filter selected.
- Exposure: cel rows, holds và drawing substitutions, edit in Draw ngay tại frame.

Play, pause, frame step, previous/next key, work range và audio scratch riêng.
Auto-key mặc định off; bật thì banner/indicator rõ. Khi off, pose thử không tự lưu;
Set Key hoặc Reset được hiện tại vùng thao tác. Chỉ channel thật thay đổi được key.
Key diamond biểu thị none/key here/animated elsewhere/modified, không chỉ đổi màu.

Hỗ trợ block pose, breakdown, timing, inbetweens, squash/stretch, view/expression,
root-motion policy và clip loop seam preview. Ghosting lấy pose theo thời gian
chứ không copy screenshot toàn editor. Retime giữ cel exposure step, không nội suy
hai hình vẽ trừ khi user chọn một hiệu ứng riêng được hỗ trợ.
Walk clip trong asset dùng local coordinates; vị trí đi ngang cảnh thuộc instance
hoặc root motion được chọn rõ, tránh tính chuyển động hai lần.

## 7. Compose — dàn cảnh nhiều lớp và camera

Đây là nơi lắp phim 2.5D, khác asset editor. User kéo asset/clip/background từ
Library vào stage để tạo instance có ID riêng, không sửa source asset.

```text
Project / Forest / Shot 02          Draw Rig Animate [Compose] Edit
Library + Scene Tree | Stage Perspective / Top / Side | Inspector
                    | Depth planes + camera path     | Instance
                    |--------------------------------| Camera
                    | Final Camera View              | Light
Composition timeline: instances / clips / camera / light / markers
```

Hai viewer đồng thời: Stage để sắp lớp/camera, Camera View để kiểm tra frame cuối.
Perspective/Top/Side giúp thấy depth plane; camera gizmo/frustum/path luôn phân biệt
với editor navigation. Pan/zoom viewer không tạo camera key.
Nút Pilot Camera có indicator; khi bật và Auto-key đúng context mới ghi camera.

Scene Tree chứa groups/pegs, background planes, character instances, props, effects,
cameras, lights và shadow receivers. Drag sắp thứ tự trong cùng plane là draw order;
depth Z là thuộc tính khác. Có lock, solo, selectable, search và filter.
Có Enter Group/Edit Source/Make Unique; parent cycle bị chặn.

| Thao tác | Kết quả người dùng nhìn thấy |
| --- | --- |
| Kéo clip từ Library | Chọn instance tương thích hoặc tạo instance, đặt ClipPlacement tại playhead |
| Duplicate instance | Clip/source dùng chung; transform/time offset độc lập |
| Đặt background | Full image bounds, crop/fit rõ; không kéo giãn ảnh mặc định |
| Chỉnh depth | Plane gizmo và Camera View cập nhật; có Keep Framing khi đổi Z |
| Move/rotate/scale | Local/world mode, pivot và numeric input, snap/grid |
| Key camera | Pan, dolly, zoom/FOV, rotation, target; đường đi, key handles và easing |
| Add light/receiver | Cường độ/màu, shadow softness/bias, alpha silhouette, contact check |
| Clip timing | Trim, slip, repeat, speed, blend chỉ channels tương thích |
| Camera switch | Mỗi shot có camera được chọn; switch ở cut không blend vô tình |

Multiplane thực dùng perspective + depth để tạo parallax. Orthographic là mode
phẳng, không tự phát sinh depth scaling; artistic parallax là hiệu ứng có tên,
không cộng lần nữa với perspective. Keep Framing chỉ bù kích thước tại frame tham
chiếu và phải cho user preview khi camera đang chuyển động.
Đổi canvas aspect hiển thị crop/safe frame, không tự đổi camera keys.
DOF/motion blur/volumetric không thuộc tiêu chí bản nền, chỉ bật khi runtime hỗ trợ.

## 8. Edit & Export — dựng sequence hoàn chỉnh

Sequence bin chứa shots/thumbnails/status. Viewer xem kết quả cut, không xem
asset đang chọn từ workspace khác. Timeline nhiều track:
- Shot track: reorder, trim, split, ripple toggle, gaps được hiển thị.
- Audio tracks: dialogue/music/SFX, waveform, gain/fade/mute và A/V sync.
- Subtitle track: text, timing, safe area, font fallback; nhập/xuất định dạng được hỗ trợ.
- Markers: scene beats, review notes, missing assets.

Double-click shot mở Compose đúng camera và thời điểm. Clip và composition giữ
local time; sequence placement ánh xạ time theo [Project Format](PROJECT_FORMAT.md).
Cuts có trước, cross-dissolve dùng hai shot thực render; transition chưa hỗ trợ
phải disable. Không nối duration bằng phép cộng số thực mơ hồ.

Render Queue hiển thị Sequence/Shot/Range, output path, kích thước thật, FPS, codec,
quality, audio và validation trước Start. Có snapshot revision, progress thực,
cancel/retry, log mở được và link file hoàn tất.
Mất renderer là waiting_renderer; job fail không hiện Done. Preview giảm resolution
được, export không âm thầm giảm quality hay record wall-clock canvas.
[Render Profiles](RENDER_PROFILES.md) quy định 2K/4K, 60/120 FPS và kiểm chứng frame.

## 9. AI Activity và MCP có ngữ cảnh

Drawer cho biết client/session/project kết nối, revision, khả năng được hỗ trợ,
AI đang chuẩn bị/running/waiting/failed và đối tượng đang sửa.
Mỗi tác vụ có tóm tắt người dùng đọc được, target, progress, artifact, retry/cancel.
Có highlight/focus target tùy user; không tự cướp selection trong lúc người dùng vẽ.

AI workflow: đọc library và scene context → lập shot plan → báo asset còn thiếu →
tạo/import ảnh thật → lắp asset/clip/shot → render preview thật → sửa → xuất.
Plan review theo batch cho đổi lớn; tác vụ user đã giao không hỏi duyệt lại mỗi bước.
UI Generate tạo brief/handoff; nếu host chưa kết nối công cụ sinh ảnh thì hiện
Waiting for image client, không giả lập đã gọi model.

MCP và UI dùng cùng command cho dữ liệu phim, không bắt mọi UI click thành tool.
Selection/layout/playback là session; validation/preview là query/job.
Conflict hiện revision và cách refresh/reapply; retry không nhân đôi asset/shot.
Có nút Copy Connection Diagnostics, reconnect và hướng dẫn gắn Codex/Antigravity.
[Command Bus](COMMAND_BUS.md) và [MCP Tools](MCP_TOOLS.md) sở hữu contract chi tiết.

## 10. Ngôn ngữ tương tác và design system

Màu nền trung tính, phân cấp bằng typography/border/spacing, accent cho selection/
focus, màu cảnh báo cho lỗi. Không dùng glow/gradient/card cho mọi panel.
Kế thừa component/token hiện có rồi hợp nhất, không thay framework chỉ vì đổi skin.

- Chữ UI 13–14 px, label nhỏ tối thiểu 12 px, số frame dùng tabular digits.
- Control cao 28–32 px, vùng nhấn 28 px trở lên cho desktop; preset stylus 36–44 px.
- Spacing 4/8/12/16, radius 3–6 px cho control; divider rõ, focus ring nhìn được.
- Lucide + custom SVG cùng hệ; icon 16–20 px, tooltip có tên/chức năng/phím.
- Toolbar chính có icon và nhãn; tool phụ trong nhóm có tên, không mê cung icon.
- Tương phản text đọc được theo mục tiêu 4.5:1; trạng thái có chữ/hình ngoài màu.
- Hỗ trợ Việt/Anh bằng message keys; không hard-code width theo chữ tiếng Anh.

Shortcut có command registry theo context và chỉnh lại được:
Ctrl+S save, Ctrl+O open, Ctrl+Z undo, Ctrl+Shift+Z redo, Ctrl+A select all,
Ctrl+P không chiếm cho pivot, Ctrl+W không chiếm cho weight overlay.
B brush, E eraser, V select, Space play khi timeline focus; giữ Space kéo pan
khi canvas focus. Không bắt shortcut khi user đang nhập text.
Overlay controls đặt trong View/Overlays, menu và Command Search; có đường dùng chuột
cho mọi hành động cốt lõi.

## 11. Hiệu năng, độ tin cậy và khả năng tiếp tục làm việc

Dùng cache/tile cho artwork, incremental upload vùng bẩn, virtualize layer/track rows,
không dựng lại toàn scene mỗi pointer event. Preview resolution có badge rõ.
Stroke feedback mục tiêu p95 dưới 33 ms trong fixture được ghi nhận; preview target
60 FPS, 120 chỉ khi đo đạt. Ghi CPU/RAM/driver/document size, không suy từ RTX 3060.

Lưu project có source và revision, autosave/recovery hữu hình; file mất có Relink,
không hiện blank layer như file hợp lệ. Không báo Saved nếu quota/I/O thất bại.
Panel resize, switch workspace và disconnect không làm mất stroke đã commit.
User có thể pause AI edits, tiếp tục chỉnh tay và undo đúng phạm vi.

## 12. Nghiệm thu trước khi gọi là studio dùng được

| ID | Kịch bản | Điều kiện đạt |
| --- | --- | --- |
| UX-01 | Tạo drawing 6 layer, vẽ 12 cels, giữ mỗi cel 2 frame ở 24 FPS | Onion skin đúng, sửa hold có cảnh báo scope, undo/reopen không mất nét |
| UX-02 | Lắp tay/thân/đạo cụ, auto mesh có lỗ và sửa đỉnh thủ công | UV không méo; pivot/overlap ổn; rigid và deform cùng hoạt động |
| UX-03 | Tạo walk 1 giây và blink, duplicate clip rồi sửa | Clip gốc không đổi; Auto-key off không ghi key; loop seam kiểm tra được |
| UX-04 | Lắp 8 planes và 2 instance dùng chung walk vào forest | Depth/order rõ, một instance lệch thời gian; asset gốc không bị move |
| UX-05 | Tạo camera pan/dolly 5 giây, sửa path ở Side View | Final Camera View có parallax; pan editor không sửa camera |
| UX-06 | Dựng 3 shots/15 giây, music và subtitle | Trim/split/undo, cut đúng frame, reopen giữ mọi liên kết |
| UX-07 | AI tạo thêm shot khi user sửa asset, mất kết nối rồi retry | Conflict/recovery rõ, không duplicate hoặc hai state khác nhau |
| UX-08 | Xuất sequence 2 giây 4K ở 60 và 120 FPS | 120/240 frame thực, đúng cel holds và camera samples, audio sync |
| UX-09 | Người mới thực hiện UX-01→06 bằng UI | Không sửa JSON/source, không cần gọi tool tên nội bộ, không gặp nút chết |
| UX-10 | 1366 × 768 và 1920 × 1080, DPI 125/200%, keyboard/stylus | Không panel che tool trọng yếu, focus và thao tác drag ổn |

Mỗi bước có video/screenshot và project mẫu mở lại được. Paper plan, mockup hoặc
unit test riêng lẻ không đủ chứng minh trải nghiệm toàn workflow.

## 13. Thứ tự triển khai và nguồn tham khảo

Thứ tự và giới hạn scope ở [Plan](PLAN.md); acceptance kỹ thuật ở
[Testing Strategy](TESTING_STRATEGY.md). Dựng một lát cắt Draw→Animate→Compose→Edit
với asset đơn giản trước khi thêm hàng loạt effect. Mesh/rig và MCP được sửa bằng
fixture riêng rồi nối vào cùng lát cắt.

Tham khảo tương tác, không bắt dùng runtime hoặc license của ứng dụng khác:
- [Krita Animation Timeline](https://docs.krita.org/en/reference_manual/dockers/animation_timeline.html): cels, exposure, onion skin.
- [Harmony Multiplane](https://docs.toonboom.com/help/harmony-20/advanced/getting-started/multiplane.html): depth planes và camera view.
- [OpenToonz Plastic](https://opentoonz.readthedocs.io/en/latest/create_animations_using_plastic_tool.html): mesh, skeleton và chỉnh mesh có chủ đích.
