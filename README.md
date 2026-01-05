# 🌟 MiniAn - Mạng Xã Hội / Social Network


**MiniAn** là một nền tảng mạng xã hội đa nền tảng, tích hợp các tính năng tương tác thời gian thực, bảng xếp hạng thi đua. Dự án được xây dựng với mục tiêu mang lại trải nghiệm người dùng mượt mà, giao diện hiện đại và khả năng mở rộng cao.

---

## 🚀 Tính Năng Nổi Bật / Key Features

### 💬 Hệ Thống Chat Real-time (Thời Gian Thực)
- **Nhắn tin tức thì (Instant Messaging):** Sử dụng Socket.io cho độ trễ thấp nhất.
- **Tiện ích chat:** Hỗ trợ thu hồi, chỉnh sửa tin nhắn, thông báo đã xem (seen).
- **Phân trang thông minh:** Tải tin nhắn cũ mượt mà khi cuộn (Infinite Scroll).
- **Nhóm chat:** Tạo nhóm, quản lý thành viên, đổi tên/ảnh nhóm.

### 🔔 Thông Báo Đẩy (Push Notifications)
- **Thông báo đa nền tảng:** Nhận thông báo tin nhắn và tương tác ngay cả khi đóng ứng dụng (Service Worker & Web Push).
- **Tương thích:** Hoạt động trên Desktop (Chrome, Edge, Firefox) và Mobile (Android, iOS - Add to Home Screen).

### 🏆 Gamification & Bảng Xếp Hạng (Leaderboard)
- **Hệ thống xu (Coins):** Tích lũy xu qua các hoạt động tương tác hàng ngày.
- **Vinh danh:** Bảng xếp hạng Top User theo thời gian thực.
- **Huy hiệu:** Nhận danh hiệu VIP và các icon đặc biệt.

### 📱 Giao Diện Responsive & Hiện Đại
- **Thiết kế Glassmorphism:** Giao diện kính mờ sang trọng, tối ưu cho cả Dark Mode và Light Mode.
- **Trải nghiệm Mobile-First:** Thanh điều hướng và bố cục tối ưu cho thao tác chạm vuốt trên di động.
- **Ẩn thanh cuộn tinh tế:** Tối ưu không gian hiển thị nội dung.

### 🛠️ Quản Trị Hệ Thống (Admin Dashboard)
- **Thống kê tổng quan:** Số lượng người dùng, truy cập, VIP...
- **Quản lý người dùng:** Xem danh sách, tìm kiếm, ban/unban, cấp quyền VIP/Admin.
- **Quản lý tài chính:** Cộng/trừ xu cho thành viên trực tiếp từ Dashboard.

---

## 🛠️ Công Nghệ Sử Dụng

### Frontend
- **Framework:** [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **State Management:** Zustand
- **Icons:** Lucide React

### Backend
- **Runtime:** [Node.js](https://nodejs.org/)
- **Framework:** [Express.js](https://expressjs.com/)
- **Database:** PostgreSQL
- **ORM:** [Prisma](https://www.prisma.io/)
- **Real-time:** Socket.io
- **Media Storage:** Cloudinary
- **Push & Security:** Web-push, BCrypt, JWT

---

## 📦 Cài Đặt & Chạy Dự Án / Installation

### Yêu cầu tiên quyết
- Node.js (v20 trở lên)
- PostgreSQL
- Tài khoản Cloudinary (để lưu ảnh)

### 1. Backend Setup
```bash
cd backend
npm install

# Cấu hình .env (tham khảo .env.example)
# DATABASE_URL=...
# CLOUDINARY_...
# VAPID_KEYS...

# Khởi tạo Database
npx prisma migrate dev --name init
npx prisma generate

# Chạy server
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install

# Cấu hình .env
# VITE_API_URL=http://localhost:5000/api
# VITE_SOCKET_URL=http://localhost:5000
# VITE_VAPID_PUBLIC_KEY=...

# Chạy ứng dụng
npm run dev
```

---

## 🤝 Đóng Góp / Contribution
Mọi đóng góp đều được hoan nghênh! Hãy tạo Pull Request hoặc mở Issue để thảo luận về các tính năng mới.

---

## 📄 Bản Quyền
Dự án được phát triển bởi **MiniAn Team**.
