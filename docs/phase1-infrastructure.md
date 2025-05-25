# Role: senior nodejs developer 

# Phase 1: Infrastructure Setup

## Overview
This phase focuses on establishing the infrastructure for the authentication system of the InnoPilot extension, including the backend API and integration with the extension. The system will use Node.js, Express, and SQL database according to the defined technical stack.

## Tasks

### 1. Backend Authentication Service

#### 1.1 Set up the backend project
- Create a new Node.js project with a clear directory structure
- Install necessary dependencies: Express, SQL driver, JWT, bcrypt
- Set up dev, test, and prod environments

```javascript
// Recommended directory structure
innopilot-auth-api/
├── src/
│   ├── config/         // Application configuration
│   ├── controllers/    // Request/response logic handling
│   ├── middlewares/    // Authentication middleware, logging
│   ├── models/         // Data model definitions
│   ├── routes/         // API endpoints definitions
│   ├── services/       // Business logic
│   └── utils/          // Utilities
├── .env.sample         // Sample env file
├── .gitignore
├── package.json
└── server.js           // Entry point
```

#### 1.2 Set up the database
- Create separate PostgreSQL databases for dev, test, and prod
- Design schema for users, sessions, and user_preferences tables
- Set up migration and seeding
- Use Docker Compose for local development

```sql
-- Basic schema for database
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Groups table for organizing users
CREATE TABLE groups (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL
);

-- User-Group relationship (many-to-many)
CREATE TABLE user_groups (
  user_id VARCHAR(36) NOT NULL,
  group_id VARCHAR(36) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- e.g., 'admin', 'member'
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, group_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

CREATE TABLE sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_preferences (
  user_id VARCHAR(36) NOT NULL,
  preference_key VARCHAR(255) NOT NULL,
  preference_value TEXT,
  PRIMARY KEY (user_id, preference_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 1.3 Implement API Endpoints
- Create RESTful API endpoints for authentication
- Implement JWT authentication
- Set up rate limiting and security headers
- Add group management endpoints

```javascript
// Example structure for authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');

// User registration function
const register = async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    // Check if email already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create new user
    const userId = uuidv4();
    await db.createUser({
      id: userId,
      email,
      passwordHash,
      displayName: displayName || email.split('@')[0]
    });
    
    res.status(201).json({ 
      message: 'User registered successfully',
      userId
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
};

// Login function
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
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
      { expiresIn: '24h' }
    );
    
    // Save session
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    await db.createSession({
      id: sessionId,
      userId: user.id,
      token,
      expiresAt
    });
    
    // Update last login
    await db.updateUserLastLogin(user.id);
    
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
};

module.exports = {
  register,
  login,
  // Add other functions: logout, refreshToken, etc.
};
```

### 2. Extension Authentication Client

#### 2.1 Create Authentication Service in Extension
- Implement API client to call the backend
- Manage token and authentication state
- Handle login/logout events

```typescript
// Example structure for authService.ts
import * as vscode from 'vscode';

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  token: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
}

// API endpoints
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.innopilot.com'
  : 'http://localhost:3000';

const ENDPOINTS = {
  REGISTER: `${API_BASE_URL}/auth/register`,
  LOGIN: `${API_BASE_URL}/auth/login`,
  LOGOUT: `${API_BASE_URL}/auth/logout`,
  USER_PROFILE: `${API_BASE_URL}/auth/profile`,
  GROUPS: `${API_BASE_URL}/groups`,
  GROUP_MEMBERS: (groupId: string) => `${API_BASE_URL}/groups/${groupId}/members`,
  USER_GROUPS: (userId: string) => `${API_BASE_URL}/users/${userId}/groups`,
};

// Event emitter
const authStateChanged = new vscode.EventEmitter<AuthState>();

