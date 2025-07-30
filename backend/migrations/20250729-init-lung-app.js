// Migration: create users, permissions, roles, authentication collections for RBAC
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
