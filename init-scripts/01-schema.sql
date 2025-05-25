-- Basic schema for innopilot_dev database

-- Create dev schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS dev;

-- Users table
CREATE TABLE dev.users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Groups table
CREATE TABLE dev.groups (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL
);

-- User-Group relationship (many-to-many)
CREATE TABLE dev.user_groups (
  user_id VARCHAR(36) NOT NULL,
  group_id VARCHAR(36) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- e.g., 'admin', 'member'
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, group_id),
  FOREIGN KEY (user_id) REFERENCES dev.users(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES dev.groups(id) ON DELETE CASCADE
);

-- Sessions table
CREATE TABLE dev.sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES dev.users(id) ON DELETE CASCADE
);

-- User preferences table
CREATE TABLE dev.user_preferences (
  user_id VARCHAR(36) NOT NULL,
  preference_key VARCHAR(255) NOT NULL,
  preference_value TEXT,
  PRIMARY KEY (user_id, preference_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_sessions_user_id ON dev.sessions(user_id);
CREATE INDEX idx_sessions_token ON dev.sessions(token);
CREATE INDEX idx_user_preferences_user_id ON dev.user_preferences(user_id);
CREATE INDEX idx_groups_name ON dev.groups(name);
CREATE INDEX idx_user_groups_user_id ON dev.user_groups(user_id);
CREATE INDEX idx_user_groups_group_id ON dev.user_groups(group_id);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON dev.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON dev.groups
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
