const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        console.log('--- Reseting Data ---');
        
        await pool.query('TRUNCATE ingestion.events CASCADE');
        console.log('Truncated ingestion.events');
        
        await pool.query('TRUNCATE analytics.daily_active_users, analytics.event_counts_daily, analytics.daily_revenue, analytics.user_lifetime_value, analytics.daily_user_log CASCADE');
        console.log('Truncated analytics tables');
        
        console.log('✅ Data reset complete');

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
