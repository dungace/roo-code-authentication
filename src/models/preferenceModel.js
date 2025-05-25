const db = require('../config/database');

// User preferences model functions
const preferenceModel = {
  // Get all preferences for a user
  getUserPreferences: async (userId) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `SELECT preference_key, preference_value FROM "${schema}".user_preferences WHERE user_id = $1`;
    const result = await db.query(query, [userId]);
    
    // Convert to a more usable object format
    const preferences = {};
    result.rows.forEach(row => {
      preferences[row.preference_key] = row.preference_value;
    });
    
    return preferences;
  },

  // Get a specific preference
  getUserPreference: async (userId, key) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `SELECT preference_value FROM "${schema}".user_preferences WHERE user_id = $1 AND preference_key = $2`;
    const result = await db.query(query, [userId, key]);
    return result.rows[0]?.preference_value || null;
  },

  // Set a preference (create or update)
  setUserPreference: async (userId, key, value) => {
    // Using upsert (insert or update) pattern with ON CONFLICT
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `
      INSERT INTO "${schema}".user_preferences (user_id, preference_key, preference_value)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, preference_key) 
      DO UPDATE SET preference_value = $3
      RETURNING *
    `;
    const result = await db.query(query, [userId, key, value]);
    return result.rows[0];
  },

  // Delete a preference
  deleteUserPreference: async (userId, key) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `DELETE FROM "${schema}".user_preferences WHERE user_id = $1 AND preference_key = $2 RETURNING *`;
    const result = await db.query(query, [userId, key]);
    return result.rows[0];
  },

  // Delete all preferences for a user
  deleteAllUserPreferences: async (userId) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `DELETE FROM "${schema}".user_preferences WHERE user_id = $1`;
    await db.query(query, [userId]);
    return true;
  }
};

module.exports = preferenceModel;
