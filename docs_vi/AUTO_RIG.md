# Rig, binding và hoạt ảnh asset

Trạng thái: đề xuất nâng cấp ngày 12/09/2026. Auto-rig là hỗ trợ có thể sửa;
không bảo đảm tự nhận khớp đúng hoặc tạo hoạt ảnh đẹp cho mọi ảnh.
Các schema/tool được chốt tại [PROJECT_FORMAT.md](PROJECT_FORMAT.md) và
[MCP_TOOLS.md](MCP_TOOLS.md), không tạo API riêng trong tài liệu này.

## 1. Tách artwork, rig và clip

`AssetDefinition` chứa artwork, rig tùy chọn và `AnimationClip`.
`AssetInstance` tham chiếu nguồn và phát clip trong `Composition`;
sửa pose instance không tự thay rest pose hoặc clip của tất cả instance.

Workspace `draw` sửa ảnh/cel, `rig` sửa mesh/xương/bind, `animate` tạo clip.
`compose` bố trí camera/layer/light; `edit` dựng `Shot` trong `Sequence`.
Cel animation và prop tĩnh hoạt động mà không cần skeleton.

| Binding | Dùng khi | Dữ liệu cần |
| --- | --- | --- |
| Rigid cutout | Bộ phận cứng, đạo cụ, ảnh tách khớp | Layer, pivot, bone/parent tùy chọn, transform |
| Deform mesh | Tóc, vải, thân mềm, mặt cần uốn | Mesh hợp lệ, bind pose, inverse bind, tối đa 4 influence |
| Không bind | Cel vẽ tay hoặc card tĩnh | Artwork/exposure, transform, alpha |

Một asset có thể trộn các loại; không thêm mesh dày hoặc weights vào layer rigid.

## 2. Workspace rig và thao tác trực tiếp

Bố cục gồm asset canvas trung tâm, layer/bone tree, thanh bước
Artwork → Mesh → Bones → Bind → Test Pose và inspector theo selection.
Hiển thị rõ Edit Rest Pose hay Test Pose để tránh ghi nhầm rest data.

- Artwork: chọn view/layer, pivot, alpha/mask overlay, isolate/solo và overlap.
- Mesh: vertex/edge/triangle selection, sửa contour/holes, density/refine và
  quality overlay theo [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md).
- Bones: tạo chain bằng click, kéo head/tail, reparent, rename, mirror có mapping,
  joint limit và sửa bone length bằng số. Tree hiển thị quan hệ cha/con.
- Bind: chọn rigid/deform per layer, eligible bones, auto weights, heatmap và brush.
- Test Pose: FK, IK handle/pin được hỗ trợ, reset, pose preset và so sánh rest/posed.
  Pose test là session evaluation; tạo key cần thao tác rõ trong clip.
- Mỗi drag/brush là một transaction khi kết thúc. Selection/overlay không tăng revision.
- Tool đang thiếu dependency phải báo điều kiện sửa được, không chỉ nút mờ không giải thích.

## 3. Landmarks và template

Nguồn landmark phải tường minh: người dùng đặt, AI client dùng vision đề xuất,
hoặc provider heuristic/CV được chọn. Heuristic từ alpha không bảo đảm hiểu anatomy;
confidence thấp cần sửa trước bind, không mặc định AI chính xác hơn.

Template định nghĩa danh sách landmark bắt buộc/tùy chọn và semantic bone mapping.
Không dùng con số landmark chung cho mọi humanoid/quadruped.
Không đổi lẫn `chin` và `head_top`: đây là hai điểm khác nhau; thiếu điểm
phải báo thiếu, không âm thầm gán vào khớp khác.

- Humanoid đầu tiên; quadruped, winged, fish và custom chain theo giai đoạn và fixture.
- Pose T nghĩa vai/khuỷu/cổ tay thẳng gần ngang; A-pose hạ tay xuống.
  Template phải khớp hình minh họa và tọa độ, không dùng tọa độ ảnh demo cố định.
- Tọa độ landmark gắn source canvas/view và chuyển sang asset local tường minh.
  Kích thước, crop offset, pivot và trục Y phải nằm trong phép chuyển đổi.
- Đổi view giữ semantic mapping nhưng không giả định khớp có cùng pixel position.
- Template sinh proposal, preview trước khi commit. Tỷ lệ và landmark chỉnh được;
  ID ổn định trong proposal/retry, không tạo skeleton mới mỗi lần preview.

## 4. Hierarchy và bind pose

Kiểm tra trước commit: không cycle, không parent mất, không bone trùng ID,
length hợp lệ, root policy rõ, biến đổi finite và ma trận bind khả nghịch.
Thiếu parent không được tự biến child thành root mới mà không báo.

Rest pose là authoring state, bind pose là trạng thái dùng lập inverse bind.
Skinning lấy global bone transform trong asset space; instance/world transform
được áp sau, tránh nhân world transform hai lần.

Đổi rest pose, hierarchy, pivot hoặc topology tạo impact report tới bindings,
morphs và clip. Rebind/retarget có preview và undo nguyên khối.
Sửa display name không phá track gắn stable ID; xóa bone báo track bị ảnh hưởng.

## 5. Auto weights có kiểm soát

Thuật toán đầu là proximity/envelope có ràng buộc layer, không gọi là heat diffusion.

