const express = require('express');
const { requireAdmin } = require('./auth.admin.middleware');
const router = express.Router();

const { ObjectId } = require('mongodb');
const { getDb } = require('./db');

// Route kiểm tra quyền admin/staff
router.get('/', requireAdmin, (req, res) => {
  res.json({ message: 'Bạn có quyền truy cập trang admin!', user: req.user });
});

// Thêm quyền mới
router.post('/permissions', requireAdmin, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Permission name is required' });
  try {
    const db = await getDb();
    const permissions = db.collection('permissions');
    const existing = await permissions.findOne({ name });
    if (existing) return res.status(409).json({ message: 'Permission already exists' });
    const result = await permissions.insertOne({ name, description: description || '', created_at: new Date() });
    res.status(201).json({ message: 'Permission created', id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Tạo group quyền (role)
router.post('/roles', requireAdmin, async (req, res) => {
  const { name, description, permissions } = req.body;
  if (!name) return res.status(400).json({ message: 'Role name is required' });
  try {
    const db = await getDb();
    const roles = db.collection('roles');
    const existing = await roles.findOne({ name });
    if (existing) return res.status(409).json({ message: 'Role already exists' });
    // permissions: array of permission names or ids
    const role = {
      name,
      description: description || '',
      permissions: Array.isArray(permissions) ? permissions : [],
      created_at: new Date()
    };
    const result = await roles.insertOne(role);
    res.status(201).json({ message: 'Role created', id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

// Cập nhật nhiều quyền cho nhiều user cùng lúc

router.patch('/users/permissions', requireAdmin, async (req, res) => {
  const { userIds, permissions } = req.body;
  if (!Array.isArray(userIds) || !Array.isArray(permissions)) {
    return res.status(400).json({ message: 'userIds và permissions phải là mảng' });
  }
  try {
    const db = await getDb();
    const users = db.collection('users');
    const objectIds = userIds.map(id => new ObjectId(id));
    // Nếu permissions là mảng id string, convert sang ObjectId
    const permissionIds = permissions.map(id => new ObjectId(id));
    const result = await users.updateMany(
      { _id: { $in: objectIds } },
      { $set: { extra_permissions: permissionIds, updated_at: new Date() } }
    );
    res.json({ message: 'Cập nhật quyền thành công', modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Cập nhật nhiều roles cho nhiều user cùng lúc

router.patch('/users/roles', requireAdmin, async (req, res) => {
  const { userIds, roles } = req.body;
  if (!Array.isArray(userIds) || !Array.isArray(roles)) {
    return res.status(400).json({ message: 'userIds và roles phải là mảng' });
  }
  try {
    const db = await getDb();
    const users = db.collection('users');
    const objectIds = userIds.map(id => new ObjectId(id));
    // Nếu roles là mảng id string, convert sang ObjectId
    const roleIds = roles.map(id => new ObjectId(id));
    const result = await users.updateMany(
      { _id: { $in: objectIds } },
      { $set: { roles: roleIds, updated_at: new Date() } }
    );
    res.json({ message: 'Cập nhật roles thành công', modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
