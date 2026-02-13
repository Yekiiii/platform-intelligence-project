const express = require('express');
const trackRoutes = require('../routes/track');
const analyticsRoutes = require('./routes/analytics.routes');
const authRoutes = require('./auth/auth.routes');
const perfLogger = require('./middleware/perfLogger');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(perfLogger);

// Routes
app.use('/track', trackRoutes);
app.use('/v1/analytics', analyticsRoutes);
app.use('/auth', authRoutes);

// Feature Flag: LLM Integration
if (process.env.ENABLE_LLM === 'true') {
    const llmRoutes = require('./llm/llm.routes');
    app.use('/v1/llm', llmRoutes);
    console.log('[App] LLM Module Enabled at /v1/llm');
}

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  
  // Custom validation error handling if needed, or default
  if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
  }

  res.status(err.status || 500).json({ 
    error: err.name || 'Internal Server Error', 
    message: err.message || 'An unexpected error occurred.' 
  });
});

module.exports = app;
