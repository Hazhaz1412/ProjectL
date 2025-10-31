#!/bin/bash
# init-replica-multi-machine.sh - Script khởi tạo MongoDB Replica Set trên nhiều máy

# Thay đổi các IP address này theo máy thực tế của bạn
MACHINE1_IP="192.168.1.100"  # IP máy chủ (Primary)
MACHINE2_IP="192.168.1.101"  # IP máy phụ (Secondary)

echo "Waiting for MongoDB instances to be ready..."
sleep 30

echo "Initializing MongoDB Replica Set..."

# Kết nối tới Primary MongoDB và khởi tạo replica set
mongo mongodb://${MACHINE1_IP}:27017 <<EOF
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "${MACHINE1_IP}:27017", priority: 2 },
    { _id: 1, host: "${MACHINE2_IP}:27018", priority: 1 }
  ]
});

// Chờ replica set được khởi tạo
sleep(5000);

// Kiểm tra trạng thái
rs.status();

// Tạo user admin nếu cần
db.getSiblingDB('admin').createUser({
  user: 'admin',
  pwd: 'password',
  roles: [{ role: 'root', db: 'admin' }]
});

// Tạo database và collection cho ứng dụng
use lung_app;
db.createCollection('users');
db.createCollection('images');

EOF

echo "MongoDB Replica Set initialization completed!"