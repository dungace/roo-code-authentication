const preferenceModel = require('../models/preferenceModel');

// User preferences controller
const preferenceController = {
  // Get all preferences for a user
  getUserPreferences: async (req, res) => {
    try {
      const userId = req.user.userId;
      
      const preferences = await preferenceModel.getUserPreferences(userId);
      
      res.json({ preferences });
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({ message: 'Failed to get preferences' });
    }
  },

  // Get a specific preference
  getUserPreference: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { key } = req.params;
      
      const value = await preferenceModel.getUserPreference(userId, key);
      
      if (value === null) {
        return res.status(404).json({ message: 'Preference not found' });
      }
      
      res.json({ key, value });
    } catch (error) {
      console.error('Get preference error:', error);
      res.status(500).json({ message: 'Failed to get preference' });
    }
  },

  // Set a preference
  setUserPreference: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { key } = req.params;
      const { value } = req.body;
      
      // Validate input
      if (value === undefined) {
        return res.status(400).json({ message: 'Preference value is required' });
      }
      
      const result = await preferenceModel.setUserPreference(userId, key, value);
      
      res.json({
        message: 'Preference set successfully',
        preference: {
          key: result.preference_key,
          value: result.preference_value
        }
      });
    } catch (error) {
      console.error('Set preference error:', error);
      res.status(500).json({ message: 'Failed to set preference' });
    }
  },

  // Delete a preference
  deleteUserPreference: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { key } = req.params;
      
      const result = await preferenceModel.deleteUserPreference(userId, key);
      
      if (!result) {
        return res.status(404).json({ message: 'Preference not found' });
      }
      
      res.json({ message: 'Preference deleted successfully' });
    } catch (error) {
      console.error('Delete preference error:', error);
      res.status(500).json({ message: 'Failed to delete preference' });
    }
  }
};

module.exports = preferenceController;
