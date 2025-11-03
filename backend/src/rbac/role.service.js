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

async function resolvePermissionObjectIds(permissions, permissionsCollection) {
  const codes = [];
  const objectIds = [];

  (permissions || []).forEach((value) => {
    const objectId = ensureObjectId(value);
    if (objectId) {
      objectIds.push(objectId);
    } else if (typeof value === 'string') {
      codes.push(normalizeCode(value));
    }
  });

  if (codes.length) {
    const found = await permissionsCollection
      .find({ code: { $in: codes } }, { projection: { _id: 1 } })
      .toArray();
    found.forEach((permission) => objectIds.push(permission._id));
  }

  return objectIds;
}

async function createRole({ code, name, description, permissions }, { redis } = {}) {
  const normalized = normalizeCode(code);
  if (!normalized) {
    const error = new Error('Role code is required');
    error.status = 400;
    throw error;
  }

  const db = await getDbWrite();
  const roles = db.collection('roles');
  const permissionsCollection = db.collection('permissions');

  const existing = await roles.findOne({ code: normalized });
  if (existing) {
    const error = new Error('Role already exists');
    error.status = 409;
    throw error;
  }

  const permissionIds = await resolvePermissionObjectIds(permissions, permissionsCollection);

  const doc = {
    code: normalized,
    name: name || normalized,
    description: description || '',
    permission_ids: permissionIds,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const result = await roles.insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

async function listRoles() {
  const db = await getDbRead();
  const roles = db.collection('roles');
  return roles
    .find(
      {},
      {
        projection: {
          code: 1,
          name: 1,
          description: 1,
          permission_ids: 1,
          created_at: 1,
          updated_at: 1,
        },
      },
    )
    .sort({ code: 1 })
    .toArray();
}

async function updateRole(roleIdOrCode, payload, { redis } = {}) {
  const db = await getDbWrite();
  const roles = db.collection('roles');
  const permissionsCollection = db.collection('permissions');
  const users = db.collection('users');

  const query = {};
  const roleObjectId = ensureObjectId(roleIdOrCode);
  if (roleObjectId) {
    query._id = roleObjectId;
  } else {
    const normalized = normalizeCode(roleIdOrCode);
    if (!normalized) {
      const error = new Error('Role identifier is invalid');
      error.status = 400;
      throw error;
    }
    query.code = normalized;
  }

  const role = await roles.findOne(query);
  if (!role) {
    const error = new Error('Role not found');
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
      const error = new Error('Role code is invalid');
      error.status = 400;
      throw error;
    }
    update.$set.code = normalized;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
    update.$set.name = payload.name || '';
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
    update.$set.description = payload.description || '';
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'permissions')) {
    update.$set.permission_ids = await resolvePermissionObjectIds(payload.permissions, permissionsCollection);
  }

  const result = await roles.findOneAndUpdate({ _id: role._id }, update, {
    returnDocument: 'after',
    projection: {
      code: 1,
      name: 1,
      description: 1,
      permission_ids: 1,
      created_at: 1,
      updated_at: 1,
    },
  });

  const affectedUsers = await users
    .find({ roles: role._id }, { projection: { _id: 1 } })
    .toArray();

  await Promise.all(
    affectedUsers.map((user) => invalidateUserContext(user._id, { redis })),
  );

  return result.value;
}

async function deleteRole(roleIdOrCode, { redis } = {}) {
  const db = await getDbWrite();
  const roles = db.collection('roles');
  const users = db.collection('users');

  const query = {};
  const roleObjectId = ensureObjectId(roleIdOrCode);
  if (roleObjectId) {
    query._id = roleObjectId;
  } else {
    const normalized = normalizeCode(roleIdOrCode);
    if (!normalized) {
      const error = new Error('Role identifier is invalid');
      error.status = 400;
      throw error;
    }
    query.code = normalized;
  }

  const role = await roles.findOne(query);
  if (!role) {
    const error = new Error('Role not found');
    error.status = 404;
    throw error;
  }

  await roles.deleteOne({ _id: role._id });

  const affectedUsers = await users
    .find({ roles: role._id }, { projection: { _id: 1 } })
    .toArray();

  await users.updateMany(
    { roles: role._id },
    { $pull: { roles: role._id }, $set: { updated_at: new Date() } },
  );

  await Promise.all(
    affectedUsers.map((user) => invalidateUserContext(user._id, { redis })),
  );

  return role;
}

module.exports = {
  createRole,
  listRoles,
  updateRole,
  deleteRole,
};
