const { loadUserContext } = require('../rbac/user-role.service');

function authorize({ anyRole = [], allRoles = [], anyPermission = [], allPermissions = [], allowInactive = false } = {}) {
  return async (req, res, next) => {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const redis = req.app && typeof req.app.get === 'function' ? req.app.get('redis') : null;
      const context = await loadUserContext(req.user.user_id, { redis });

      if (!allowInactive && !context.isActive && !context.isSuperuser) {
        return res.status(403).json({ message: 'Account is inactive' });
      }

      let authorized = context.isSuperuser;

      if (!authorized && allRoles.length) {
        authorized = allRoles.every((role) => context.roles.has(role));
      }

      if (!authorized && anyRole.length) {
        authorized = anyRole.some((role) => context.roles.has(role));
      }

      if (!authorized && allPermissions.length) {
        authorized = allPermissions.every((permission) => context.permissions.has(permission));
      }

      if (!authorized && anyPermission.length) {
        authorized = anyPermission.some((permission) => context.permissions.has(permission));
      }

      if (!authorized) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      req.userContext = context;
      return next();
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ message: err.message || 'Authorization failed' });
    }
  };
}

module.exports = { authorize };
