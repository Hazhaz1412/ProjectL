 
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
 
function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET); 
    if (payload.is_superuser || payload.is_staff) {
      req.user = payload;
      return next();
    }
    return res.status(403).json({ message: 'Permission denied: not admin/staff' });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token', error: err.message });
  }
}

module.exports = { requireAdmin };
