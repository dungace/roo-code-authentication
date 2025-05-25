const express = require('express');
const preferenceController = require('../controllers/preferenceController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// All preference routes require authentication
router.use(authMiddleware.verifyToken);

// User preferences routes
router.get('/', preferenceController.getUserPreferences);
router.get('/:key', preferenceController.getUserPreference);
router.put('/:key', preferenceController.setUserPreference);
router.delete('/:key', preferenceController.deleteUserPreference);

module.exports = router;
