/**
 * Migration Runner - Runs SQL migrations
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const runMigration = async () => {
    const migrationFile = process.argv[2] || 'migrations/003_auth_tables.sql';
    const filePath = path.join(__dirname, '..', migrationFile);
    
    console.log(`Running migration: ${migrationFile}`);
    
    try {
        const sql = fs.readFileSync(filePath, 'utf8');
        await pool.query(sql);
        console.log('✅ Migration completed successfully');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
};

runMigration();
