# ProjectL - Dockerized Fullstack App

##  Quick Start (English & Tiếng Việt)

### 1️⃣ Build & Start Docker Containers  
**EN:** Build and launch all services using Docker Compose.  
**VN:** Build và khởi động tất cả dịch vụ bằng Docker Compose.



```powershell
npm install
docker compose build --no-cache
docker compose up -d
```

**EN:** If you see errors about Node modules, delete the `node_modules` folder and try again:  
**VN:** Nếu gặp lỗi về Node.js module, hãy xóa thư mục `node_modules` và thử lại:

```powershell
Remove-Item -Recurse -Force node_modules
docker compose build --no-cache
docker compose up -d
```

---

### 2️⃣ Run Database Migration  
**EN:** After containers are running, apply database migrations:  
**VN:** Sau khi Docker chạy thành công, thực hiện migration database:

```powershell
npm run migrate:up
```

---

### 3️⃣ Cấu hình môi trường backend (.env)
**EN:** Before running, create a `.env` file in the `backend/` folder with the following variables:
**VN:** Trước khi chạy, tạo file `.env` trong thư mục `backend/` với các biến sau:

```env
# Google reCAPTCHA v3 secret key (lấy từ Google admin, không chia sẻ công khai)
RECAPTCHA_SECRET=your_recaptcha_secret

# Email config (dùng để gửi mail xác thực)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password

# JWT secret key
JWT_SECRET=your_jwt_secret

# MongoDB connection
MONGO_URI=mongodb://mongo:27017/mydb
DB_NAME=lung_app

# Google OAuth (nếu dùng)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Link public (dùng cho email xác thực)
PUBLIC_URL=http://localhost:5173/

# Redis config
REDIS_HOST=redis
REDIS_PORT=6379
```

**Lưu ý:**
- Không commit file `.env` chứa secret lên git!
- Nếu có file `.env.example`, hãy copy thành `.env` rồi điền giá trị thật.

---

## Notes | Lưu ý

- Make sure Docker and Docker Compose are installed.  
  Đảm bảo đã cài đặt Docker và Docker Compose.
- For more details, see each service's README or Dockerfile.  
  Xem thêm chi tiết trong README hoặc Dockerfile của từng dịch vụ.

---