1. Lấy eligible bones từ layer/region semantics và mapping do người dùng/template đặt.
2. Tính khoảng cách tới bone segment trong cùng asset/rest coordinate space.
3. Tính score finite, không âm, có falloff và radius theo kích thước tương đối.
4. Giữ influence được khóa; chọn top 4 với tie-break theo stable bone ID.
5. Normalize phần chưa khóa sau khi cắt influence để tổng cuối bằng 1.
6. Validate tổng sai số tối đa 0.001, số influence không quá 4, mọi bone tồn tại.

Nếu locked influences vượt budget/tổng hoặc không có candidate hợp lệ, trả
diagnostic để người dùng chọn bone/region; không tạo NaN hoặc gán đều mọi bone.
Nếu một vertex trùng segment, xử lý epsilon có quy tắc, không chia cho zero.

Không dùng ngưỡng tuyệt đối của nhân vật demo, dấu X để đoán trái/phải hoặc tên
bone chứa từ khóa như quy tắc giải phẫu chung. Mirror, crop, scale và con vật
phải dùng cùng nguyên lý từ dữ liệu/mapping.

Tính kết quả xác định với input, template revision và parameters giống nhau.
Cache adjacency/candidate sets theo topology; job lớn có progress/cancel và
chỉ commit sau validate, không khóa UI.

## 6. Brush và sửa binding

Weight brush có add, subtract, replace, smooth, radius, strength, falloff,
bone lock, selected-vertices-only và numeric influence table.
Rigid binding có thao tác chọn bone/parent trực tiếp, không cần weight painting.

Smooth chỉ đi qua adjacency của mesh, tôn trọng boundary/region lock.
Không trộn weights qua hai island hoặc phía đối diện do gần nhau trong ảnh.
Sau stroke thực hiện top-4/normalize/validate chung; preview và commit cùng thuật toán.
Cancel khôi phục weights cũ; undo một stroke, không một undo mỗi sample.

## 7. Clip animation riêng cho asset

Workspace `animate` có clip library, canvas độc lập, dope sheet và graph editor.
Tạo named clip, trim/loop work range, key transform/bone/warp/morph, copy/paste key,
easing, stepped exposure và chọn auto-key rõ ràng.

`DrawingDocument`, `DrawingLayer`, `Cel` và `Exposure` cung cấp phần vẽ tay.
X-sheet chỉnh hold/blank/copy/link trong cùng clip; brush chuyển sang cel nguồn.
Có thể blink bằng cel, tay bằng bone, áo bằng mesh trong một clip.
Channel precedence và blend support phải được contract xác định; không âm thầm
blend hai exposure hoặc hai clip không tương thích.

Animation template là điểm bắt đầu, không kết quả hoàn thiện.
Retarget dùng stable semantic mapping, rest-pose offset và bone-length ratio;
báo bone thiếu, axis/scale mismatch và root-motion policy.
Template humanoid không tự áp cho quadruped. Preview chân trượt, contact, overlap
và joint range trước khi lưu thành clip mới.

Clip reference và instance override tách biệt. Đổi tốc độ, trim, offset/loop của
instance trong composition không sửa source clip; cập nhật source có revision
và báo các instance bị ảnh hưởng.

## 8. Nghiệm thu theo giai đoạn

| Giai đoạn | Tiêu chí |
| --- | --- |
| Rig foundation | Rigid character và prop; pivot đúng, hierarchy edit, rest/test pose phân biệt, undo/reopen |
| Mesh binding | Donut, nhiều island, tay gập; không kéo chéo region; sums/indices/bind hợp lệ |
| Weight repair | Lock/add/smooth/numeric edit cùng kết quả UI/MCP; scale/mirror fixture không phụ thuộc demo |
| Asset animation | 3 clip idle/walk/blink; graph/dope/X-sheet; hai instance phát độc lập |
| Template expansion | Quadruped/custom chỉ công bố sau fixture, retarget và manual correction được nghiệm thu |

Không cam kết “auto-rig 20 giây” hoặc “auto-weights 1–3 giây” khi chưa benchmark.
Đo trên 1/8/32 layer, 1k/10k/50k vertices và 16/64 bones; ghi CPU/GPU, dữ liệu,
p50/p95, peak memory và cancellation latency. Đây là fixture đo, không hard limit.
Pass/fail latency được chốt sau spike, còn correctness gates áp dụng ngay.

## 9. Hiện trạng và rủi ro

Rà soát 12/09/2026: auto-skeleton hiện dùng humanoid mapping; auto-weights có
vùng tọa độ tuyệt đối theo mẫu nhân vật và kiểm tra tên bone.
Cần thay bằng eligibility/mapping theo dữ liệu trước khi gọi là rig tổng quát.
Không sửa source trong lượt cập nhật plan này.

LBS có thể co/méo ở khớp gập mạnh; sửa topology, overlap và weights trước,
corrective morph là bước thêm; không hứa mọi artifact biến mất.
Vùng khuất thiếu artwork cần vẽ bù, không sửa được chỉ bằng thêm xương.

## 10. Liên kết

- [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md): vẽ, layer, cel và mesh.
- [DEFORMATION_PIPELINE.md](DEFORMATION_PIPELINE.md): thứ tự lấy mẫu và deformation.
- [UI_SPECIFICATION.md](UI_SPECIFICATION.md): workspace và thao tác.
- [PROJECT_FORMAT.md](PROJECT_FORMAT.md): ownership, revision và migration.
- [MCP_TOOLS.md](MCP_TOOLS.md): giao tiếp UI/agent và capabilities.
