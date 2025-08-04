// Migration: create users, permissions, roles, authentication collections for RBAC
// Hệ thống này hướng tới Read/Write Splitting: 1 DB chuyên ghi, 1 DB chuyên đọc
// Khi migrate, chỉ cần chạy trên DB ghi (primary)
// Khi code app, hãy dùng 2 client: 1 cho ghi (write), 1 cho đọc (read)

module.exports = {
  async up(db, client) {
    // users collection
    await db.createCollection('users');
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ roles: 1 });
    await db.collection('users').createIndex({ extra_permissions: 1 });

    await db.createCollection('permissions');

    await db.createCollection('roles');
    await db.collection('roles').createIndex({ name: 1 }, { unique: true });

    await db.createCollection('authentication');
  },

  async down(db, client) {
    await db.collection('users').drop();
    await db.collection('permissions').drop();
    await db.collection('roles').drop();
    await db.collection('authentication').drop();
  }
};

// Gợi ý cho code app:
// 1. Đặt biến môi trường:
//    MONGO_URI_WRITE=mongodb://primary_host:27017/lung_app
//    MONGO_URI_READ=mongodb://secondary_host:27017/lung_app
// 2. Tạo 2 MongoClient:
//    const mongoClientWrite = new MongoClient(process.env.MONGO_URI_WRITE)
//    const mongoClientRead = new MongoClient(process.env.MONGO_URI_READ)
// 3. Tạo 2 hàm getDbWrite(), getDbRead() trả về DB tương ứng
// 4. Route ghi (register, update, delete...): dùng getDbWrite()
//    Route đọc (my_profile, list...): dùng getDbRead()
