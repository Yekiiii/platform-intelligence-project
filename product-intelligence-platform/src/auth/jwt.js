const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object with id, org_id, email, role
 * @returns {string} JWT token
 */
const generateToken = (user) => {
    const payload = {
        user_id: user.id,
        org_id: user.org_id,
        email: user.email,
        role: user.role
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null if invalid
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * Express middleware to authenticate requests
 * Attaches user info to req.user
 */
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            error: 'Unauthorized', 
            message: 'Missing or invalid Authorization header' 
        });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
        return res.status(401).json({ 
            error: 'Unauthorized', 
            message: 'Invalid or expired token' 
        });
    }
    
    // Attach user info to request
    req.user = decoded;
    next();
};

/**
 * Middleware to require specific roles
 * @param  {...string} roles - Allowed roles
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Forbidden', 
                message: `This action requires one of these roles: ${roles.join(', ')}` 
            });
        }
        
        next();
    };
};

/**
 * Optional auth middleware - doesn't fail if no token, but attaches user if present
 * Useful for endpoints that work both authenticated and unauthenticated
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (decoded) {
            req.user = decoded;
        }
    }
    
    next();
};

module.exports = {
    generateToken,
    verifyToken,
    authMiddleware,
    requireRole,
    optionalAuth,
    JWT_SECRET
};
