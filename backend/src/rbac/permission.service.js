const { ObjectId } = require('mongodb');
const { getDbWrite, getDbRead } = require('../db.rw');
const { invalidateUserContext } = require('./user-role.service');

function normalizeCode(code) {
  return typeof code === 'string' ? code.trim().toLowerCase() : '';
}

function ensureObjectId(id) {
  if (!id) return null;
  if (id instanceof ObjectId) return id;
  try {
    return new ObjectId(id);
  } catch (_err) {
    return null;
  }
}

async function createPermission({ code, resource, action, description }) {
  const normalized = normalizeCode(code);
  if (!normalized) {
    const error = new Error('Permission code is required');
    error.status = 400;
    throw error;
  }

  const db = await getDbWrite();
  const permissions = db.collection('permissions');

  const existing = await permissions.findOne({ code: normalized });
  if (existing) {
    const error = new Error('Permission already exists');
    error.status = 409;
    throw error;
  }

  const doc = {
    code: normalized,
    resource: resource || null,
    action: action || null,
    description: description || '',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const result = await permissions.insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

async function listPermissions() {
  const db = await getDbRead();
  const permissions = db.collection('permissions');
  return permissions
    .find({}, { projection: { code: 1, resource: 1, action: 1, description: 1, created_at: 1, updated_at: 1 } })
    .sort({ code: 1 })
    .toArray();
}

async function updatePermission(permissionIdOrCode, payload, { redis } = {}) {
  const db = await getDbWrite();
  const permissions = db.collection('permissions');

  const query = {};
  const permissionObjectId = ensureObjectId(permissionIdOrCode);
  if (permissionObjectId) {
    query._id = permissionObjectId;
  } else {
    const normalized = normalizeCode(permissionIdOrCode);
    if (!normalized) {
      const error = new Error('Permission identifier is invalid');
      error.status = 400;
      throw error;
    }
    query.code = normalized;
  }

  const permission = await permissions.findOne(query);
  if (!permission) {
    const error = new Error('Permission not found');
    error.status = 404;
    throw error;
  }

  const update = {
    $set: {
      updated_at: new Date(),
    },
  };

  if (Object.prototype.hasOwnProperty.call(payload, 'code')) {
    const normalized = normalizeCode(payload.code);
    if (!normalized) {
      const error = new Error('Permission code is invalid');
      error.status = 400;
      throw error;
    }
    update.$set.code = normalized;
  }

  ['resource', 'action', 'description'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      update.$set[field] = payload[field] || null;
    }
  });

  await permissions.updateOne({ _id: permission._id }, update);

  const updated = await permissions.findOne(
    { _id: permission._id },
    { projection: { code: 1, resource: 1, action: 1, description: 1, created_at: 1, updated_at: 1 } },
  );

  await invalidateCachesForPermission(db, permission._id, { redis });

  return updated;
}

async function deletePermission(permissionIdOrCode, { redis } = {}) {
  const db = await getDbWrite();
  const permissions = db.collection('permissions');
  const roles = db.collection('roles');
  const users = db.collection('users');

  const query = {};
  const permissionObjectId = ensureObjectId(permissionIdOrCode);
  if (permissionObjectId) {
    query._id = permissionObjectId;
  } else {
    const normalized = normalizeCode(permissionIdOrCode);
    if (!normalized) {
      const error = new Error('Permission identifier is invalid');
      error.status = 400;
      throw error;
    }
    query.code = normalized;
  }

  const permission = await permissions.findOne(query);
  if (!permission) {
    const error = new Error('Permission not found');
    error.status = 404;
    throw error;
  }

  await permissions.deleteOne({ _id: permission._id });

  await roles.updateMany(
    { permission_ids: permission._id },
    { $pull: { permission_ids: permission._id }, $set: { updated_at: new Date() } },
  );

  await users.updateMany(
    { extra_permissions: permission._id },
    { $pull: { extra_permissions: permission._id }, $set: { updated_at: new Date() } },
  );

  await invalidateCachesForPermission(db, permission._id, { redis });

  return permission;
}

async function invalidateCachesForPermission(db, permissionId, { redis } = {}) {
  if (!redis) return;

  const roles = db.collection('roles');
  const users = db.collection('users');

  const roleDocs = await roles
    .find({ permission_ids: permissionId }, { projection: { _id: 1 } })
    .toArray();
  const roleIds = roleDocs.map((role) => role._id);

  const conditions = [{ extra_permissions: permissionId }];
  if (roleIds.length) {
    conditions.push({ roles: { $in: roleIds } });
  }

  const affectedUsers = await users
    .find({ $or: conditions }, { projection: { _id: 1 } })
    .toArray();

  await Promise.all(
    affectedUsers.map((user) => invalidateUserContext(user._id, { redis })),
  );
}

module.exports = {
  createPermission,
  listPermissions,
  updatePermission,
  deletePermission,
};
