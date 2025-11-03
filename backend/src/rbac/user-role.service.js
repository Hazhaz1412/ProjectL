const { ObjectId } = require('mongodb');
const { getDbRead, getDbWrite } = require('../db.rw');

const CACHE_TTL_SECONDS = parseInt(process.env.RBAC_CACHE_TTL_SECONDS || '300', 10);

function ensureObjectId(id) {
  if (!id) return null;
  if (id instanceof ObjectId) return id;
  try {
    return new ObjectId(id);
  } catch (_err) {
    return null;
  }
}

function hydrateContext(raw) {
  if (!raw) return null;
  return {
    ...raw,
    roles: new Set(raw.roles || []),
    permissions: new Set(raw.permissions || []),
  };
}

async function cacheContext(redis, cacheKey, context) {
  if (!redis || !redis.set) return;
  const payload = {
    ...context,
    roles: Array.from(context.roles),
    permissions: Array.from(context.permissions),
  };
  try {
    await redis.set(cacheKey, JSON.stringify(payload), 'EX', CACHE_TTL_SECONDS);
  } catch (err) {
    console.warn('RBAC cache write error:', err.message);
  }
}

async function readCachedContext(redis, cacheKey) {
  if (!redis || !redis.get) return null;
  try {
    const cached = await redis.get(cacheKey);
    if (!cached) return null;
    return hydrateContext(JSON.parse(cached));
  } catch (err) {
    console.warn('RBAC cache read error:', err.message);
    return null;
  }
}

async function loadUserContext(userId, { redis, prefetchedUser } = {}) {
  const userObjectId = ensureObjectId(userId);
  if (!userObjectId) {
    const error = new Error('Invalid user id');
    error.status = 400;
    throw error;
  }

  const cacheKey = `rbac:ctx:${userObjectId.toHexString()}`;
  const cached = await readCachedContext(redis, cacheKey);
  if (cached) {
    return cached;
  }

  const db = await getDbRead();
  const users = db.collection('users');
  const rolesCollection = db.collection('roles');
  const permissionsCollection = db.collection('permissions');

  let user = prefetchedUser;
  if (!user) {
    user = await users.findOne(
      { _id: userObjectId },
      {
        projection: {
          password: 0,
        },
      },
    );
  }

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const normalizedUserObjectId = ensureObjectId(user._id) || userObjectId;

  const roleObjectIds = (user.roles || [])
    .map(ensureObjectId)
    .filter(Boolean);

  const extraPermissionObjectIds = (user.extra_permissions || [])
    .map(ensureObjectId)
    .filter(Boolean);

  const roles = roleObjectIds.length
    ? await rolesCollection
        .find(
          { _id: { $in: roleObjectIds } },
          { projection: { code: 1, name: 1, permission_ids: 1 } },
        )
        .toArray()
    : [];

  const permissionIdsFromRoles = new Set();
  roles.forEach((role) => {
    (role.permission_ids || [])
      .map(ensureObjectId)
      .filter(Boolean)
      .forEach((id) => permissionIdsFromRoles.add(id.toHexString()));
  });

  extraPermissionObjectIds.forEach((id) => permissionIdsFromRoles.add(id.toHexString()));

  const permissionObjectIds = Array.from(permissionIdsFromRoles).map((id) => new ObjectId(id));

  const permissions = permissionObjectIds.length
    ? await permissionsCollection
        .find(
          { _id: { $in: permissionObjectIds } },
          { projection: { code: 1, description: 1 } },
        )
        .toArray()
    : [];

  const context = {
    userId: normalizedUserObjectId.toHexString(),
    email: user.email,
    isActive: !!user.is_active,
    isSuperuser: !!user.is_superuser,
    isStaff: !!user.is_staff,
    roleIds: roleObjectIds.map((id) => id.toHexString()),
    roles: new Set(
      roles
        .map((role) => role.code || role.name)
        .filter(Boolean),
    ),
    permissions: new Set(
      permissions
        .map((permission) => permission.code)
        .filter(Boolean),
    ),
  };

  await cacheContext(redis, cacheKey, context);
  return context;
}

async function invalidateUserContext(userId, { redis } = {}) {
  const userObjectId = ensureObjectId(userId);
  if (!userObjectId || !redis || !redis.del) return;
  try {
    await redis.del(`rbac:ctx:${userObjectId.toHexString()}`);
  } catch (err) {
    console.warn('RBAC cache invalidate error:', err.message);
  }
}

async function assignRoles(userId, roleIdsOrCodes, { redis } = {}) {
  const db = await getDbWrite();
  const users = db.collection('users');
  const rolesCollection = db.collection('roles');

  const userObjectId = ensureObjectId(userId);
  if (!userObjectId) {
    const error = new Error('Invalid user id');
    error.status = 400;
    throw error;
  }

  const roleCodes = [];
  const roleObjectIds = [];

  (roleIdsOrCodes || []).forEach((value) => {
    const objectId = ensureObjectId(value);
    if (objectId) {
      roleObjectIds.push(objectId);
    } else if (typeof value === 'string') {
      roleCodes.push(value);
    }
  });

  if (roleCodes.length) {
    const roles = await rolesCollection
      .find({ code: { $in: roleCodes } }, { projection: { _id: 1 } })
      .toArray();
    roles.forEach((role) => roleObjectIds.push(role._id));
  }

  const uniqueRoleIds = Array.from(new Set(roleObjectIds.map((id) => id.toHexString()))).map((id) => new ObjectId(id));

  await users.updateOne(
    { _id: userObjectId },
    {
      $set: {
        roles: uniqueRoleIds,
        updated_at: new Date(),
      },
    },
  );

  await invalidateUserContext(userObjectId, { redis });
}

async function assignExtraPermissions(userId, permissionIdsOrCodes, { redis } = {}) {
  const db = await getDbWrite();
  const users = db.collection('users');
  const permissionsCollection = db.collection('permissions');

  const userObjectId = ensureObjectId(userId);
  if (!userObjectId) {
    const error = new Error('Invalid user id');
    error.status = 400;
    throw error;
  }

  const permissionCodes = [];
  const permissionObjectIds = [];

  (permissionIdsOrCodes || []).forEach((value) => {
    const objectId = ensureObjectId(value);
    if (objectId) {
      permissionObjectIds.push(objectId);
    } else if (typeof value === 'string') {
      permissionCodes.push(value);
    }
  });

  if (permissionCodes.length) {
    const permissions = await permissionsCollection
      .find({ code: { $in: permissionCodes } }, { projection: { _id: 1 } })
      .toArray();
    permissions.forEach((permission) => permissionObjectIds.push(permission._id));
  }

  const uniquePermissionIds = Array.from(new Set(permissionObjectIds.map((id) => id.toHexString()))).map(
    (id) => new ObjectId(id),
  );

  await users.updateOne(
    { _id: userObjectId },
    {
      $set: {
        extra_permissions: uniquePermissionIds,
        updated_at: new Date(),
      },
    },
  );

  await invalidateUserContext(userObjectId, { redis });
}

module.exports = {
  loadUserContext,
  invalidateUserContext,
  assignRoles,
  assignExtraPermissions,
};
