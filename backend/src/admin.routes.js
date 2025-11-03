const express = require('express');
const { requireAuth } = require('./middleware/require-auth');
const { authorize } = require('./middleware/authorize');
const adminController = require('./controllers/admin.rbac.controller');

const router = express.Router();

router.use(requireAuth, authorize({ anyRole: ['system-admin'], anyPermission: ['admin.access'] }));

router.get('/', adminController.getAdminOverview);

router.get('/permissions', adminController.listPermissionsHandler);
router.post('/permissions', adminController.createPermissionHandler);
router.put('/permissions/:id', adminController.updatePermissionHandler);
router.delete('/permissions/:id', adminController.deletePermissionHandler);

router.get('/roles', adminController.listRolesHandler);
router.post('/roles', adminController.createRoleHandler);
router.put('/roles/:id', adminController.updateRoleHandler);
router.delete('/roles/:id', adminController.deleteRoleHandler);

router.patch('/users/roles', adminController.assignRolesHandler);
router.patch('/users/permissions', adminController.assignPermissionsHandler);
router.get('/users', adminController.listUsersHandler);

module.exports = router;
