# Hướng Dẫn Phát Triển Dự Án MiniAn

Dự án MiniAn đã được thiết lập với cấu trúc Monorepo (Frontend + Backend trong cùng một folder).

## 1. Cấu Trúc Dự Án

### Backend (`/backend`)
Sử dụng Node.js, Express, TypeScript, Prisma (ORM) và PostgreSQL.
- `src/server.ts`: File khởi chạy chính, đã tích hợp Socket.io.
- `src/routes`: Định nghĩa các API endpoint (Auth, Post, Chat...).
- `src/controllers`: Xử lý logic nghiệp vụ.
- `src/middleware`: Middleware (ví dụ: xác thực đăng nhập `authMiddleware`).
- `prisma/schema.prisma`: Định nghĩa cấu trúc Database.

### Frontend (`/frontend`)
Sử dụng React, Vite, TypeScript, TailwindCSS và Lucide Icons.
- `src/components/layout/Layout.tsx`: Layout chính với Sidebar (Desktop) và Bottom Nav (Mobile).
- `src/pages`: Các trang (Home, Login, Chat, Profile...).
- `src/context/AuthContext.tsx`: Quản lý trạng thái đăng nhập.
- `src/index.css`: Style toàn cục với thiết kế Glassmorphism.

## 2. Các Lệnh Cần Thiết

### Chạy Local (Môi trường phát triển)
Bạn cần mở 2 cửa sổ terminal (hoặc 2 tab).

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```
*Server sẽ chạy tại `http://localhost:5000`*

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
*Web sẽ chạy tại `http://localhost:5173`*

### Đẩy code lên GitHub
```bash
# Tại thư mục gốc (d:\demo\MiniAn)
git add .
git commit -m "Cập nhật cấu trúc dự án và giao diện mới"
git push origin main
```
*(Nếu chưa set remote, hãy chạy `git remote add origin https://github.com/annc19324/MiniAn.git` trước)*

## 3. Hướng dẫn phát triển tiếp theo

### Bước 1: Hoàn thiện tính năng Chat (Socket.io)
Hiện tại `server.ts` đã có Socket.io. Bạn cần:
1. Tạo `frontend/src/pages/Chat.tsx`.
2. Sử dụng `socket.io-client` để kết nối tới `http://localhost:5000`.
3. Gửi sự kiện `join_room` và `send_message`.

### Bước 2: Tạo API cho Bài viết (Post)
1. Trong `backend/src/controllers/postController.ts`: Viết hàm `createPost`, `getPosts`.
2. Trong `frontend/src/pages/Home.tsx`: Gọi API để lấy bài viết thật thay vì dữ liệu mẫu.

### Bước 3: Triển khai lên Id.vn (Nhân Hòa)
Để deploy Node.js lên hosting, bạn cần VPS hoặc Hosting có hỗ trợ Node.js.
1. **Database**: Thuê DB PostgreSQL hoặc dùng dịch vụ cloud (Neon, Supabase) nếu hosting không có sẵn.
2. **Backend**: 
   - Build code: `npm run build`.
   - Chạy bằng PM2: `pm2 start dist/server.js`.
3. **Frontend**:
   - Build code: `npm run build`.
   - Copy thư mục `dist` lên hosting (public_html).
   - Cấu hình file `.htaccess` hoặc Nginx để redirect tất cả về `index.html` (để React Router hoạt động).

## 4. Lưu ý về Thiết kế (Aesthetics)
Dự án đang sử dụng phong cách **Glassmorphism**:
- Class `.glass`: Nền mờ, hiệu ứng kính.
- Class `.glass-card`: Dùng cho các khung chứa nội dung (Card).
- Class `.glass-btn`: Button đẹp mắt.
- Class `.glass-input`: Input trong suốt.

Hãy luôn sử dụng các class này để giữ sự đồng bộ và đẹp mắt!
