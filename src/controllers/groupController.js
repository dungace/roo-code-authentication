const groupModel = require('../models/groupModel');

// Group controller
const groupController = {
  // Create a new group
  createGroup: async (req, res) => {
    try {
      const { name, description } = req.body;
      
      // Validate input
      if (!name) {
        return res.status(400).json({ message: 'Group name is required' });
      }
      
      // Create group
      const group = await groupModel.createGroup({
        name,
        description,
        createdBy: req.user.userId
      });
      
      // Add creator as admin
      await groupModel.addUserToGroup(req.user.userId, group.id, 'admin');
      
      res.status(201).json({
        message: 'Group created successfully',
        group
      });
    } catch (error) {
      console.error('Create group error:', error);
      res.status(500).json({ message: 'Failed to create group' });
    }
  },

  // Get all groups
  getGroups: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;
      const offset = (page - 1) * limit;
      
      const groups = await groupModel.getGroups(limit, offset);
      
      res.json({ groups });
    } catch (error) {
      console.error('Get groups error:', error);
      res.status(500).json({ message: 'Failed to get groups' });
    }
  },

  // Get group by ID
  getGroup: async (req, res) => {
    try {
      const { groupId } = req.params;
      
      const group = await groupModel.getGroupById(groupId);
      
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Get group members
      const members = await groupModel.getGroupUsers(groupId);
      
      res.json({
        group,
        members
      });
    } catch (error) {
      console.error('Get group error:', error);
      res.status(500).json({ message: 'Failed to get group' });
    }
  },

  // Update group
  updateGroup: async (req, res) => {
    try {
      const { groupId } = req.params;
      const { name, description } = req.body;
      
      // Check if group exists
      const group = await groupModel.getGroupById(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Check if user is admin of the group
      const userGroups = await groupModel.getUserGroups(req.user.userId);
      const userGroup = userGroups.find(g => g.id === groupId);
      
      if (!userGroup || userGroup.role !== 'admin') {
        return res.status(403).json({ message: 'You do not have permission to update this group' });
      }
      
      // Update group
      const updatedGroup = await groupModel.updateGroup(groupId, { name, description });
      
      res.json({
        message: 'Group updated successfully',
        group: updatedGroup
      });
    } catch (error) {
      console.error('Update group error:', error);
      res.status(500).json({ message: 'Failed to update group' });
    }
  },

  // Delete group
  deleteGroup: async (req, res) => {
    try {
      const { groupId } = req.params;
      
      // Check if group exists
      const group = await groupModel.getGroupById(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Check if user is admin of the group
      const userGroups = await groupModel.getUserGroups(req.user.userId);
      const userGroup = userGroups.find(g => g.id === groupId);
      
      if (!userGroup || userGroup.role !== 'admin') {
        return res.status(403).json({ message: 'You do not have permission to delete this group' });
      }
      
      // Delete group
      await groupModel.deleteGroup(groupId);
      
      res.json({ message: 'Group deleted successfully' });
    } catch (error) {
      console.error('Delete group error:', error);
      res.status(500).json({ message: 'Failed to delete group' });
    }
  },

  // Add user to group
  addUserToGroup: async (req, res) => {
    try {
      const { groupId } = req.params;
      const { userId, role } = req.body;
      
      // Validate input
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      // Check if group exists
      const group = await groupModel.getGroupById(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Check if user is admin of the group
      const userGroups = await groupModel.getUserGroups(req.user.userId);
      const userGroup = userGroups.find(g => g.id === groupId);
      
      if (!userGroup || userGroup.role !== 'admin') {
        return res.status(403).json({ message: 'You do not have permission to add users to this group' });
      }
      
      // Add user to group
      const result = await groupModel.addUserToGroup(userId, groupId, role || 'member');
      
      res.status(201).json({
        message: 'User added to group successfully',
        userGroup: result
      });
    } catch (error) {
      console.error('Add user to group error:', error);
      res.status(500).json({ message: 'Failed to add user to group' });
    }
  },

  // Remove user from group
  removeUserFromGroup: async (req, res) => {
    try {
      const { groupId, userId } = req.params;
      
      // Check if group exists
      const group = await groupModel.getGroupById(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Check if user is admin of the group
      const userGroups = await groupModel.getUserGroups(req.user.userId);
      const userGroup = userGroups.find(g => g.id === groupId);
      
      if (!userGroup || userGroup.role !== 'admin') {
        return res.status(403).json({ message: 'You do not have permission to remove users from this group' });
      }
      
      // Remove user from group
      await groupModel.removeUserFromGroup(userId, groupId);
      
      res.json({ message: 'User removed from group successfully' });
    } catch (error) {
      console.error('Remove user from group error:', error);
      res.status(500).json({ message: 'Failed to remove user from group' });
    }
  },

  // Update user role in group
  updateUserRole: async (req, res) => {
    try {
      const { groupId, userId } = req.params;
      const { role } = req.body;
      
      // Validate input
      if (!role) {
        return res.status(400).json({ message: 'Role is required' });
      }
      
      // Check if group exists
      const group = await groupModel.getGroupById(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Check if user is admin of the group
      const userGroups = await groupModel.getUserGroups(req.user.userId);
      const userGroup = userGroups.find(g => g.id === groupId);
      
      if (!userGroup || userGroup.role !== 'admin') {
        return res.status(403).json({ message: 'You do not have permission to update user roles in this group' });
      }
      
      // Update user role
      const result = await groupModel.updateUserRole(userId, groupId, role);
      
      res.json({
        message: 'User role updated successfully',
        userGroup: result
      });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ message: 'Failed to update user role' });
    }
  },

  // Get user's groups
  getUserGroups: async (req, res) => {
    try {
      const userId = req.params.userId || req.user.userId;
      
      const groups = await groupModel.getUserGroups(userId);
      
      res.json({ groups });
    } catch (error) {
      console.error('Get user groups error:', error);
      res.status(500).json({ message: 'Failed to get user groups' });
    }
  }
};

module.exports = groupController;
