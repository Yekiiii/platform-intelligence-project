const express = require('express');
const rateLimit = require('express-rate-limit');
const llmController = require('./llm.controller');
const { optionalAuth } = require('../auth/jwt');

const router = express.Router();

// Strict Rate Limiting for GenAI
// External APIs are expensive and slow, so we protect them heavily.
const llmLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // Increased to 60 for development
    message: {
        status: 429,
        error: "Too Many Requests",
        message: "AI Request quota exceeded. Please wait."
    }
});

// Apply optional auth - org_id from JWT takes precedence
router.use(optionalAuth);

// Apply limiter - Disabled for development to avoid 429 conflicts
// router.use(llmLimiter);

// Endpoints
// POST /v1/llm/summary - General executive summary
router.post('/summary', (req, res, next) => llmController.generateSummary(req, res, next));

// POST /v1/llm/insights/:type - Specific insight types
router.post('/insights/:type', (req, res, next) => llmController.generateInsight(req, res, next));

module.exports = router;
