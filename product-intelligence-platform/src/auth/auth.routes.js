const express = require('express');
const Joi = require('joi');
const authService = require('./auth.service');
const { authMiddleware } = require('./jwt');

const router = express.Router();

// Validation Schemas
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    org_id: Joi.string().required(),
    role: Joi.string().valid('admin', 'viewer', 'analyst').default('viewer'),
    first_name: Joi.string().optional(),
    last_name: Joi.string().optional()
});

/**
 * POST /auth/login
 * Authenticate user and return JWT
 */
router.post('/login', async (req, res, next) => {
    try {
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: error.details[0].message 
            });
        }
        
        const { email, password } = value;
        const result = await authService.login(email, password);
        
        res.json({
            message: 'Login successful',
            data: result
        });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        next(err);
    }
});

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', async (req, res, next) => {
    try {
        const { error, value } = registerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: error.details[0].message 
            });
        }
        
        const result = await authService.register(value);
        
        res.status(201).json({
            message: 'Registration successful',
            data: result
        });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        next(err);
    }
});

/**
 * GET /auth/me
 * Get current user info (requires auth)
 */
router.get('/me', authMiddleware, async (req, res, next) => {
    try {
        const user = await authService.getUserById(req.user.user_id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ data: user });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /auth/organizations
 * Get list of organizations (for registration dropdown)
 */
router.get('/organizations', async (req, res, next) => {
    try {
        const orgs = await authService.getOrganizations();
        res.json({ data: orgs });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
