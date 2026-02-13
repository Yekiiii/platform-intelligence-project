const Joi = require('joi');
const llmService = require('./llm.service');
const analyticsService = require('../services/analytics.service'); // Added import
const { v4: uuidv4 } = require('uuid');

// Validation Schema for incoming analytics payload (Optional now)
const summaryPayloadSchema = Joi.object({
    dau: Joi.array().items(Joi.object().unknown(true)).optional(),
    events: Joi.array().items(Joi.object().unknown(true)).optional(),
    revenue: Joi.array().items(Joi.object().unknown(true)).optional(),
    ltv: Joi.array().items(Joi.object().unknown(true)).optional(),
});

// Valid insight types
const INSIGHT_TYPES = ['executive', 'growth', 'churn', 'features'];

class LLMController {
  // Helper to fetch context if missing from payload
  async _getContext(orgId, payload = {}) {
     // If payload has data, use it (pioritize provided data)
     if (payload.dau || payload.revenue || payload.events) {
         return payload;
     }

     console.log(`[LLM] Fetching analytics context internally for ${orgId}`);
     
     // Default Context Window (last 90 days or fixed window as per requirement)
     const from = new Date('2026-01-01');
     const to = new Date('2026-04-01');

     const [dau, revenue, events] = await Promise.all([
        analyticsService.getDAU(orgId, from, to),
        analyticsService.getDailyRevenue(orgId, from, to),
        analyticsService.getRawEvents(orgId, from, to, 100, 0)
     ]);

     return { dau, revenue, events };
  }

  async generateSummary(req, res, next) {
    try {
      // 1. Validation (Relaxed)
      const { value, error } = summaryPayloadSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: "Invalid payload format", details: error.details });
      }

      // 2. Get org context
      if (!req.user || !req.user.org_id) {
          return res.status(401).json({ error: "Unauthorized: Missing org_id" });
      }

      const orgContext = {
        org_id: req.user.org_id,
        role: req.user.role
      };

      // 3. Fetch Data if needed
      const analysisPayload = await this._getContext(orgContext.org_id, value);

      // 4. ID for Tracing
      const requestId = uuidv4();
      res.setHeader('X-LLM-Request-ID', requestId);

      // 5. Call Service with org context
      const result = await llmService.summarizeAnalytics(analysisPayload, 'executive', orgContext);

      // 5. Observability Integration (Pass to perfLogger via locals)
      if (!res.locals.metrics) res.locals.metrics = {};
      
      // Merge LLM specific metrics
      res.locals.metrics.llm_request_id = requestId;
      res.locals.metrics.llm_latency_ms = result.meta.latency_ms;
      res.locals.metrics.llm_tokens_input = result.meta.tokens_input;
      res.locals.metrics.llm_tokens_output = result.meta.tokens_output;
      res.locals.metrics.llm_cost_usd = result.meta.estimated_cost_usd;
      res.locals.metrics.llm_model = result.meta.model;

      // 6. Response
      return res.json({
        data: {
            summary: result.summary,
            meta: result.meta 
        }
      });

    } catch (err) {
      if (err.message.includes("Input data too large")) {
          return res.status(413).json({ error: "Payload too large for analysis" });
      }
      if (err.message.includes("fetch failed") || err.status === 503) {
          return res.status(502).json({ error: "LLM Provider Unavailable" });
      }
      if (err.status === 504) {
          return res.status(504).json({ error: "LLM Timeout" });
      }
      next(err);
    }
  }

  /**
   * Generate specific type of insight
   * POST /v1/llm/insights/:type
   * Types: executive, growth, churn, features
   */
  async generateInsight(req, res, next) {
    try {
      const { type } = req.params;
      
      if (!INSIGHT_TYPES.includes(type)) {
        return res.status(400).json({ 
          error: "Invalid insight type", 
          valid_types: INSIGHT_TYPES 
        });
      }

      const { value, error } = summaryPayloadSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: "Invalid payload format", details: error.details });
      }

      if (!req.user || !req.user.org_id) {
          return res.status(401).json({ error: "Unauthorized: Missing org_id" });
      }

      const orgContext = {
        org_id: req.user.org_id,
        role: req.user.role
      };

      // Fetch Data if needed
      const analysisPayload = await this._getContext(orgContext.org_id, value);

      const requestId = uuidv4();
      res.setHeader('X-LLM-Request-ID', requestId);

      const result = await llmService.summarizeAnalytics(analysisPayload, type, orgContext);

      if (!res.locals.metrics) res.locals.metrics = {};
      res.locals.metrics.llm_request_id = requestId;
      res.locals.metrics.llm_insight_type = type;
      res.locals.metrics.llm_latency_ms = result.meta.latency_ms;

      return res.json({
        data: {
            insight_type: type,
            summary: result.summary,
            meta: result.meta 
        }
      });

    } catch (err) {
      if (err.message.includes("Input data too large")) {
          return res.status(413).json({ error: "Payload too large for analysis" });
      }
      next(err);
    }
  }
}

module.exports = new LLMController();
