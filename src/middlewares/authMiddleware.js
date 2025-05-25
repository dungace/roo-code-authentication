const jwt = require('jsonwebtoken');
const sessionModel = require('../models/sessionModel');

// Authentication middleware
const authMiddleware = {
  // Verify JWT token
  verifyToken: async (req, res, next) => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
      }
      
      const token = authHeader.split(' ')[1];
      
      // Verify token validity
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if token exists in sessions table
      const session = await sessionModel.getSessionByToken(token);
      
      if (!session) {
        return res.status(401).json({ message: 'Invalid token or session expired' });
      }
      
      // Check if user is active
      if (!session.is_active) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }
      
      // Add user info to request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        sessionId: session.id
      };
      
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      
      console.error('Auth middleware error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  
  // Check if user is admin
  isAdmin: async (req, res, next) => {
    try {
      // This is a simplified example. In a real application, you would check
      // if the user has admin privileges in the database
      const adminEmails = ['admin@example.com']; // For demonstration purposes
      
      if (!adminEmails.includes(req.user.email)) {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }
      
      next();
    } catch (error) {
      console.error('Admin check error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  
  // Check if user belongs to a specific group
  isGroupMember: (groupId) => {
    return async (req, res, next) => {
      try {
        const { userId } = req.user;
        
        // Get user's groups
        const userGroups = await groupModel.getUserGroups(userId);
        
        // Check if user is a member of the specified group
        const isMember = userGroups.some(group => group.id === groupId);
        
        if (!isMember) {
          return res.status(403).json({ message: 'Access denied. Group membership required.' });
        }
        
        next();
      } catch (error) {
        console.error('Group membership check error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    };
  },
  
  // Check if user has admin role in a specific group
  isGroupAdmin: (groupId) => {
    return async (req, res, next) => {
      try {
        const { userId } = req.user;
        
        // Get user's groups
        const userGroups = await groupModel.getUserGroups(userId);
        
        // Check if user is an admin of the specified group
        const isAdmin = userGroups.some(group => group.id === groupId && group.role === 'admin');
        
        if (!isAdmin) {
          return res.status(403).json({ message: 'Access denied. Group admin privileges required.' });
        }
        
        next();
      } catch (error) {
        console.error('Group admin check error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    };
  }
};

module.exports = authMiddleware;
