-- Test data for development environment
-- Only runs in development mode

-- Insert test users with bcrypt hashed passwords (password is 'password123')
INSERT INTO dev.users (id, email, password_hash, display_name, created_at, updated_at, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'admin@example.com', '$2a$10$eCQYn5sBKSJaGXCh7LWBVeJoJquzpRGxZKmTcub5HZOr5hQFzGYPO', 'Admin User', NOW(), NOW(), TRUE),
  ('22222222-2222-2222-2222-222222222222', 'user@example.com', '$2a$10$eCQYn5sBKSJaGXCh7LWBVeJoJquzpRGxZKmTcub5HZOr5hQFzGYPO', 'Regular User', NOW(), NOW(), TRUE),
  ('33333333-3333-3333-3333-333333333333', 'dev@example.com', '$2a$10$eCQYn5sBKSJaGXCh7LWBVeJoJquzpRGxZKmTcub5HZOr5hQFzGYPO', 'Developer', NOW(), NOW(), TRUE),
  ('44444444-4444-4444-4444-444444444444', 'tester@example.com', '$2a$10$eCQYn5sBKSJaGXCh7LWBVeJoJquzpRGxZKmTcub5HZOr5hQFzGYPO', 'Tester', NOW(), NOW(), TRUE);

-- Insert test groups
INSERT INTO dev.groups (id, name, description, created_at, updated_at, created_by)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Administrators', 'System administrators with full access', NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Developers', 'Development team', NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Testers', 'QA team', NOW(), NOW(), '11111111-1111-1111-1111-111111111111');

-- Insert test user preferences
INSERT INTO dev.user_preferences (user_id, preference_key, preference_value)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'theme', 'dark'),
  ('11111111-1111-1111-1111-111111111111', 'notificationsEnabled', 'true'),
  ('22222222-2222-2222-2222-222222222222', 'theme', 'light'),
  ('22222222-2222-2222-2222-222222222222', 'notificationsEnabled', 'false'),
  ('33333333-3333-3333-3333-333333333333', 'theme', 'dark'),
  ('44444444-4444-4444-4444-444444444444', 'theme', 'system');

-- Insert user-group relationships
INSERT INTO dev.user_groups (user_id, group_id, role, joined_at)
VALUES
  -- Admin user in Administrators group as admin
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin', NOW()),
  -- Regular user in Developers group as member
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'member', NOW()),
  -- Developer in Developers group as admin
  ('33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin', NOW()),
  -- Tester in Testers group as admin
  ('44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'admin', NOW()),
  -- Developer also in Testers group as member
  ('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'member', NOW());
