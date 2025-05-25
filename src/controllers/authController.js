const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const sessionModel = require('../models/sessionModel');
const db = require('../config/database');

// Authentication controller
const authController = {
  // Register a new user
  register: async (req, res) => {
    try {
      const { email, password, displayName } = req.body;
      
      // Validate input
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      // Check if email already exists
      const existingUser = await userModel.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create new user
      const user = await userModel.createUser({
        email,
        passwordHash,
        displayName
      });
      
      res.status(201).json({ 
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  },

  // Login user
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Validate input
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      // Find user
      const user = await userModel.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({ message: 'Account is deactivated' });
      }
      
      // Check password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Create JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      
      // Calculate expiration time for the session
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now
      
      // Save session
      await sessionModel.createSession({
        userId: user.id,
        token,
        expiresAt
      });
      
      // Update last login
      await userModel.updateLastLogin(user.id);
      
      console.log('Login successful');
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  },

  // Logout user
  logout: async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (token) {
        await sessionModel.deleteSession(token);
      }
      
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Logout failed' });
    }
  },

  // Get current user profile
  getProfile: async (req, res) => {
    try {
      const user = await userModel.getUserById(req.user.userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at,
        lastLogin: user.last_login
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Failed to get profile' });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const { displayName } = req.body;
      
      const updatedUser = await userModel.updateUser(req.user.userId, { displayName });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.display_name,
        updatedAt: updatedUser.updated_at
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }
      
      // Get user
      const user = await userModel.getUserById(req.user.userId);
      
      // Verify current password
      const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);
      
      // Update password in database
      const query = 'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id';
      const result = await db.query(query, [passwordHash, req.user.userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Invalidate all existing sessions
      await sessionModel.deleteUserSessions(req.user.userId);
      
      res.json({ message: 'Password changed successfully. Please login again.' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Failed to change password' });
    }
  }
};

module.exports = authController;
