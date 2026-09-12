# Định dạng project cho vẽ 2D và dựng phim 2.5D

Trạng thái: đề xuất nâng cấp ngày 12/09/2026; chưa phải schema đã triển khai.
Source đã có manifest, asset, scene, clip và shot trong `packages/contracts/src/`,
state tại `packages/application/src/projects/`. Các contract sau thay mô hình
scene/timeline đơn giản về mặt kế hoạch; phải có migration và fixture thật trước
khi đổi dữ liệu đang lưu của người dùng.

## 1. Tài liệu và quyền sở hữu

| Contract đề xuất | Nội dung và ranh giới |
| --- | --- |
| `DrawingDocument` | Canvas 2D, hệ màu, tốc độ vẽ, cây layer, cel library; mở riêng được |
| `DrawingLayer` | Raster, group, mask hoặc reference; order, opacity, blend, lock và exposure |
| `Cel` | Một hình vẽ có ID; tile/blob, bounds, pivot và revision, không phải thời điểm |
| `Exposure` | Giữ một cel hoặc để trống trên một khoảng frame của layer |
| `AssetDefinition` | Asset tái sử dụng: parts, views, pivots, rig, mesh, material, drawing refs, clips |
| `AnimationClip` | Chuyển động độc lập có tên, duration, tracks, exposures và asset-local bindings |
| `AssetInstance` | Một lần đặt asset với transform, overrides và clip placements riêng |
| `Composition` | Sân khấu 2.5D: node tree, depth planes, instances, camera routes, light, receivers |
| `Shot` | Lần quay composition: camera, source range và override riêng |
| `Sequence` | Bản dựng: shot placements, transition, audio, subtitle và vùng xuất |

Workspace `draw`, `rig`, `animate`, `compose`, `edit` mở các tài liệu này,
không tạo năm bản sao project. Selection, active tool, onion skin, panel layout
và playhead là session state; không tăng content revision.

## 2. Registry, tham chiếu và thời gian

Manifest giữ project ID, schema version, content revision và registry drawing,
asset, clip, composition, shot, sequence, media. Dùng UUID ổn định, không liên kết
bằng tên hiển thị hoặc chỉ số mảng. `EntityRef` có `kind`, `id`, `revision`;
tham chiếu thành phần thêm `subId`. Entity revision được bind không nhất thiết
bằng global revision. `status` gồm `valid`, `stale`, `missing`, `incompatible`.

Thời gian phim dùng số nguyên tick, lưu `timebase` ticks/second; FPS là cặp
`numerator` / `denominator`. Chọn timebase biểu diễn chính xác các tốc độ hỗ trợ
và sample audio; không tích lũy delta float. Khoảng nửa mở `[startTick, endTick)`;
điểm cuối không thêm frame. Frame xuất n ở thời gian phân số n/outputFPS. Duration
xuất phải khớp output-frame boundary; nếu không UI/MCP trả lựa chọn snap và duration
kết quả, không làm tròn âm thầm.

`drawingFps` riêng của DrawingDocument xác định exposure grid, ví dụ 12 hoặc 24.
Exposure dùng `startFrame` bao gồm và `endFrameExclusive` không bao gồm, quy đổi
sang thời gian tài liệu. Xuất 120 FPS không biến 12 hình vẽ/giây thành 120 hình vẽ:
cel được hold; camera và rig vẫn lấy mẫu 120 thời điểm. Không tự nội suy cel.

## 3. DrawingDocument, DrawingLayer, Cel và Exposure

DrawingDocument lưu kích thước pixel, color profile, origin, layer tree và source
media. Group acyclic; mask ghi target và clipping scope. Layer reference không
nhận brush; locked layer từ chối mutation. Raster cel giữ alpha và bounds gốc.

Một cel được nhiều exposure tham chiếu. Sửa linked cel tác động mọi nơi dùng và
UI phải báo phạm vi; duplicate tạo ID mới để sửa độc lập. Gap nghĩa là blank,
không hold vô hạn. Exposures cùng layer không chồng nhau. Hold, insert/delete frame
là mutation rõ. Onion skin chỉ preview, không ghi vào cel hoặc export.

V1 dùng raster cel chỉnh sửa được. Vector path/symbol là loại layer version hóa
tương lai, không hứa vector authoring từ stroke chỉ lưu pixel. Brush metadata có
preset/version, spacing, pressure mapping, canvas transform; source tile là kết
quả có thẩm quyền. Gom samples khi preview, commit một tile delta và một undo entry.
Cancel hoặc pointer capture loss không để nửa stroke đã commit.

## 4. AssetDefinition, mesh và rig

Asset phân loại character, animal, prop, background, effect; animal có template
riêng. Parts tham chiếu drawing layer/cel hoặc media bằng ID và revision; mỗi view
có origin, pivot, draw order. Assembly giữ transform, parenting acyclic và visibility,
không flatten nguồn. Hai instance không chia sẻ mutable pose.

Binding mỗi part là `rigid` hoặc `skinned`. Mesh lưu contour/hole constraints,
vertices, indices, UV, topology revision và algorithm/version. Rig lưu local rest
transform, inverse bind matrices, bone IDs, limits và landmark template version.
Skin tối đa 4 influence/vertex; giữ top 4 rồi chuẩn hóa tổng 1 với tolerance 0.001;
vertex không influence phải được báo hoặc bind rõ. Weights/morph ghi topology
revision tương thích. Landmark keys thuộc template version, không có bản UI/MCP riêng.

