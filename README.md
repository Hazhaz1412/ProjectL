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

Tạo file `.env` ở thư mục gốc (ProjectLung):

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

# AI service security keys (dùng cho kết nối bảo mật giữa backend và ai-service)
AI_API_KEY=lungai
AI_API_SECRET=supersecret

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
- **AI Service (FastAPI)**: http://localhost:8000

### Kết nối bảo mật giữa backend (Express) và ai-service (FastAPI)

Khi backend gọi API sang ai-service, phải truyền 2 header:

- `x-api-key: ${AI_API_KEY}`
- `x-api-secret: ${AI_API_SECRET}`

Hai giá trị này lấy từ file .env. Nếu không đúng, ai-service sẽ trả về lỗi 401.
### Một số route mặc định của AI service (FastAPI)

- `GET /health` — kiểm tra trạng thái service
- `GET /info` — thông tin service/model
- `GET /ping` — kiểm tra kết nối (trả về pong)
- `POST /predict` — nhận dữ liệu, trả về kết quả dự đoán (yêu cầu header bảo mật)

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
