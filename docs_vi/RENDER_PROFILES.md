# Profile video và GPU mục tiêu

Trạng thái: đặc tả đầu ra để triển khai; chưa benchmark/render app.
GPU mục tiêu do người dùng cung cấp: NVIDIA RTX 3060 12 GB VRAM.

## 1. Preset bắt buộc

| Nhãn trong UI | Kích thước | FPS xuất |
| --- | --- | --- |
| Full HD | 1920 × 1080 | 24, 30, 60, 120 |
| 2K DCI | 2048 × 1080 | 24, 30, 60, 120 |
| QHD / 1440p | 2560 × 1440 | 24, 30, 60, 120 |
| 4K UHD | 3840 × 2160 | 24, 30, 60, 120 |
| 4K DCI | 4096 × 2160 | 24, 30, 60, 120 |

UI ghi kích thước thật vì “2K” có thể được dùng để chỉ 1440p trong giao tiếp thường ngày.
Chuyển preset phải cập nhật camera framing/safe area phù hợp, không kéo giãn hình
để vừa tỷ lệ khác. Giá trị mặc định đề xuất: 4K UHD / 60 FPS; người dùng đổi được.

Output 120 FPS là yêu cầu chức năng: lấy mẫu cảnh tại 120 thời điểm mỗi giây.
Không chỉ nhân đôi frame 60 FPS hoặc đổi metadata. Hold pose trong animation
vẽ tay vẫn được giữ khi đó là chủ ý của clip, không ép mọi nét vẽ phải khác nhau.

## 2. Tách ba loại tốc độ

- Timeline FPS: đơn vị chia frame khi người dùng đặt key/clip.
- Preview FPS: mục tiêu cập nhật viewport, đề xuất 60; tùy chọn 120 khi phù hợp.
- Output FPS: timestamp/frame count của phim, độc lập tốc độ render thực tế.

Thời gian lấy mẫu frame là `frameIndex / outputFps`. Bộ lấy mẫu pose/warp/view
được dùng chung với preview; không có một thuật toán nội suy riêng cho 120 FPS.
Preview có thể giảm resolution/shadow quality; export dùng đúng profile đã chọn.
Nếu preview cần bỏ một frame để đáp ứng tương tác, export vẫn phải lấy đủ frame.

4K/120 FPS có thể được render offline chậm hơn thời gian thực. Không suy từ
12 GB VRAM rằng mọi cảnh có thể preview 4K/120 FPS; phải đo cả GPU, CPU,
truyền frame, encoder, disk và khả năng phát của thiết bị đầu ra.

## 3. GPU và encoder

- Three.js dùng GPU cho mesh, skinning, material và shadow.
- FFmpeg ưu tiên `h264_nvenc` hoặc `hevc_nvenc` khi driver/binary hỗ trợ.
- H.264 ưu tiên tương thích; HEVC là lựa chọn cho nội dung độ phân giải cao.
- Probe encoder rồi encode clip ngắn với profile đích; không chỉ dựa vào tên GPU
  hoặc việc `ffmpeg -encoders` có liệt kê codec.
- Fallback software encoder rõ ràng khi NVENC không khả dụng; giữ nguyên
  resolution/FPS đã chọn, không tự hạ chất lượng để báo thành công.
- Không bắt buộc AV1 hardware encode trên GPU mục tiêu này.
- `4K` và `120 FPS` không tự bảo đảm chất lượng ảnh: có preset chất lượng nén,
  preview kiểm tra banding/chi tiết/mép alpha và ghi encoder/settings thực tế.

NVIDIA mô tả NVENC và tích hợp FFmpeg cho encode H.264/HEVC. Khả năng từng tổ hợp
codec/profile/FPS phải được kiểm tra trên GPU/driver thực tế.
[NVIDIA FFmpeg][nvidia-ffmpeg], [NVENC application note][nvenc].

## 4. Bộ nhớ và pipeline

- Một frame 3840×2160 RGBA8 khoảng 31.64 MiB. Một phút 120 FPS nếu giữ toàn bộ
  frame thô cần khoảng 222.47 GiB, vượt xa VRAM mục tiêu.
- Stream qua ring buffer nhỏ, ban đầu 2–4 frame; có backpressure từ encoder.
- Không giữ cả phim, mọi ảnh của mọi góc hoặc mọi render target đồng thời trên GPU.
- Chia sẻ texture/geometry theo asset, lazy-load góc cần dùng, eviction theo budget.
- Atlas và mipmap tính vào budget; mesh 2D còn dùng alpha/normal/shadow resources.
- Dispose texture, geometry, render target, stream và encoder khi hủy hoặc đóng job.
- GPU readback có thể là bottleneck; đo trước khi thêm Rust/WASM hoặc bản sao runtime.
- Quản lý VRAM dựa trên tài nguyên đang dùng và workload; 12 GB không phải toàn bộ
  dung lượng dành riêng cho app khi OS và ứng dụng khác cũng dùng GPU.

## 5. Job và khả năng khôi phục

- Job lưu snapshot revision, frame range, kích thước, FPS, codec và preset chất lượng.
- Có progress theo frame, trạng thái encoding và lỗi đầy đủ; thời gian còn lại là ước tính.
- Hủy job đóng encoder và giải phóng buffer. Job thất bại không được xuất hiện như complete.
- Resume cần frame/chunk trung gian hoặc segment đã lưu; không hứa tiếp nối tùy ý
  một stream MP4 đang mã hóa dở. Chốt phương án checkpoint sau spike export.
- Bản đầu cần renderer trong app đang mở. Trạng thái không có renderer phải là
  `waiting_renderer`; chế độ headless thuộc mở rộng sau.

## 6. Kiểm thử và tiêu chí chấp nhận

1. Unit/contract: mọi preset hợp lệ, giới hạn FPS 120, cặp width/height,
   timestamp đúng và project cũ được migrate mà không cắt FPS.
2. Integration clip 2 giây: 60 FPS có 120 frame, 120 FPS có 240 frame;
   đúng kích thước, thời lượng và sampling pose; không lấy wall-clock làm timestamp.
3. Ma trận clip ngắn: các preset 2K DCI, QHD, 4K UHD, 4K DCI × 60/120 FPS.
4. Kiểm tra file bằng probe và decode; xem frame đầu/giữa/cuối, màu, camera,
   mép alpha/shadow; không chỉ nhìn metadata FPS.
5. So sánh preview/export ở cùng thời điểm với cùng quality settings.
6. Kiểm tra hủy, encoder lỗi, renderer mất kết nối, VRAM thấp và hàng đợi.
7. Đo RTX 3060: preview p50/p95 frame time, thời gian render/encode, CPU/RAM/VRAM;
   workload tham chiếu 10 nhân vật rig, 20 layer/đạo cụ, một đèn đổ bóng.
8. Kiểm thử Windows và Linux riêng; không suy một hệ điều hành đã đạt từ hệ còn lại.

Các giới hạn 60 FPS/1080p trong mã nháp hiện tại chưa đáp ứng yêu cầu mới.
Khi triển khai phải cập nhật contract, UI, exporter và test từ một nguồn định nghĩa
profile; lượt lập kế hoạch này chưa thay đổi source runtime hoặc tạo video chứng minh.

[nvidia-ffmpeg]: https://docs.nvidia.com/video-technologies/video-codec-sdk/13.1/ffmpeg-with-nvidia-gpu/index.html
[nvenc]: https://docs.nvidia.com/video-technologies/video-codec-sdk/13.0/nvenc-application-note/index.html
