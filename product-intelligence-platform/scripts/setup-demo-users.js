/**
 * Demo User Password Setup
 * Sets proper bcrypt hashes for demo users (password: demo123)
 */
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const DEMO_PASSWORD = 'demo123';

const setupDemoPasswords = async () => {
    console.log('Setting up demo user passwords...');
    
    try {
        // Generate proper bcrypt hash
        const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
        console.log(`Generated hash for "demo123": ${passwordHash}`);
        
        // Update all demo users
        const result = await pool.query(
            `UPDATE users SET password_hash = $1 
             WHERE email IN ('admin@alpha.com', 'viewer@alpha.com', 'admin@beta.com', 'admin@gamma.com', 'admin@test.com')
             RETURNING email`,
            [passwordHash]
        );
        
        console.log(`✅ Updated ${result.rowCount} demo users`);
        result.rows.forEach(row => console.log(`   - ${row.email}`));
        
    } catch (err) {
        console.error('❌ Failed:', err.message);
    } finally {
        await pool.end();
    }
};

setupDemoPasswords();
