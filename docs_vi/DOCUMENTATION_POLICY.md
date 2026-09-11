# Chính sách tài liệu song ngữ

## 1. Nguồn nội dung chuẩn

`docs_vi/` là nguồn đặc tả gốc của Parallax Studio. Đây là nơi người dùng đọc,
đánh giá và chấp nhận phạm vi sản phẩm, quyết định kiến trúc, hợp đồng dữ liệu,
giới hạn và tiêu chí nghiệm thu.

`docs/` là bản dịch tiếng Anh để Codex, Antigravity và các coding agent đọc hiệu
quả hơn. Bản tiếng Anh phải giữ nguyên ý nghĩa của file cùng tên trong
`docs_vi/`; nó không phải một nguồn quyết định độc lập.

Nếu hai bản khác nhau, nội dung trong `docs_vi/` được áp dụng. Agent phải sửa lại
bản tiếng Anh trong cùng task tài liệu và báo rõ phần đã được đồng bộ.

## 2. Quy trình thay đổi

Khi yêu cầu hoặc quyết định thay đổi:

1. Xác nhận yêu cầu trực tiếp của người dùng và các tài liệu bị ảnh hưởng.
2. Sửa file nguồn trong `docs_vi/` trước.
3. Giữ trạng thái `proposed`, `accepted`, `superseded` hoặc `implemented` đúng
   với quyết định thực tế; không tự đánh dấu là đã duyệt.
4. Dịch đầy đủ thay đổi sang file cùng tên trong `docs/`.
5. Giữ nguyên số liệu, tên command, schema field, invariant, giới hạn và tiêu chí
   nghiệm thu giữa hai bản.
6. Cập nhật manifest đồng bộ và chạy kiểm tra tài liệu.

Không được sửa riêng `docs/` để thêm yêu cầu sản phẩm. Có thể sửa lỗi chính tả
hoặc cách diễn đạt tiếng Anh, nhưng vẫn phải cập nhật manifest để việc thay đổi
có thể được review.

## 3. Manifest đồng bộ

`docs/DOC_SYNC_MANIFEST.json` ghi lại từng cặp file, revision, trạng thái review
và SHA-256 của hai bản. Hash được tính sau khi bỏ BOM và chuẩn hóa xuống dòng về
LF; thay đổi nội dung nào cũng làm manifest trở nên cũ.

Trạng thái review:

- `synced`: cặp tài liệu đã được so sánh về ý nghĩa ở revision hiện tại.
- `needs-review`: file có đủ cặp và hash hợp lệ nhưng chưa được xác nhận là bản
  dịch tương đương.

Hash chỉ phát hiện file đã thay đổi. Reviewer song ngữ vẫn phải kiểm tra tính
tương đương về nội dung trước khi đổi trạng thái thành `synced`.

Trước khi triển khai một feature, mọi tài liệu bắt buộc của feature đó phải ở
trạng thái `synced`. Không cần chặn một task độc lập vì tài liệu của miền không
liên quan còn `needs-review`.

## 4. Kiểm tra

Chạy:

```sh
node scripts/quality/check-doc-sync.mjs
node --test scripts/quality/doc-sync.test.mjs
```

Checker kiểm tra danh sách cặp file, đường dẫn, revision, hash và trạng thái. Với
cặp `synced`, checker còn so cấu trúc heading, ngôn ngữ code fence, link target và
inline code token. Checker không tự dịch, tự tăng revision hoặc tự khẳng định hai
nội dung tương đương.

## 5. Quyền sở hữu khi làm việc theo team

- `product-spec` sở hữu nội dung yêu cầu và quyết định trong `docs_vi/` khi Lead
  giao task phù hợp.
- `spec-translator` dịch nội dung đã chốt sang `docs/`; agent này không tự thêm
  yêu cầu hay đổi trạng thái ADR.
- Mỗi cặp tài liệu chỉ có một write owner tại một thời điểm.
- `qa-reviewer` kiểm tra diff, link, manifest và kết quả checker trước khi Lead
  tích hợp.
