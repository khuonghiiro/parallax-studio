# Tạo ảnh bằng AI client, đưa asset vào app qua MCP

Trạng thái: yêu cầu đã được đưa vào kế hoạch; chưa triển khai connector trong app.

## 1. Trách nhiệm

Codex/Antigravity dùng công cụ sinh và sửa ảnh đã có trong phiên làm việc.
Parallax cung cấp MCP tool để chuẩn bị brief, đọc reference, nhận kết quả,
quản lý layer/view, dựng mesh và rig. Không cài một model sinh ảnh local hoặc
yêu cầu thêm API key sinh ảnh của app trong luồng mặc định.

Agent là bên điều phối. MCP server không mặc nhiên được gọi công cụ nội bộ của
client theo chiều ngược lại. Mỗi client cần có công cụ tạo ảnh và cách chuyển
artifact khả dụng; không hard-code tên một tool riêng thành giao thức chung.

Phiên Codex hiện tại có công cụ tạo ảnh được cung cấp trong tool catalog.
Tài liệu Antigravity cũng mô tả công cụ sinh ảnh tích hợp; khả năng thực tế vẫn
phụ thuộc client/phiên làm việc. [Antigravity Models][anti-models].

## 2. Chu trình mặc định

1. Người dùng yêu cầu trong Codex/Antigravity, ví dụ: tạo nhân vật và phim 4K/60 FPS.
2. Agent đọc project/style/reference và lấy brief từ tool MCP của Parallax.
3. Agent gọi công cụ tạo ảnh của client, sau đó xem kết quả thật.
4. Agent gọi tool nhập ảnh của Parallax, nhận asset ID và báo cáo kiểm tra.
5. Agent thêm view/layer/material, tạo mesh/rig, render test pose rồi sửa nếu cần.
6. Khi asset đạt yêu cầu, agent đưa vào shot và xuất phim bằng tool MCP.

Nút tạo ảnh trong UI có thể chuẩn bị yêu cầu để agent đọc. Nếu chưa có kết nối
khởi chạy agent được hỗ trợ, UI phải ghi đang chờ agent; không hiển thị đang sinh ảnh.

## 3. Dữ liệu brief

- Generation request ID và asset ID đích, revision của project.
- Loại asset, mô tả, style, bảng màu và reference có thể đọc được.
- Góc nhìn, pose trung tính và tỷ lệ cơ thể cần giữ giữa các ảnh.
- Định dạng ảnh, alpha mong muốn, kích thước mong muốn và vùng safe padding.
- Danh sách layer hoặc bộ phận cần có, tên xương/ngữ nghĩa nếu đã có rig.
- Phân biệt màu/alpha của artwork với normal map hoặc shadow của scene.

Brief yêu cầu ánh sáng phẳng khi cần relight về sau; hạn chế bóng nền đã vẽ sẵn.
Chọn ảnh reference đã chốt làm cơ sở cho các lần sinh/sửa tiếp theo. Sinh cùng
một prompt nhiều lần không tự bảo đảm nhân vật giữ nguyên đặc điểm.

## 4. Tool và truyền ảnh

Tên dưới đây là API đề xuất, chưa phải catalog tool đã hoạt động:

| Tool | Kết quả |
| --- | --- |
| `asset.prepare_image_brief` | Brief và reference cho agent sinh/sửa ảnh |
| `asset.import_image` | Asset ID, kích thước thật, alpha và source hash |
| `asset.attach_view` | Gắn kết quả vào góc nhìn của asset |
| `asset.attach_layer` | Gắn ảnh/mask vào bộ phận có tên |
| `asset.validate_artwork` | Báo layer/view thiếu và vấn đề ảnh |
| `asset.get_preview` | Preview để agent kiểm tra bằng thị giác |

- Cùng máy: nhập file do công cụ ảnh trả về ở đường dẫn agent và service đọc được.
- Khác máy hoặc artifact chỉ ở client: truyền file theo upload có chunk và hash;
  không giả định một đường dẫn trong cloud tồn tại trên máy người dùng.
- Không biến một URL thumbnail hoặc hình hiển thị trong chat thành source đã nhập.
- Metadata nhỏ truyền qua JSON; ảnh lớn đi qua file/upload, không lặp base64 của
  cả bộ ảnh trong mỗi lần sửa pose hoặc gọi command.
- Import phải idempotent theo request ID/source hash để retry không nhân đôi asset.

## 5. Kiểm tra đầu ra

- Đọc kích thước/MIME/alpha thật; không tin hoàn toàn tên file hoặc lời mô tả của agent.
- Nền caro được vẽ trong ảnh không được tính là alpha trong suốt.
- Ảnh flatten chưa tự trở thành các layer riêng. App/agent phải tách hoặc sinh
  từng phần và kiểm tra vùng bị che, pivot, overlap trước khi gắn xương.
- Kiểm tra bộ góc: trang phục, màu, tỷ lệ, hướng nhìn và tên bộ phận nhất quán.
- Ảnh cho một nhân vật chiếm toàn màn hình cần pixel budget khác một đạo cụ nhỏ.
- Nếu công cụ chỉ sinh ảnh nhỏ, công khai kích thước nguồn; không gọi upscale
  thành ảnh gốc có chi tiết 4K. Output video 4K không tự tăng chi tiết texture.
- Ghi nhận source/reference và phiên bản ảnh để có thể thay texture mà giữ rig.

## 6. Nghiệm thu

Thử chu trình riêng trên Codex và Antigravity bằng công cụ thật của từng client.
Một nhân vật có góc trước và nghiêng phải được tạo, nhập, kiểm tra, rig và xuất clip.
Các trạng thái thiếu công cụ, chưa có file, lỗi alpha hoặc thiếu layer phải xuất hiện
đúng; không có asset giả được dùng để báo bước sinh ảnh đã hoàn thành.

Luồng này dùng quyền và hạn mức sinh ảnh của tài khoản AI đang hoạt động.
Không yêu cầu thêm API key từ app không có nghĩa mọi lượt sinh ảnh đều không có hạn mức.

[anti-models]: https://www.antigravity.google/docs/models/
