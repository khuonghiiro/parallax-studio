# Hướng dẫn cho tài liệu tiếng Việt

## Trách nhiệm

Thư mục này là nguồn đặc tả gốc do người dùng review. Mọi yêu cầu sản phẩm,
quyết định kiến trúc, giới hạn và tiêu chí nghiệm thu phải được viết rõ ở đây
trước khi dịch sang `docs/`.

## Quy tắc thay đổi

- Đọc `DOCUMENTATION_POLICY.md` và tài liệu liên quan trước khi sửa.
- Giữ ngôn ngữ dễ hiểu cho người dùng nhưng không làm mất tên kỹ thuật, schema,
  command hoặc công thức cần thiết.
- Không tự đổi quyết định của người dùng hay đánh dấu ADR là `accepted` nếu chưa
  có bằng chứng chấp thuận.
- Cập nhật file cùng tên trong `docs/` và manifest trong cùng task.
- Một agent sở hữu cả cặp tài liệu tại một thời điểm; có thể bàn giao bước dịch
  cho `spec-translator` sau khi nội dung tiếng Việt đã ổn định.
- Nếu code và tài liệu khác nhau, báo rõ trạng thái. Không sửa tài liệu để hợp
  thức hóa hành vi sai của code.

## Kiểm tra

Chạy documentation sync checker và kiểm tra link cục bộ. Chỉ đánh dấu cặp tài
liệu `synced` sau khi đã so sánh ý nghĩa, số liệu, trạng thái và tiêu chí nghiệm
thu giữa hai ngôn ngữ.
