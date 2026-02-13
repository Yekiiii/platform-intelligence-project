/**
 * Events Database Service
 * 
 * Handles PostgreSQL operations for the ingestion.events table.
 * Implements idempotent inserts using ON CONFLICT DO NOTHING.
 * 
 * CANONICAL SCHEMA (ingestion.events):
 * - id: TEXT PRIMARY KEY (maps to client event_id or Redis Stream ID)
 * - org_id: TEXT NOT NULL
 * - user_id: TEXT NOT NULL
 * - event_name: TEXT NOT NULL
 * - properties: JSONB NOT NULL
 * - event_timestamp: TIMESTAMPTZ NOT NULL (maps from API timestamp)
 * - created_at: TIMESTAMPTZ NOT NULL DEFAULT now()
 */
const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
  connectionString: config.postgres.connectionString,
});

pool.on('error', (err) => {
  console.error('[Postgres] Unexpected pool error:', err);
});

/**
 * Set search_path to ingestion schema to avoid ambiguity.
 * Called once at worker startup.
 */
const setSearchPath = async () => {
  await pool.query('SET search_path TO ingestion, public');
  console.log('[Postgres] search_path locked to ingestion');
};

/**
 * Ensure the ingestion schema and events table exist.
 * This is idempotent and safe to call on every startup.
 */