Provenance trên từng artifact: hash, alpha convention, color-space, kích thước,
brief và reference nếu có. Blob lớn dùng binary có checksum/schema metadata,
không base64 ảnh lớn trong JSON. Mesh lỗi có diagnostic và vùng lỗi để sửa tay.

Đổi contour, vertex, UV, view, bone parent/rest pose tạo dependency report cho
clip/instance/shot. Không âm thầm dùng weights/morph cũ hoặc xóa track mất target.
Cho phép giữ bản cũ, preview rebind, regenerate với bản sao khôi phục.

## 5. AnimationClip và ClipPlacement

Clip chứa asset-local tracks: bone/part transform, deformer, visibility, view,
exposure. Track dùng typed target/property/value schema; không ghi object bằng
property string tùy ý. Binding chứa entity/component IDs, rig/topology revision,
compatibility signature; tên bone trùng không đủ để tự retarget.

`ClipPlacement` tham chiếu clip và instance đích: start/end tick, source in,
playback rate, loop mode, blend weights, channel mask. Trim/offset/speed chỉ sửa
placement. Edit Clip báo những nơi dùng; Make Unique tạo ID mới. Walk và blink
phối hợp trên channel khác; overlap cùng channel có priority/blend rule xác định.
Clip-local motion và world travel riêng; không áp root motion hai lần.

Animate preview không cần composition. Test pose/playhead không sửa rest pose;
auto-key phải bật rõ. Library entry đóng gói dependency IDs/revisions để relink
có kiểm tra; không phụ thuộc đường dẫn nguồn tạm của project khác.

## 6. Composition, Shot và Sequence

Composition node có `parentId`, local transform và depth plane ref. Chốt world
unit, axis, handedness cùng runtime; depth plane, draw order trong plane và camera Z
khác nhau. Reparent có giữ world transform, từ chối cycle. Lock, visibility,
solo preview, cast/receive shadow có ý nghĩa riêng.

Camera rig có ID, projection, lens/zoom, clipping, target, route tracks. Route lưu
timed keys/control points, orientation/aim, interpolation/ease; preview đường đi,
camera frame, safe area. Perspective tạo parallax từ depth; orthographic không
tự scale theo Z. Parallax factor nghệ thuật phải thành operator lưu rõ dùng chung
preview/export.

Shot tham chiếu composition revision, camera, source range, shot-local overrides.
Override không sửa nguồn; nhiều shot nhìn cùng composition từ camera khác.
`ShotPlacement` lưu shot ref, sequence range, source in và transition.

Sequence có video tracks, `AudioClip`, `SubtitleCue`. Audio lưu media ref,
source sample range/rate, gain, fade, mute; subtitle lưu text, language, style,
tick range. Dissolve cần handles hai phía, thiếu phải báo. Waveform/proxy là cache;
media gốc là source. Sequence chọn vùng xuất độc lập clip authoring duration.

## 7. Save, migration và recovery

Layout đề xuất gồm manifest pointer, generation registry chứa drawing/asset/clip/
composition/shot/sequence, media theo hash, recovery và cache. Save chụp revision
nhất quán, ghi generation/media mới, kiểm hash rồi publish manifest cuối cùng.
Flush/atomic replace phải thử Windows/Linux; crash vẫn mở được generation cũ.
Save cập nhật persisted revision, không tăng content revision. Edit trong khi save
vẫn dirty. Một transaction/batch tăng một content revision.

Migration ghi bản mới bên cạnh, giữ backup đầy đủ và báo mapping trước publish.
Inclusive endFrame hiện tại đổi sang exclusive theo frame unit tài liệu cũ, không
FPS xuất. Scene cũ map Composition; giữ ID khi mapping rõ. Không đoán FPS/parent/
clip target thiếu: mở recovery để relink. Schema mới hơn chỉ read-only nếu safe
reader hỗ trợ, nếu không từ chối.

Autosave mặc định 2 phút vào recovery riêng; so sánh revision/thời điểm trước
khôi phục, không đè nguồn âm thầm. Undo stack là session data; recovery dùng snapshot/
journal riêng. Cache xóa được; drawing tiles/rig/mesh/clip/media không phải cache.

Path tương đối, kiểm canonical path/symlink/MIME/dimensions/quota trước I/O.
Relink ngoài project qua import có hash; MCP không vượt root. Publish library copy
hoặc pin mọi dependency; xóa project gốc không làm asset thư viện mất nguồn.

## 8. Nghiệm thu và liên kết

- Save/reopen giữ linked cel, holds, pivots, rig, clips, composition, camera route,
  shots, audio/subtitle và dependency revision.
- Hai instance dùng một clip khác offset; sửa placement đầu không đổi clip/instance sau.
- Remesh báo stale; cancel khôi phục; rebind không để orphan tracks.
- Một giây vẽ 12 FPS xuất đúng 60/120 frame, giữ 12 cel và timing.
- Crash tại mọi bước save/migration khôi phục một generation nhất quán.

Tham chiếu: [PLAN.md](PLAN.md), [COMMAND_BUS.md](COMMAND_BUS.md),
[MODULE_MAP.md](MODULE_MAP.md), [AUTO_RIG.md](AUTO_RIG.md),
[UI_SPECIFICATION.md](UI_SPECIFICATION.md), [RENDER_PROFILES.md](RENDER_PROFILES.md),
[TESTING_STRATEGY.md](TESTING_STRATEGY.md).
