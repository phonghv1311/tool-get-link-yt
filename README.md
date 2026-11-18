# 🎬 YouTube Channel Video Link Extractor (Port 3030)

Công cụ Web Tool chuyên dụng để lấy toàn bộ danh sách link Video / Shorts từ một kênh YouTube, tự động sắp xếp theo thứ tự ngày public (mới nhất hoặc cũ nhất), hiển thị vào khối văn bản tối ưu hóa cho việc Copy & Paste vào Excel, thống kê tổng số link và hỗ trợ tải về file `.txt` / `.csv`.

---

## 🌟 Tính Năng Nổi Bật

1. **Tốc độ cực nhanh**: 
   - Sử dụng cơ chế cào trực tiếp qua YouTube InnerTube thông qua `yt-dlp` ở chế độ trích xuất luồng (flat lazy streaming).
   - Truyền dữ liệu trực tiếp về giao diện người dùng qua Server-Sent Events (SSE), hiển thị kết quả theo thời gian thực (real-time) mà không cần đợi tải xong cả kênh.
2. **Lựa chọn Videos hoặc Shorts**:
   - Tùy chọn lấy toàn bộ **Videos** dài hoặc toàn bộ **Shorts**.
   - Hỗ trợ định dạng link Shorts (`youtube.com/shorts/...` hoặc chuẩn `youtube.com/watch?v=...`).
3. **Sắp xếp theo thứ tự Public**:
   - Chuẩn thứ tự thời gian phát hành của YouTube: Mới nhất trước (Newest) hoặc Cũ nhất trước (Oldest).
   - Nút đổi thứ tự nhanh 1 chạm mà không cần tải lại dữ liệu.
4. **Khối hiển thị tối ưu cho Excel**:
   - Tùy chọn định dạng:
     - **Chỉ Link**: Mỗi dòng 1 URL, dán vào 1 cột trong Excel.
     - **Tiêu đề + Link**: Phân tách bằng dấu Tab (`\t`), dán vào Excel sẽ tự động tách thành Cột A (Tiêu đề) và Cột B (Link).
     - **Link + Tiêu đề**: Cột A (Link) và Cột B (Tiêu đề).
     - **Đầy đủ 5 cột**: STT, Tiêu đề, Link, Thời lượng, Lượt xem.
   - Nút **Sao Chép Cho Excel** 1-click đưa toàn bộ vào Clipboard.
5. **Đếm tổng số links (Total links counter)**:
   - Huy hiệu thống kê lớn, đếm động trực tiếp khi dữ liệu đang đổ về.
6. **Tải về file `.txt`**:
   - Nút **Tải File .TXT** với tên file tự động theo tên kênh và ngày tạo.
   - Kèm nút tải file `.CSV` (được gắn UTF-8 BOM chuẩn để mở trực tiếp trong Excel không bị lỗi font tiếng Việt).
7. **Bảng xem trước chi tiết (Preview Table)**:
   - Có thumbnail, tiêu đề, thời lượng, số lượt xem, tìm kiếm lọc nhanh theo từ khóa, copy từng link lẻ.

---

## 🚀 Hướng Dẫn Sử Dụng

### 1. Khởi chạy Web Server:
Cách 1: Nhấp đúp vào file `run.bat`
Cách 2: Chạy lệnh trong terminal:
```bash
python app.py
```

### 2. Mở trình duyệt:
Truy cập địa chỉ:
👉 **[http://localhost:3030](http://localhost:3030)**

### 3. Cách lấy link:
1. Nhập link kênh YouTube (ví dụ: `https://www.youtube.com/@TED`, `@TED` hoặc ID kênh `UC...`).
2. Chọn **Videos** hoặc **Shorts**.
3. Chọn thứ tự sắp xếp (**Mới nhất trước** hoặc **Cũ nhất trước**).
4. Bấm **Bắt Đầu Lấy Link**.
5. Sau khi lấy xong, bấm **Sao Chép Cho Excel** rồi mở file Excel của bạn và nhấn `Ctrl + V`!
6. Hoặc bấm **Tải File .TXT** để lưu danh sách về máy tính.