// Auth service
export const authService = {
  // State
  currentState: {
    isAuthenticated: false,
    user: null,
    token: null
  } as AuthState,
  
  // Events
  onAuthStateChanged: authStateChanged.event,
  
  // Initialize
  initialize: async (context: vscode.ExtensionContext) => {
    // Get token from secure storage
    const token = await context.secrets.get('innopilot.auth.token');
    
    if (token) {
      try {
        // Validate token and get user information
        const response = await fetch(ENDPOINTS.USER_PROFILE, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const user = await response.json();
          
          // Update state
          authService.currentState = {
            isAuthenticated: true,
            user,
            token
          };
          
          // Emit event
          authStateChanged.fire(authService.currentState);
        } else {
          // Invalid token, delete it
          await context.secrets.delete('innopilot.auth.token');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      }
    }
  },
  
  // Register
  register: async (email: string, password: string, displayName?: string) => {
    try {
      const response = await fetch(ENDPOINTS.REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  // Login
  login: async (context: vscode.ExtensionContext, email: string, password: string) => {
    try {
      const response = await fetch(ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      const data = await response.json();
      
      // Save token
      await context.secrets.store('innopilot.auth.token', data.token);
      
      // Update state
      authService.currentState = {
        isAuthenticated: true,
        user: data.user,
        token: data.token
      };
      
      // Emit event
      authStateChanged.fire(authService.currentState);
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  // Logout
  logout: async (context: vscode.ExtensionContext) => {
    try {
      const { token } = authService.currentState;
      
      if (token) {
        // Call logout API
        await fetch(ENDPOINTS.LOGOUT, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      }
      
      // Delete token
      await context.secrets.delete('innopilot.auth.token');
      
      // Reset state
      authService.currentState = {
        isAuthenticated: false,
        user: null,
        token: null
      };
      
      // Emit event
      authStateChanged.fire(authService.currentState);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }
};
```

#### 2.2 Secure Storage Utilities
- Use VS Code SecretStorage API to store tokens
- Implement utility functions to manage user data locally

```typescript
// Example structure for secureStorage.ts
import * as vscode from 'vscode';

// Key constants
const AUTH_TOKEN_KEY = 'innopilot.auth.token';
const USER_PROFILE_KEY = 'innopilot.user.profile';

// SecretStorage utilities
export const secureStorage = {
  // Save token
  saveToken: async (context: vscode.ExtensionContext, token: string): Promise<void> => {
    await context.secrets.store(AUTH_TOKEN_KEY, token);
  },
  
  // Get token
  getToken: async (context: vscode.ExtensionContext): Promise<string | undefined> => {
    return await context.secrets.get(AUTH_TOKEN_KEY);
  },
  
  // Delete token
  deleteToken: async (context: vscode.ExtensionContext): Promise<void> => {
    await context.secrets.delete(AUTH_TOKEN_KEY);
  },
  
  // Save user profile to globalState (non-sensitive)
  saveUserProfile: async (context: vscode.ExtensionContext, profile: any): Promise<void> => {
    await context.globalState.update(USER_PROFILE_KEY, profile);
  },
  
  // Get user profile
  getUserProfile: (context: vscode.ExtensionContext): any => {
    return context.globalState.get(USER_PROFILE_KEY);
  },
  
  // Delete user profile
  deleteUserProfile: async (context: vscode.ExtensionContext): Promise<void> => {
    await context.globalState.update(USER_PROFILE_KEY, undefined);
  },
  
  // Clear all authentication data
  clearAllAuthData: async (context: vscode.ExtensionContext): Promise<void> => {
    await secureStorage.deleteToken(context);
    await secureStorage.deleteUserProfile(context);
  }
};
```

### 3. Event System for Auth State Changes
- Set up event emitters for authentication state changes
- Create subscription methods for components to react to auth changes
- Implement logging for authentication events (respecting privacy)

```typescript
// Example structure for authEvents.ts
import * as vscode from 'vscode';
import { AuthState } from './authService';

// Event types
export enum AuthEventType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PROFILE_UPDATE = 'profile_update',
  PASSWORD_CHANGE = 'password_change',
  SESSION_EXPIRED = 'session_expired',
}

// Event data interface
export interface AuthEvent {
  type: AuthEventType;
  timestamp: number;
  // No sensitive data included in events
}

// Create event emitters
export const authEvents = {
  // Auth state change event
  onAuthStateChanged: new vscode.EventEmitter<AuthState>(),
  
  // Auth event emitter (for specific events)
  onAuthEvent: new vscode.EventEmitter<AuthEvent>(),
  
  // Fire auth state change event
  fireStateChange: (state: AuthState): void => {
    authEvents.onAuthStateChanged.fire(state);
  },
  
  // Fire auth event
  fireEvent: (type: AuthEventType): void => {
    const event: AuthEvent = {
      type,
      timestamp: Date.now(),
    };
    
    authEvents.onAuthEvent.fire(event);
    
    // Log event (respecting privacy)
    console.log(`Auth event: ${type} at ${new Date(event.timestamp).toISOString()}`);
  },
  
  // Dispose event emitters
  dispose: (): void => {
    authEvents.onAuthStateChanged.dispose();
    authEvents.onAuthEvent.dispose();
  }
};
```

## Implementation Notes
- Backend uses Node.js and Express according to the defined technical stack
- Database uses SQL with separate environments for dev, test, and prod
- Extension uses a functional programming model, without classes
- All API endpoints are protected by HTTPS
- JWT is used for authentication between the extension and backend
- Passwords are hashed with bcrypt before being stored in the database

## Deployment Considerations
- Set up separate environments for dev, test, and production
- Configure environment variables for each environment
- Use a server that can be accessed from the internet
- Configure CORS to only allow the extension to call the API
- Use HTTPS with a valid SSL certificate
- Set up monitoring and logging
- Configure backup for the database

## Expected Results

After completing Phase 1, we will have:

1. Complete Backend Authentication Service with:
   - API endpoints for registration, login, logout
   - SQL database to store user information
   - Secure authentication handling with JWT and bcrypt

2. Extension Authentication Client with:
   - API client to call the backend
   - Secure token storage with VS Code SecretStorage
   - Authentication state and event management

This infrastructure will be the foundation for subsequent phases, allowing us to build authentication UI and user profile management features.

## Testing
- Write unit tests for both backend and extension client
- Test API endpoints with Postman or similar tools
- Check security with tools like OWASP ZAP

## Dependencies
- Backend: Express, PostgreSQL, JWT, bcrypt
- Extension: VS Code API, node-fetch or axios

## Local Development Setup

### PostgreSQL with Docker Compose

For local development, we use Docker Compose to run PostgreSQL. The setup includes:

1. A PostgreSQL 14 container with the following configuration:
   - Database name: `innopilot_auth`
   - Username: `innopilot`
   - Password: `innopilot_password`
   - Port: `5432` (mapped to host)

2. Initialization scripts that automatically:
   - Create the database schema (tables, indexes, triggers)
   - Seed test data for development

3. Persistent volume for data storage

To start the database:

```bash
# From the project root directory
docker-compose up -d
```

To stop the database:

```bash
docker-compose down
```

To reset the database (delete all data):

```bash
docker-compose down -v
docker-compose up -d
```
