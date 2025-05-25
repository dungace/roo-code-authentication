const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Session model functions
const sessionModel = {
  // Create a new session
  createSession: async ({ userId, token, expiresAt }) => {
    const id = uuidv4();
    const query = `
      INSERT INTO "${process.env.DB_SCHEMA || 'dev'}".sessions (id, user_id, token, expires_at, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, user_id, token, expires_at, created_at
    `;
    const values = [id, userId, token, expiresAt];
    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Get session by token
  getSessionByToken: async (token) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `
      SELECT s.*, u.email, u.display_name, u.is_active
      FROM "${schema}".sessions s
      JOIN "${schema}".users u ON s.user_id = u.id
      WHERE s.token = $1 AND s.expires_at > NOW()
    `;
    const result = await db.query(query, [token]);
    return result.rows[0];
  },

  // Delete session (logout)
  deleteSession: async (token) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `DELETE FROM "${schema}".sessions WHERE token = $1`;
    await db.query(query, [token]);
    return true;
  },

  // Delete all sessions for a user
  deleteUserSessions: async (userId) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `DELETE FROM "${schema}".sessions WHERE user_id = $1`;
    await db.query(query, [userId]);
    return true;
  },

  // Delete expired sessions
  deleteExpiredSessions: async () => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `DELETE FROM "${schema}".sessions WHERE expires_at <= NOW()`;
    const result = await db.query(query);
    return result.rowCount;
  }
};

module.exports = sessionModel;
