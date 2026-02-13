-- Phase 10: Authentication & Multi-Tenancy Tables

-- Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer', 'analyst')),
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Refresh Tokens Table (for secure token rotation)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- Seed Demo Organizations
INSERT INTO organizations (id, name, plan, industry) VALUES
  ('org_alpha', 'Alpha SaaS Inc.', 'enterprise', 'B2B SaaS'),
  ('org_beta', 'Beta Commerce', 'pro', 'E-commerce'),
  ('org_gamma', 'Gamma Learning', 'pro', 'EdTech'),
  ('org_test', 'Test Organization', 'free', 'Development')
ON CONFLICT (id) DO NOTHING;

-- Seed Demo Users (password: "demo123" - bcrypt hash)
-- Hash generated with cost 10: $2b$10$rQZ5.Hx6cVfYrYp4zQXGZeJ1XyFZBVP5kQ8N8WvH0x9mM3vZj5WyO
INSERT INTO users (id, org_id, email, password_hash, role, first_name, last_name) VALUES
  ('user_alpha_admin', 'org_alpha', 'admin@alpha.com', '$2b$10$rQZ5.Hx6cVfYrYp4zQXGZeJ1XyFZBVP5kQ8N8WvH0x9mM3vZj5WyO', 'admin', 'Alex', 'Admin'),
  ('user_alpha_viewer', 'org_alpha', 'viewer@alpha.com', '$2b$10$rQZ5.Hx6cVfYrYp4zQXGZeJ1XyFZBVP5kQ8N8WvH0x9mM3vZj5WyO', 'viewer', 'Victor', 'Viewer'),
  ('user_beta_admin', 'org_beta', 'admin@beta.com', '$2b$10$rQZ5.Hx6cVfYrYp4zQXGZeJ1XyFZBVP5kQ8N8WvH0x9mM3vZj5WyO', 'admin', 'Beth', 'Admin'),
  ('user_gamma_admin', 'org_gamma', 'admin@gamma.com', '$2b$10$rQZ5.Hx6cVfYrYp4zQXGZeJ1XyFZBVP5kQ8N8WvH0x9mM3vZj5WyO', 'admin', 'Gina', 'Admin'),
  ('user_test_admin', 'org_test', 'admin@test.com', '$2b$10$rQZ5.Hx6cVfYrYp4zQXGZeJ1XyFZBVP5kQ8N8WvH0x9mM3vZj5WyO', 'admin', 'Test', 'User')
ON CONFLICT (id) DO NOTHING;
