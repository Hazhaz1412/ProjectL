const { createPermission, listPermissions, updatePermission, deletePermission } = require('../rbac/permission.service');
const { createRole, listRoles, updateRole, deleteRole } = require('../rbac/role.service');
const { assignRoles, assignExtraPermissions, loadUserContext } = require('../rbac/user-role.service');
const { getDbRead } = require('../db.rw');

function getRedis(req) {
  return req.app && typeof req.app.get === 'function' ? req.app.get('redis') : null;
}

function handleError(res, err) {
  const status = err.status || 500;
  const message = err.message || 'Server error';
  return res.status(status).json({ message });
}

async function getAdminOverview(req, res) {
  try {
    const context = req.userContext || (await loadUserContext(req.user.user_id, { redis: getRedis(req) }));
    res.json({
      message: 'Bạn có quyền truy cập trang admin!',
      user: {
        ...context,
        roles: Array.from(context.roles),
        permissions: Array.from(context.permissions),
      },
    });
  } catch (err) {
    handleError(res, err);
  }
}

async function createPermissionHandler(req, res) {
  try {
    const permission = await createPermission(req.body);
    res.status(201).json({ message: 'Permission created', permission });
  } catch (err) {
    handleError(res, err);
  }
}

async function listPermissionsHandler(req, res) {
  try {
    const permissions = await listPermissions();
    res.json({ permissions });
  } catch (err) {
    handleError(res, err);
  }
}

async function updatePermissionHandler(req, res) {
  try {
    const { id } = req.params;
    const permission = await updatePermission(id, req.body, { redis: getRedis(req) });
    res.json({ message: 'Permission updated', permission });
  } catch (err) {
    handleError(res, err);
  }
}

async function deletePermissionHandler(req, res) {
  try {
    const { id } = req.params;
    const permission = await deletePermission(id, { redis: getRedis(req) });
    res.json({ message: 'Permission deleted', permission });
  } catch (err) {
    handleError(res, err);
  }
}

async function createRoleHandler(req, res) {
  try {
    const role = await createRole(req.body, { redis: getRedis(req) });
    res.status(201).json({ message: 'Role created', role });
  } catch (err) {
    handleError(res, err);
  }
}

async function listRolesHandler(req, res) {
  try {
    const roles = await listRoles();
    res.json({ roles });
  } catch (err) {
    handleError(res, err);
  }
}

async function updateRoleHandler(req, res) {
  try {
    const { id } = req.params;
    const role = await updateRole(id, req.body, { redis: getRedis(req) });
    res.json({ message: 'Role updated', role });
  } catch (err) {
    handleError(res, err);
  }
}

async function deleteRoleHandler(req, res) {
  try {
    const { id } = req.params;
    const role = await deleteRole(id, { redis: getRedis(req) });
    res.json({ message: 'Role deleted', role });
  } catch (err) {
    handleError(res, err);
  }
}

async function assignRolesHandler(req, res) {
  const { userId, roles } = req.body;
  if (!userId || !Array.isArray(roles)) {
    return res.status(400).json({ message: 'userId và roles là bắt buộc' });
  }

  try {
    await assignRoles(userId, roles, { redis: getRedis(req) });
    res.json({ message: 'Cập nhật roles thành công' });
  } catch (err) {
    handleError(res, err);
  }
}

async function assignPermissionsHandler(req, res) {
  const { userId, permissions } = req.body;
  if (!userId || !Array.isArray(permissions)) {
    return res.status(400).json({ message: 'userId và permissions là bắt buộc' });
  }

  try {
    await assignExtraPermissions(userId, permissions, { redis: getRedis(req) });
    res.json({ message: 'Cập nhật quyền thành công' });
  } catch (err) {
    handleError(res, err);
  }
}

async function listUsersHandler(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const db = await getDbRead();
    const users = db.collection('users');
    const cursor = users
      .find(
        {},
        {
          projection: {
            email: 1,
            roles: 1,
            extra_permissions: 1,
            is_active: 1,
            is_staff: 1,
            is_superuser: 1,
            created_at: 1,
            updated_at: 1,
          },
        },
      )
      .sort({ created_at: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const [items, total] = await Promise.all([cursor.toArray(), users.countDocuments()]);

    res.json({
      data: items.map((item) => ({
        ...item,
        _id: item._id.toHexString(),
        roles: (item.roles || []).map((id) => id.toString()),
        extra_permissions: (item.extra_permissions || []).map((id) => id.toString()),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
      },
    });
  } catch (err) {
    handleError(res, err);
  }
}

module.exports = {
  getAdminOverview,
  createPermissionHandler,
  listPermissionsHandler,
  updatePermissionHandler,
  deletePermissionHandler,
  createRoleHandler,
  listRolesHandler,
  updateRoleHandler,
  deleteRoleHandler,
  assignRolesHandler,
  assignPermissionsHandler,
  listUsersHandler,
};
