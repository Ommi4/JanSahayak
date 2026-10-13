const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getUsers,
  getSchemes,
  getSchemeById,
  createScheme,
  updateScheme,
  toggleSchemeStatus,
  deleteScheme,
} = require('../controllers/adminController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

// All admin routes are strictly guarded by JWT authentication + admin role check
router.use(protect, requireAdmin);

// Dashboard metrics
router.get('/dashboard', getDashboardStats);

// User overview
router.get('/users', getUsers);

// Scheme management CRUD
router.get('/schemes', getSchemes);
router.get('/schemes/:id', getSchemeById);
router.post('/schemes', createScheme);
router.put('/schemes/:id', updateScheme);
router.patch('/schemes/:id/status', toggleSchemeStatus);
router.delete('/schemes/:id', deleteScheme);

module.exports = router;