const initSchema = async () => {
  const createSchemaQuery = `CREATE SCHEMA IF NOT EXISTS ingestion;`;
  
  // Canonical schema as specified
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS ingestion.events (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      event_name TEXT NOT NULL,
      properties JSONB NOT NULL DEFAULT '{}',
      event_timestamp TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  
  // Create index for common query patterns
  const createOrgIndex = `
    CREATE INDEX IF NOT EXISTS idx_events_org_timestamp
    ON ingestion.events (org_id, event_timestamp);
  `;

  try {
    await pool.query(createSchemaQuery);
    
    // Set search_path for this session
    await setSearchPath();
    
    await pool.query(createTableQuery);

    // Migration: Rename 'timestamp' to 'event_timestamp' if old column exists
    const migrateTimestampColumn = `
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ingestion' AND table_name='events' AND column_name='timestamp') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ingestion' AND table_name='events' AND column_name='event_timestamp') THEN
          ALTER TABLE ingestion.events RENAME COLUMN "timestamp" TO event_timestamp;
        END IF;
      END $$;
    `;
    await pool.query(migrateTimestampColumn);

    // Migration: Ensure event_timestamp column exists
    const migrateEventTimestamp = `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ingestion' AND table_name='events' AND column_name='event_timestamp') THEN
          ALTER TABLE ingestion.events ADD COLUMN event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW();
        END IF;
      END $$;
    `;
    await pool.query(migrateEventTimestamp);

    // Migration: Ensure id column is TEXT (it might have been created as UUID)
    const migrateIdType = `
      DO $$
      BEGIN
        IF (SELECT data_type FROM information_schema.columns WHERE table_schema='ingestion' AND table_name='events' AND column_name='id') = 'uuid' THEN
          ALTER TABLE ingestion.events ALTER COLUMN id TYPE TEXT;
        END IF;
      END $$;
    `;
    await pool.query(migrateIdType);

    await pool.query(createOrgIndex);

    // ANALYTICS SCHEMA SETUP
    const createAnalyticsSchema = `CREATE SCHEMA IF NOT EXISTS analytics;`;
    await pool.query(createAnalyticsSchema);

    // 1. Daily Active Users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics.daily_active_users (
        org_id TEXT,
        date DATE,
        active_users INTEGER DEFAULT 0,
        PRIMARY KEY (org_id, date)
      );
    `);

    // 2. Event Counts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics.event_counts_daily (
        org_id TEXT,
        event_name TEXT,
        date DATE,
        event_count INTEGER DEFAULT 0,
        PRIMARY KEY (org_id, event_name, date)
      );
    `);

    // 3. Daily Revenue
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics.daily_revenue (
        org_id TEXT,
        date DATE,
        revenue NUMERIC DEFAULT 0,
        PRIMARY KEY (org_id, date)
      );
    `);

    // 4. User LTV
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics.user_lifetime_value (
        org_id TEXT,
        user_id TEXT,
        lifetime_value NUMERIC DEFAULT 0,
        last_updated TIMESTAMPTZ,
        PRIMARY KEY (org_id, user_id)
      );
    `);
    
    // 5. Helper: Daily User Activity Log (For distinct DAU counting)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics.daily_user_log (
        org_id TEXT,
        user_id TEXT,
        date DATE,
        PRIMARY KEY (org_id, user_id, date)
      );
    `);

    console.log('[Postgres] Schema initialized: ingestion.events and analytics tables ready');
  } catch (err) {
    console.error('[Postgres] Failed to initialize schema:', err);
    throw err;
  }
};

/**
 * Process an event transactionally:
 * 1. Insert into ingestion.events (idempotent)
 * 2. If new, update analytics tables
 * 
 * @param {object} event - Parsed event object
 * @returns {Promise<{inserted: boolean}>}
 */
const processEvent = async (event) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Insert into ingestion.events
    const insertQuery = `
      INSERT INTO ingestion.events (
        id, org_id, user_id, event_name, properties, event_timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
      RETURNING id;
    `;
    
    const insertValues = [
      event.id,
      event.org_id,
      event.user_id,
      event.event_name,
      JSON.stringify(event.properties),
      event.event_timestamp,
    ];

    const res = await client.query(insertQuery, insertValues);
    const inserted = res.rowCount > 0;

    // 2. Update Analytics ONLY if event was inserted (new)
    if (inserted) {
      const date = event.event_timestamp; // Date object
      
      // Update Event Counts
      await client.query(`
        INSERT INTO analytics.event_counts_daily (org_id, event_name, date, event_count)
        VALUES ($1, $2, ($3::timestamptz AT TIME ZONE 'UTC')::date, 1)
        ON CONFLICT (org_id, event_name, date)
        DO UPDATE SET event_count = analytics.event_counts_daily.event_count + 1;
      `, [event.org_id, event.event_name, date]);

      // Update DAU
      // Use daily_user_log helper to ensure we only increment once per user per day (Concurrency Safe)
      const dauLogRes = await client.query(`
        INSERT INTO analytics.daily_user_log (org_id, user_id, date)
        VALUES ($1, $2, ($3::timestamptz AT TIME ZONE 'UTC')::date)
        ON CONFLICT (org_id, user_id, date) DO NOTHING
        RETURNING 1
      `, [event.org_id, event.user_id, date]);

      if (dauLogRes.rowCount > 0) {
        // First event for this user today -> increment DAU
        await client.query(`
          INSERT INTO analytics.daily_active_users (org_id, date, active_users)
          VALUES ($1, ($2::timestamptz AT TIME ZONE 'UTC')::date, 1)
          ON CONFLICT (org_id, date)
          DO UPDATE SET active_users = analytics.daily_active_users.active_users + 1;
        `, [event.org_id, date]);
      }

      // Update Revenue & LTV (Generalized for any event with amount > 0)
      const amount = parseFloat(event.properties.amount || event.properties.price || event.properties.value);
      if (!isNaN(amount) && amount > 0) {
        console.log(`[Analytics] Processing revenue event: ${amount} (Event: ${event.event_name})`);

        // 1. Update Daily Revenue
        await client.query(`
          INSERT INTO analytics.daily_revenue (org_id, date, revenue)
          VALUES ($1, ($2::timestamptz AT TIME ZONE 'UTC')::date, $3)
          ON CONFLICT (org_id, date)
          DO UPDATE SET revenue = analytics.daily_revenue.revenue + EXCLUDED.revenue;
        `, [event.org_id, date, amount]);
          
        // 2. Update User LTV
        await client.query(`
          INSERT INTO analytics.user_lifetime_value (org_id, user_id, lifetime_value, last_updated)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (org_id, user_id)
          DO UPDATE SET 
            lifetime_value = analytics.user_lifetime_value.lifetime_value + EXCLUDED.lifetime_value,
            last_updated = NOW();
        `, [event.org_id, event.user_id, amount]);

        console.log(`[Analytics] Updated LTV for user ${event.user_id} by ${amount}`);
      }
    }

    await client.query('COMMIT');
    return { inserted };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[Postgres] Transaction failed for event ${event.id}:`, err.message);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * DEPRECATED: Use processEvent instead
 */
const insertEvent = async (event) => {
  return processEvent(event);
};

/**
 * Gracefully close the connection pool
 */
const disconnect = async () => {
  await pool.end();
  console.log('[Postgres] Connection pool closed');
};

module.exports = {
  initSchema,
  insertEvent,
  processEvent,
  disconnect,
  pool,
};
