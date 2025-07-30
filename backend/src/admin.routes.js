const express = require('express');
const { requireAdmin } = require('./auth.admin.middleware');
const router = express.Router();

// Route kiểm tra quyền admin/staff
router.get('/', requireAdmin, (req, res) => {
  res.json({ message: 'Bạn có quyền truy cập trang admin!', user: req.user });
});

module.exports = router;
