module.exports = {
  async up(db) {
    const permissions = db.collection('permissions');
    const roles = db.collection('roles');

    await permissions.createIndex({ code: 1 }, { unique: true, name: 'uniq_permission_code' }).catch(() => {});
    await roles.createIndex({ code: 1 }, { unique: true, name: 'uniq_role_code' }).catch(() => {});

    const permissionDefinitions = [
      { code: 'admin.access', resource: 'admin', action: 'access', description: 'Truy cập bảng điều khiển admin' },
      { code: 'user.read', resource: 'user', action: 'read', description: 'Xem thông tin người dùng' },
      { code: 'user.write', resource: 'user', action: 'write', description: 'Chỉnh sửa người dùng' },
      { code: 'dataset.read', resource: 'dataset', action: 'read', description: 'Xem dữ liệu' },
      { code: 'dataset.write', resource: 'dataset', action: 'write', description: 'Quản trị dữ liệu' },
    ];

    const now = new Date();

    await Promise.all(
      permissionDefinitions.map((permission) =>
        permissions.updateOne(
          { code: permission.code },
          {
            $set: {
              resource: permission.resource,
              action: permission.action,
              description: permission.description,
              updated_at: now,
            },
            $setOnInsert: {
              created_at: now,
            },
          },
          { upsert: true },
        ),
      ),
    );

    const permissionDocs = await permissions
      .find({ code: { $in: permissionDefinitions.map((item) => item.code) } })
      .toArray();
    const permissionIdByCode = permissionDocs.reduce((acc, doc) => {
      acc[doc.code] = doc._id;
      return acc;
    }, {});

    const roleDefinitions = [
      {
        code: 'system-admin',
        name: 'System Administrator',
        description: 'Toàn quyền hệ thống',
        permissions: permissionDefinitions.map((item) => item.code),
      },
      {
        code: 'staff',
        name: 'Staff',
        description: 'Nhân sự vận hành',
        permissions: ['admin.access', 'user.read', 'dataset.read'],
      },
    ];

    await Promise.all(
      roleDefinitions.map((role) => {
        const permissionIds = role.permissions
          .map((code) => permissionIdByCode[code])
          .filter(Boolean);

        return roles.updateOne(
          { code: role.code },
          {
            $set: {
              name: role.name,
              description: role.description,
              permission_ids: permissionIds,
              updated_at: now,
            },
            $setOnInsert: {
              created_at: now,
            },
          },
          { upsert: true },
        );
      }),
    );
  },

  async down(db) {
    const permissions = db.collection('permissions');
    const roles = db.collection('roles');

    const roleCodes = ['system-admin', 'staff'];
    const permissionCodes = ['admin.access', 'user.read', 'user.write', 'dataset.read', 'dataset.write'];

    await roles.deleteMany({ code: { $in: roleCodes } });
    await permissions.deleteMany({ code: { $in: permissionCodes } });

    await roles.dropIndex('uniq_role_code').catch(() => {});
    await permissions.dropIndex('uniq_permission_code').catch(() => {});
  },
};
