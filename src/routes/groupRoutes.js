const express = require('express');
const groupController = require('../controllers/groupController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// All group routes require authentication
router.use(authMiddleware.verifyToken);

// Group management routes
router.post('/', groupController.createGroup);
router.get('/', groupController.getGroups);
router.get('/:groupId', groupController.getGroup);
router.put('/:groupId', groupController.updateGroup);
router.delete('/:groupId', groupController.deleteGroup);

// Group membership routes
router.post('/:groupId/users', groupController.addUserToGroup);
router.delete('/:groupId/users/:userId', groupController.removeUserFromGroup);
router.put('/:groupId/users/:userId/role', groupController.updateUserRole);

// Get user's groups
router.get('/user/:userId?', groupController.getUserGroups);

module.exports = router;
