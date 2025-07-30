
# ProjectL - Dockerized Fullstack App

##  Quick Start (English & Tiếng Việt)

### 1️⃣ Build & Start Docker Containers  
**EN:** Build and launch all services using Docker Compose.  
**VN:** Build và khởi động tất cả dịch vụ bằng Docker Compose.

```powershell
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

## Notes | Lưu ý

- Make sure Docker and Docker Compose are installed.  
  Đảm bảo đã cài đặt Docker và Docker Compose.
- For more details, see each service's README or Dockerfile.  
  Xem thêm chi tiết trong README hoặc Dockerfile của từng dịch vụ.

---

