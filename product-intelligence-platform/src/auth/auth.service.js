const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const { generateToken } = require('./jwt');

const SALT_ROUNDS = 10;

class AuthService {
    /**
     * Register a new user
     * @param {Object} userData - { email, password, org_id, role, first_name, last_name }
     * @returns {Object} - { user, token }
     */
    async register(userData) {
        const { email, password, org_id, role = 'viewer', first_name, last_name } = userData;
        
        // Check if email already exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );
        
        if (existingUser.rows.length > 0) {
            const error = new Error('Email already registered');
            error.status = 409;
            throw error;
        }
        
        // Verify org exists
        const org = await db.query(
            'SELECT id FROM organizations WHERE id = $1',
            [org_id]
        );
        
        if (org.rows.length === 0) {
            const error = new Error('Organization not found');
            error.status = 404;
            throw error;
        }
        
        // Hash password
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
        
        // Create user
        const userId = `user_${uuidv4().slice(0, 8)}`;
        const result = await db.query(
            `INSERT INTO users (id, org_id, email, password_hash, role, first_name, last_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, org_id, email, role, first_name, last_name, created_at`,
            [userId, org_id, email.toLowerCase(), password_hash, role, first_name, last_name]
        );
        
        const user = result.rows[0];
        const token = generateToken(user);
        
        return { user, token };
    }
    
    /**
     * Login a user
     * @param {string} email
     * @param {string} password
     * @returns {Object} - { user, token }
     */
    async login(email, password) {
        // Find user
        const result = await db.query(
            `SELECT u.id, u.org_id, u.email, u.password_hash, u.role, u.first_name, u.last_name,
                    o.name as org_name, o.plan as org_plan
             FROM users u
             JOIN organizations o ON u.org_id = o.id
             WHERE u.email = $1`,
            [email.toLowerCase()]
        );
        
        if (result.rows.length === 0) {
            const error = new Error('Invalid email or password');
            error.status = 401;
            throw error;
        }
        
        const user = result.rows[0];
        
        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            const error = new Error('Invalid email or password');
            error.status = 401;
            throw error;
        }
        
        // Generate token
        const token = generateToken(user);
        
        // Remove sensitive data
        delete user.password_hash;
        
        return { user, token };
    }
    
    /**
     * Get user by ID
     * @param {string} userId
     * @returns {Object|null}
     */
    async getUserById(userId) {
        const result = await db.query(
            `SELECT u.id, u.org_id, u.email, u.role, u.first_name, u.last_name, u.created_at,
                    o.name as org_name, o.plan as org_plan
             FROM users u
             JOIN organizations o ON u.org_id = o.id
             WHERE u.id = $1`,
            [userId]
        );
        
        return result.rows[0] || null;
    }
    
    /**
     * Get all organizations
     * @returns {Array}
     */
    async getOrganizations() {
        const result = await db.query(
            'SELECT id, name, plan, industry, created_at FROM organizations ORDER BY name'
        );
        return result.rows;
    }
    
    /**
     * Create a new organization
     * @param {Object} orgData - { id, name, plan, industry }
     * @returns {Object}
     */
    async createOrganization(orgData) {
        const { id, name, plan = 'free', industry } = orgData;
        
        const result = await db.query(
            `INSERT INTO organizations (id, name, plan, industry)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, name, plan, industry]
        );
        
        return result.rows[0];
    }
}

module.exports = new AuthService();
