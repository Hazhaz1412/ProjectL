# ProjectLung - Hệ thống Full-stack với AI Service

## Tổng quan kiến trúc

Hệ thống bao gồm các thành phần chính:

- **MongoDB**: Database chính
- **Redis**: Cache layer
- **Backend**: Node.js/Express API với JWT authentication, RBAC
- **Frontend**: React/Vite với Google reCAPTCHA v3
- **AI Service**: FastAPI service với ViT model và image processing (thay thế image-processor C++)

## Cách khởi động hệ thống

### 1. Chuẩn bị môi trường

Tạo file `.env` ở thư mục gốc (ProjectLung):

```env
# MongoDB
MONGO_URI_WRITE=mongodb://mongo:27017/lung_app
MONGO_URI_READ=mongodb://mongo:27017/lung_app

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

# Image processing security keys (cùng service với AI, port 8001)
IMAGE_API_KEY=lungimage
IMAGE_API_SECRET=supersecretimage

USE_RATE_LIMIT=true
```


### 2. Khởi động hệ thống

```bash
# Khởi động tất cả các service chính
docker-compose up -d backend frontend db-healthcheck mongo mongo-express redis ai-service

# Hoặc khởi động toàn bộ hệ thống
docker-compose up -d
```

### 3. Chạy migration (tạo collections và indexes)

```bash
# Vào container backend
docker-compose exec backend sh

# Chạy migration
npm run migrate:up

# Thoát container
exit
```


### Truy cập hệ thống

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379
- **Mongo Express**: http://localhost:8081 (admin/admin)
- **DB Healthcheck**: http://localhost:9990/health
- **AI Service (FastAPI)**: http://localhost:8000
  - `/predict` - AI prediction với ViT model
  - `/process_image` - Image processing (port 8001)
  - `/info` - Thông tin service và model
  - `/image/info` - Thông tin image processing operations

### Kết nối bảo mật giữa backend (Express) và ai-service (FastAPI)

#### AI Prediction Endpoints
Khi backend gọi API sang ai-service để prediction, phải truyền 2 header:
- `x-api-key: ${AI_API_KEY}`
- `x-api-secret: ${AI_API_SECRET}`

#### Image Processing Endpoints
Khi backend gọi API sang ai-service để xử lý ảnh, phải truyền 2 header:
- `x-api-key: ${IMAGE_API_KEY}`
- `x-api-secret: ${IMAGE_API_SECRET}`

Các giá trị này lấy từ file .env. Nếu không đúng, ai-service sẽ trả về lỗi 401.

### Các route của AI service (FastAPI)

**AI Prediction:**
- `GET /health` — kiểm tra trạng thái service
- `GET /info` — thông tin service/model
- `GET /ping` — kiểm tra kết nối (trả về pong)
- `POST /predict` — prediction với base64 image (yêu cầu AI auth headers)
- `POST /predict_file` — prediction với file upload (yêu cầu AI auth headers)
- `POST /reload_model` — reload ViT model (yêu cầu AI auth headers)

**Image Processing:**
- `GET /image/info` — danh sách operations hỗ trợ
- `POST /process_image` — xử lý ảnh với base64 (yêu cầu IMAGE auth headers)
- `POST /process_image_file` — xử lý ảnh với file upload (yêu cầu IMAGE auth headers)

**Supported Image Operations:**
- `resize`, `grayscale`, `blur`, `sharpen`, `enhance`, `brightness`
- `denoise`, `rotate`, `flip`, `crop`, `edge_detect`, `normalize`

## Troubleshooting

### 1. MongoDB không khởi động

```bash
# Kiểm tra logs
docker-compose logs mongo

# Xóa volumes và khởi động lại
docker-compose down -v
docker-compose up -d
```

### 2. Backend không kết nối được DB

```bash
# Kiểm tra network
docker-compose exec backend ping mongo

# Kiểm tra biến môi trường
docker-compose exec backend env | grep MONGO
```

### 3. AI Service không load được model

```bash
# Kiểm tra logs
docker-compose logs ai-service

# Rebuild ai-service
docker-compose build ai-service
docker-compose up -d ai-service

# Kiểm tra model đã được copy vào container chưa
docker-compose exec ai-service ls -la vit.pkl
```

### 4. Rebuild tất cả services

```bash
# Dừng tất cả
docker-compose down

# Build lại tất cả
docker-compose build

# Khởi động lại
docker-compose up -d
```
