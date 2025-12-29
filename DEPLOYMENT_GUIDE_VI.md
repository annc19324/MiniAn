# Hướng Dẫn Deploy Ứng Dụng MiniAn lên VPS (Domain .id.vn Nhân Hòa)

# Hướng Dẫn Deploy Ứng Dụng MiniAn lên VPS (Domain .id.vn Nhân Hòa)

## Bước 0: Kiểm tra gói dịch vụ của bạn
Bạn nói rằng "trường đã đăng ký free", nhưng chúng ta cần biết chính xác đó là dịch vụ gì.
1.  Truy cập trang quản lý: [https://customer.nhanhoa.com/](https://customer.nhanhoa.com/)
2.  Đăng nhập tài khoản.
3.  Vào menu **Dịch vụ** > **Cloud Server** (hoặc **Cloud VPS**).
    *   Nếu thấy có dịch vụ đang chạy: Tuyệt vời, bạn có VPS. Hãy tìm **IP Address** và **Mật khẩu root** (thường gửi trong Email kích hoạt).
4.  Nếu không thấy Cloud Server, hãy vào menu **Hosting**.
    *   Nếu chỉ có Hosting: Đây là gói chia sẻ (Shared Hosting) chạy Apache/DirectAdmin.
    *   ❌ **Vấn đề:** Hosting thường chỉ chạy tốt PHP (WordPress). Ứng dụng **Node.js + Socket.io (Chat realtime)** của chúng ta **RẤT KHÓ** chạy trên Hosting thường vì không được mở cổng (Port) riêng.
    *   ✅ **Giải pháp:** Nếu bạn chỉ có Hosting, chúng ta sẽ phải:
        *   Deploy Frontend lên Hosting (Dễ).
        *   Deploy Backend lên một server miễn phí khác như **Render.com** hoặc **Railway.app** (Tôi sẽ hướng dẫn nếu bạn xác nhận mình không có VPS).

*Tài liệu dưới đây giả định bạn CÓ VPS (Cloud Server) hoặc đã cài được Linux.*

---

## 1. Chuẩn bị VPS

### 1.1. Mua VPS và Tên Miền
*   **VPS**: Bạn cần một Cloud Server (VPS). Cấu hình tối thiểu khuyến nghị: 1 Core CPU, 2GB RAM, Ubuntu 20.04 hoặc 22.04 LTS.
*   **Domain**: Đăng ký tên miền `.id.vn` tại Nhân Hòa.

### 1.2. Trỏ Tên Miền
*   Vào trang quản lý tên miền của Nhân Hòa (DNS Management).
*   Tạo 2 bản ghi (Record) trỏ về địa chỉ IP của VPS:
    *   **Record A**: Host `@` -> `IP_CUA_VPS`
    *   **Record A**: Host `www` -> `IP_CUA_VPS`

---

## 2. Cài đặt Môi trường trên VPS

### ⚠️ Lưu ý Quan trọng: Xử lý Apache có sẵn
Nếu khi vào trang web bạn thấy dòng chữ **"Apache is functioning normally"**, nghĩa là VPS của bạn đã được cài sẵn Apache (thường là do DirectAdmin hoặc template mặc định).
Để cài đặt theo hướng dẫn này (dùng Nginx), bạn cần **TẮT Apache** để giải phóng cổng 80.

Chạy lệnh sau trên Terminal (SSH):
```bash
sudo service httpd stop
sudo systemctl disable httpd
# Hoặc nếu tên service là apache2:
sudo service apache2 stop
sudo systemctl disable apache2
```
*Nếu bạn dùng Shared Hosting (không có quyền root/SSH), hướng dẫn này không áp dụng được. Bạn chỉ có thể upload file build React lên thư mục `public_html` qua FileZilla, nhưng Backend Node.js và Socket.io sẽ rất khó chạy trên hosting thường.*

SSH vào VPS của bạn (sử dụng PuTTY hoặc Terminal):
```bash
ssh root@IP_CUA_VPS
```

### 2.1. Cập nhật hệ thống
```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2. Cài đặt Node.js (v18 trở lên)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2.3. Cài đặt Nginx (Web Server)
```bash
sudo apt install -y nginx
```

### 2.4. Cài đặt PostgreSQL (Database)
```bash
sudo apt install -y postgresql postgresql-contrib
```

### 2.5. Cài đặt PM2 (Quản lý process Node.js)
```bash
sudo npm install -g pm2
```

---

## 3. Cấu hình Database (PostgreSQL)

Đăng nhập vào Postgres:
```bash
sudo -u postgres psql
```

Tạo Database và User (Thay `minian_password` bằng mật khẩu bảo mật của bạn):
```sql
CREATE DATABASE minian_db;
CREATE USER minian_user WITH ENCRYPTED PASSWORD 'minian_password';
GRANT ALL PRIVILEGES ON DATABASE minian_db TO minian_user;
-- Cho phép user toàn quyền trên schema public (Postgres 15+)
\c minian_db
GRANT ALL ON SCHEMA public TO minian_user;
\q
```

---

## 4. Deploy Backend

### 4.1. Upload Code hoặc Clone Git
Cách tốt nhất là đẩy code lên GitHub rồi clone về VPS. Giả sử bạn clone vào `/var/www/minian`.

```bash
mkdir -p /var/www/minian
cd /var/www/minian
# Clone repo của bạn về đây (hoặc upload file zip và giải nén)
# Ví dụ: git clone https://github.com/your-username/minian.git .
```

### 4.2. Cài đặt Backend
```bash
cd backend
npm install
```

### 4.3. Cấu hình biến môi trường
Tạo file `.env`:
```bash
nano .env
```
Nội dung `.env` (Sửa lại cho đúng IP và mật khẩu DB):
```env
PORT=5000
DATABASE_URL="postgresql://minian_user:minian_password@localhost:5432/minian_db"
JWT_SECRET="mot_chuoi_bi_mat_rat_dai_va_ngau_nhien"
# URL của Frontend khi chạy thật
CLIENT_URL="https://ten-mien-cua-ban.id.vn"
```
Lưu file: Nhấn `Ctrl+O`, `Enter`, `Ctrl+X`.

### 4.4. Build và Chạy Backend
Setup Database Prisma:
```bash
npx prisma generate
npx prisma migrate deploy
```

Chạy Server với PM2:
```bash
npm run build # (Nếu typescript cần build, nhưng ta dùng ts-node-dev ở dev. Ở prod nên build ra JS hoặc dùng ts-node)
# Cách đơn giản nhất cho TypeScript ở production:
npm install -g typescript ts-node
pm2 start src/server.ts --name "minian-backend" --interpreter ts-node
pm2 save
pm2 startup
```

---

## 5. Deploy Frontend

### 5.1. Cấu hình Frontend
Trên máy tính cá nhân của bạn (Local), mở file `.env` trong thư mục frontend và sửa lại URL backend thành domain thật:

```env
VITE_API_URL=https://ten-mien-cua-ban.id.vn/api
VITE_SOCKET_URL=https://ten-mien-cua-ban.id.vn
```
(Lưu ý: Chúng ta sẽ dùng Nginx để proxy `/api` nên để URL domain chính cũng được, hoặc setup subdomain `api.ten-mien...` tùy ý. Hướng dẫn này sẽ dùng chung domain chính).

### 5.2. Build Frontend
Tại máy local:
```bash
cd frontend
npm run build
```
Sau khi chạy xong, thư mục `dist` sẽ được tạo ra.

### 5.3. Upload Frontend lên VPS
Bạn cần upload toàn bộ nội dung trong thư mục `dist` (local) lên thư mục `/var/www/minian/frontend/dist` (trên VPS).
Bạn có thể dùng FileZilla hoặc SCP để upload.

---

## 6. Cấu hình Nginx (Kết nối tất cả)

Tạo file cấu hình Nginx:
```bash
sudo nano /etc/nginx/sites-available/minian
```

Dán nội dung sau vào (Thay `ten-mien-cua-ban.id.vn` bằng domain thật):

```nginx
server {
    listen 80;
    server_name ten-mien-cua-ban.id.vn www.ten-mien-cua-ban.id.vn;

    root /var/www/minian/frontend/dist;
    index index.html;

    # Cấu hình cho React Router (F5 không lỗi 404)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests về Backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy hình ảnh uploads (nếu lưu local)
    location /uploads {
        alias /var/www/minian/backend/uploads;
    }

    # Cấu hình cho Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Kích hoạt cấu hình:
```bash
sudo ln -s /etc/nginx/sites-available/minian /etc/nginx/sites-enabled/
sudo nginx -t # Kiểm tra lỗi cú pháp
sudo systemctl restart nginx
```

---

## 7. Cài đặt SSL (HTTPS miễn phí)

Để web chạy bảo mật (có ổ khóa) và tính năng Copy/Paste hoạt động tốt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ten-mien-cua-ban.id.vn -d www.ten-mien-cua-ban.id.vn
```
Làm theo hướng dẫn trên màn hình.

---

## 8. Hoàn tất
Truy cập vào tên miền của bạn và tận hưởng kết quả!

**Lưu ý:**
*   Đảm bảo thư mục lưu ảnh (`backend/uploads`) có quyền ghi:
    ```bash
    chmod -R 755 /var/www/minian/backend/uploads
    ```
*   Nếu gặp lỗi, kiểm tra log:
    *   Backend: `pm2 logs`
    *   Nginx: `sudo tail -f /var/log/nginx/error.log`
