module.exports = {
  async up(db, client) {
    const collection = db.collection('user_profiles');
    await collection.createIndex({ user_id: 1 }, { unique: true });
    // Có thể thêm các trường mặc định ở đây nếu muốn
    // await collection.insertOne({ ... });
  },
  async down(db, client) {
    await db.collection('user_profiles').drop();
  }
};
