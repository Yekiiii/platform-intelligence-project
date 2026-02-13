-- Optimization Migration (002)

-- 1. Optimize Analytics Tables with Composite Indexes

-- DAU: Frequently queried by org_id and date range
CREATE INDEX IF NOT EXISTS idx_dau_org_date 
ON analytics.daily_active_users (org_id, date);

-- Event Counts: Queried by org_id, date range, and often sorted/grouped by event_name
CREATE INDEX IF NOT EXISTS idx_events_daily_org_date_name 
ON analytics.event_counts_daily (org_id, date, event_name);

-- Revenue: Queried by org_id and date range
CREATE INDEX IF NOT EXISTS idx_revenue_org_date 
ON analytics.daily_revenue (org_id, date);

-- LTV: Queried by org_id, sorted by lifetime_value
CREATE INDEX IF NOT EXISTS idx_ltv_org_val 
ON analytics.user_lifetime_value (org_id, lifetime_value DESC);

-- 2. (Optional) Native Materialized Views
-- If we wanted to bypass the worker process for realtime analysis or specific aggregates
-- Uses canonical 'ingestion.events' table

-- Example DAU MV
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_daily_active_users AS
SELECT 
    org_id,
    DATE(event_timestamp) as date,
    COUNT(DISTINCT user_id) as active_users
FROM ingestion.events
GROUP BY 1, 2;

CREATE INDEX IF NOT EXISTS idx_mv_dau_org_date ON analytics.mv_daily_active_users(org_id, date);

-- Example Revenue MV
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_daily_revenue AS
SELECT 
    org_id,
    DATE(event_timestamp) as date,
    SUM(COALESCE((properties->>'amount')::numeric, 0)) as revenue
FROM ingestion.events
WHERE event_name = 'purchase'
GROUP BY 1, 2;

CREATE INDEX IF NOT EXISTS idx_mv_revenue_org_date ON analytics.mv_daily_revenue(org_id, date);
