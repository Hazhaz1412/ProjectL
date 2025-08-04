# ProjectLung - Hệ thống Full-stack với Read/Write Splitting

## Tổng quan kiến trúc

Hệ thống được thiết kế theo mô hình **Read/Write Splitting** với MongoDB Replica Set:

- **mongo-write**: Primary database (nhận tất cả thao tác ghi)
- **mongo-read**: Secondary database (chỉ nhận thao tác đọc)  
- **Redis**: Cache layer
- **Backend**: Node.js/Express API với JWT authentication, RBAC
- **Frontend**: React/Vite với Google reCAPTCHA v3

## Cách khởi động hệ thống

### 1. Chuẩn bị môi trường

Tạo file `.env` trong thư mục backend:

```env
# MongoDB Read/Write Splitting
MONGO_URI_WRITE=mongodb://mongo-write:27017/lung_app
MONGO_URI_READ=mongodb://mongo-read:27017/lung_app

# JWT và Security
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
RECAPTCHA_SECRET=your_google_recaptcha_v3_secret_key

# Email (để xác thực tài khoản)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password

# Google OAuth (nếu sử dụng)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# URL public
PUBLIC_URL=http://localhost:4000

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

USE_RATE_LIMIT=true
```


### 2. Khởi động hệ thống

```bash
# Bước 1: Khởi động tất cả services
docker-compose up -d
# Bước 3: Khởi tạo replica set (tự động, chỉ chạy 1 lần khi setup lần đầu)
docker-compose up init-mongo-replica

# Service này sẽ tự động khởi tạo replica set cho MongoDB. Sau khi thấy log "ok" hoặc không còn lỗi, bạn có thể dừng service này:
docker-compose stop init-mongo-replica
```

### 3. Chạy migration (tạo collections và indexes)

```bash
# Vào container backend
docker-compose exec backend sh

# Chạy migration (migrate-mongo sẽ tự động dùng DB write)
npm run migrate:up

# Thoát container
exit
```

### Truy cập hệ thống

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **MongoDB Write**: localhost:27017
- **MongoDB Read**: localhost:27018
- **Redis**: localhost:6379
- **Mongo Express (Write)**: http://localhost:8081 (admin/admin)
- **Mongo Express (Read)**: http://localhost:8082 (admin/admin)
- **DB Healthcheck**: http://localhost:9990/health

### Đồng bộ dữ liệu

MongoDB Replica Set tự động đồng bộ dữ liệu từ Primary (mongo-write) sang Secondary (mongo-read).  
Không cần viết code đồng bộ thủ công.

## Troubleshooting

### 1. MongoDB không khởi động

```bash
# Kiểm tra logs
docker-compose logs mongo-write
docker-compose logs mongo-read

# Xóa volumes và khởi động lại
docker-compose down -v
docker-compose up -d
```

### 2. Replica set chưa được khởi tạo

```bash
# Chạy lại script khởi tạo
docker-compose up init-mongo-replica
```

### 3. Backend không kết nối được DB

```bash
# Kiểm tra network
docker-compose exec backend ping mongo-write
docker-compose exec backend ping mongo-read

# Kiểm tra biến môi trường
docker-compose exec backend env | grep MONGO
```
