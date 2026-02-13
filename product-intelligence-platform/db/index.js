const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Optional: Log events to DB
const logEvent = async (event) => {
  const query = `
    INSERT INTO events_log (event_id, org_id, user_id, event_name, idempotency_key, properties, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  const values = [
    event.id, // Redis Stream ID
    event.org_id,
    event.user_id,
    event.event_name,
    event.event_id || null, // Client provided ID
    JSON.stringify(event.properties),
    event.timestamp || new Date().toISOString()
  ];

  try {
    const res = await pool.query(query, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error logging event to DB:', err);
    // We don't want to fail the request if logging fails, just log the error
  }
};

const initDb = async () => {
  // Ensure table exists
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS events_log (
      id SERIAL PRIMARY KEY,
      event_id VARCHAR(255),
      org_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      event_name VARCHAR(255) NOT NULL,
      idempotency_key VARCHAR(255),
      properties JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await pool.query(createTableQuery);

    // Migration: Check if 'payload' column exists and rename to 'properties'
    const migrationQuery = `
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events_log' AND column_name='payload') THEN
          ALTER TABLE events_log RENAME COLUMN payload TO properties;
        END IF;
      END $$;
    `;
    await pool.query(migrationQuery);

    console.log('Database initialized: events_log table ready.');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  logEvent,
  initDb,
  pool
};
