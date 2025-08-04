const express = require('express');
const { requireAdmin } = require('./auth.admin.middleware');
const router = express.Router();

const { ObjectId } = require('mongodb');
const { getDbWrite, getDbRead } = require('./db.rw');
 
router.get('/', requireAdmin, (req, res) => {
  res.json({ message: 'Bạn có quyền truy cập trang admin!', user: req.user });
});
 
router.post('/permissions', requireAdmin, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Permission name is required' });
  try {
    // Kiểm tra permission tồn tại (đọc)
    const dbRead = await getDbRead();
    const permissionsRead = dbRead.collection('permissions');
    const existing = await permissionsRead.findOne({ name });
    if (existing) return res.status(409).json({ message: 'Permission already exists' });
    
    // Tạo permission mới (ghi)
    const dbWrite = await getDbWrite();
    const permissions = dbWrite.collection('permissions');
    const result = await permissions.insertOne({ name, description: description || '', created_at: new Date() });
    res.status(201).json({ message: 'Permission created', id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
 
router.post('/roles', requireAdmin, async (req, res) => {
  const { name, description, permissions } = req.body;
  if (!name) return res.status(400).json({ message: 'Role name is required' });
  try {
    // Kiểm tra role tồn tại (đọc)
    const dbRead = await getDbRead();
    const rolesRead = dbRead.collection('roles');
    const existing = await rolesRead.findOne({ name });
    if (existing) return res.status(409).json({ message: 'Role already exists' }); 
    
    // Tạo role mới (ghi)
    const dbWrite = await getDbWrite();
    const roles = dbWrite.collection('roles');
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
 

router.patch('/users/permissions', requireAdmin, async (req, res) => {
  const { userIds, permissions } = req.body;
  if (!Array.isArray(userIds) || !Array.isArray(permissions)) {
    return res.status(400).json({ message: 'userIds và permissions phải là mảng' });
  }
  try {
    // Cập nhật permissions cho users (thao tác ghi)
    const dbWrite = await getDbWrite();
    const users = dbWrite.collection('users');
    const objectIds = userIds.map(id => new ObjectId(id)); 
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
 

router.patch('/users/roles', requireAdmin, async (req, res) => {
  const { userIds, roles } = req.body;
  if (!Array.isArray(userIds) || !Array.isArray(roles)) {
    return res.status(400).json({ message: 'userIds và roles phải là mảng' });
  }
  try {
    // Cập nhật roles cho users (thao tác ghi)
    const dbWrite = await getDbWrite();
    const users = dbWrite.collection('users');
    const objectIds = userIds.map(id => new ObjectId(id)); 
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
