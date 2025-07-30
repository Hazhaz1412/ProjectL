// Example migration: create a collection named 'example'
module.exports = {
  async up(db, client) {
    await db.createCollection('example');
  },

  async down(db, client) {
    await db.collection('example').drop();
  }
};
