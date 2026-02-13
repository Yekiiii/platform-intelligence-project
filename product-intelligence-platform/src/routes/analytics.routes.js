const express = require('express');
const rateLimit = require('express-rate-limit');
const analyticsController = require('../controllers/analytics.controller');
const { optionalAuth } = require('../auth/jwt');

const router = express.Router();

// Rate Limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per `windowMs`
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'You have exceeded the 60 requests in 1 minute limit!'
  }
});

// Apply rate limiter to all analytics routes
router.use(limiter);

// Apply optional auth - allows both authenticated and legacy query param mode
router.use(optionalAuth);

// Operational Metrics
router.get('/cache-metrics', (req, res, next) => analyticsController.getCacheMetrics(req, res, next));

// Core Analytics
router.get('/dau', (req, res, next) => analyticsController.getDAU(req, res, next));
router.get('/events', (req, res, next) => analyticsController.getEvents(req, res, next));
router.get('/revenue', (req, res, next) => analyticsController.getRevenue(req, res, next));
router.get('/ltv', (req, res, next) => analyticsController.getLTV(req, res, next));

module.exports = router;
