const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Group model functions
const groupModel = {
  // Create a new group
  createGroup: async ({ name, description, createdBy }) => {
    const id = uuidv4();
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `
      INSERT INTO "${schema}".groups (id, name, description, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, name, description, created_by, created_at
    `;
    const values = [id, name, description, createdBy];
    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Get group by ID
  getGroupById: async (id) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `SELECT * FROM "${schema}".groups WHERE id = $1`;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Get all groups (with pagination)
  getGroups: async (limit = 10, offset = 0) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `
      SELECT g.*, u.display_name as creator_name
      FROM "${schema}".groups g
      LEFT JOIN "${schema}".users u ON g.created_by = u.id
      ORDER BY g.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await db.query(query, [limit, offset]);
    return result.rows;
  },

  // Update group
  updateGroup: async (groupId, { name, description }) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `
      UPDATE "${schema}".groups 
      SET name = $2, description = $3
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [groupId, name, description]);
    return result.rows[0];
  },

  // Delete group
  deleteGroup: async (groupId) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `DELETE FROM "${schema}".groups WHERE id = $1 RETURNING *`;
    const result = await db.query(query, [groupId]);
    return result.rows[0];
  },

  // Add user to group
  addUserToGroup: async (userId, groupId, role = 'member') => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `
      INSERT INTO "${schema}".user_groups (user_id, group_id, role, joined_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    const result = await db.query(query, [userId, groupId, role]);
    return result.rows[0];
  },

  // Remove user from group
  removeUserFromGroup: async (userId, groupId) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `DELETE FROM "${schema}".user_groups WHERE user_id = $1 AND group_id = $2 RETURNING *`;
    const result = await db.query(query, [userId, groupId]);
    return result.rows[0];
  },

  // Update user role in group
  updateUserRole: async (userId, groupId, role) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `
      UPDATE "${schema}".user_groups 
      SET role = $3
      WHERE user_id = $1 AND group_id = $2
      RETURNING *
    `;
    const result = await db.query(query, [userId, groupId, role]);
    return result.rows[0];
  },

  // Get all users in a group
  getGroupUsers: async (groupId, limit = 100, offset = 0) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `
      SELECT u.id, u.email, u.display_name, ug.role, ug.joined_at
      FROM "${schema}".users u
      JOIN "${schema}".user_groups ug ON u.id = ug.user_id
      WHERE ug.group_id = $1
      ORDER BY ug.joined_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await db.query(query, [groupId, limit, offset]);
    return result.rows;
  },

  // Get all groups for a user
  getUserGroups: async (userId) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    const query = `
      SELECT g.*, ug.role, ug.joined_at
      FROM "${schema}".groups g
      JOIN "${schema}".user_groups ug ON g.id = ug.group_id
      WHERE ug.user_id = $1
      ORDER BY ug.joined_at DESC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }
};

module.exports = groupModel;
