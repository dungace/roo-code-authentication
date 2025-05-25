const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// User model functions
const userModel = {
  // Get user by email
  getUserByEmail: async (email) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `SELECT * FROM "${schema}".users WHERE email = $1`;
    const result = await db.query(query, [email]);
    return result.rows[0];
  },

  // Get user by ID
  getUserById: async (id) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `SELECT * FROM "${schema}".users WHERE id = $1`;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Create a new user
  createUser: async ({ email, passwordHash, displayName }) => {
    const id = uuidv4();
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `
      INSERT INTO "${schema}".users (id, email, password_hash, display_name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, email, display_name, created_at
    `;
    const values = [id, email, passwordHash, displayName || email.split('@')[0]];
    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Update user's last login time
  updateLastLogin: async (userId) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `UPDATE "${schema}".users SET last_login = NOW() WHERE id = $1 RETURNING *`;
    const result = await db.query(query, [userId]);
    return result.rows[0];
  },

  // Update user profile
  updateUser: async (userId, { displayName }) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `
      UPDATE "${schema}".users 
      SET display_name = $2
      WHERE id = $1
      RETURNING id, email, display_name, created_at, updated_at
    `;
    const result = await db.query(query, [userId, displayName]);
    return result.rows[0];
  },

  // Get all users (with pagination)
  getUsers: async (limit = 10, offset = 0) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `
      SELECT id, email, display_name, created_at, updated_at, last_login, is_active
      FROM "${schema}".users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await db.query(query, [limit, offset]);
    return result.rows;
  },

  // Count total users
  countUsers: async () => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `SELECT COUNT(*) FROM "${schema}".users`;
    const result = await db.query(query);
    return parseInt(result.rows[0].count, 10);
  },

  // Deactivate user
  deactivateUser: async (userId) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `UPDATE "${schema}".users SET is_active = FALSE WHERE id = $1 RETURNING *`;
    const result = await db.query(query, [userId]);
    return result.rows[0];
  },

  // Activate user
  activateUser: async (userId) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `UPDATE "${schema}".users SET is_active = TRUE WHERE id = $1 RETURNING *`;
    const result = await db.query(query, [userId]);
    return result.rows[0];
  }
};

module.exports = userModel;
