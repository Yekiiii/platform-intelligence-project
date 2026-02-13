-- Initial Schema Setup (extracted from worker/db.js)

-- 1. Ingestion Schema
CREATE SCHEMA IF NOT EXISTS ingestion;

CREATE TABLE IF NOT EXISTS ingestion.events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  event_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_org_timestamp
ON ingestion.events (org_id, event_timestamp);

-- 2. Analytics Schema
CREATE SCHEMA IF NOT EXISTS analytics;

-- DAU Table
CREATE TABLE IF NOT EXISTS analytics.daily_active_users (
  org_id TEXT,
  date DATE,
  active_users INTEGER DEFAULT 0,
  PRIMARY KEY (org_id, date)
);

-- Event Counts Table
CREATE TABLE IF NOT EXISTS analytics.event_counts_daily (
  org_id TEXT,
  event_name TEXT,
  date DATE,
  event_count INTEGER DEFAULT 0,
  PRIMARY KEY (org_id, event_name, date)
);

-- Revenue Table
CREATE TABLE IF NOT EXISTS analytics.daily_revenue (
  org_id TEXT,
  date DATE,
  revenue NUMERIC DEFAULT 0,
  PRIMARY KEY (org_id, date)
);

-- LTV Table
CREATE TABLE IF NOT EXISTS analytics.user_lifetime_value (
  org_id TEXT,
  user_id TEXT,
  lifetime_value NUMERIC DEFAULT 0,
  last_updated TIMESTAMPTZ,
  PRIMARY KEY (org_id, user_id)
);

-- Daily User Log (Helper for worker)
CREATE TABLE IF NOT EXISTS analytics.daily_user_log (
  org_id TEXT,
  user_id TEXT,
  date DATE,
  PRIMARY KEY (org_id, user_id, date)
);
