const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        console.log('--- DB Debug ---');
        
        // Check ingestion events
        const eventsCount = await pool.query('SELECT count(*) FROM ingestion.events');
        console.log(`Ingestion Events Count: ${eventsCount.rows[0].count}`);
        
        // Check revenue
        const revenueCount = await pool.query('SELECT count(*) FROM analytics.daily_revenue');
        console.log(`Daily Revenue Rows Count: ${revenueCount.rows[0].count}`);
        
        const revenueRows = await pool.query('SELECT * FROM analytics.daily_revenue LIMIT 5');
        console.log('Sample Revenue Rows:', revenueRows.rows);

        // Check events for org_alpha with revenue
        const alphaRevenueEvents = await pool.query(`
            SELECT count(*) FROM ingestion.events 
            WHERE org_id = 'org_alpha' 
            AND (event_name = 'purchase_completed' OR event_name = 'subscription_started')
        `);
        console.log(`Org Alpha Revenue Events Count: ${alphaRevenueEvents.rows[0].count}`);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
