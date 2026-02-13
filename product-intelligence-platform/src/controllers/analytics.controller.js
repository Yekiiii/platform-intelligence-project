const analyticsService = require('../services/analytics.service');
const cacheService = require('../services/cache.service');
const { dateRangeSchema, eventsSchema, ltvSchema } = require('../validators/analytics.schema');

// Helper to calculate default dates
const getDefaults = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  return { from, to };
};

// Helper to get org_id from JWT or query params (JWT takes precedence)
const getOrgId = (req) => {
  // If user is authenticated, always use their org_id (prevents cross-tenant access)
  if (req.user && req.user.org_id) {
    return req.user.org_id;
  }
  // Fallback to query param for legacy/unauthenticated requests
  return req.query.org_id;
};

const formatResponse = (req, data, meta) => {
  const { limit, offset } = meta;
  const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
  
  const links = {
    self: `${baseUrl}?${new URLSearchParams(req.query).toString()}`,
    next: null,
    prev: null
  };

  if (limit !== null && offset !== null) {
      if (data.length === limit) { 
           // Heuristic: If we got a full page, assume there might be more. 
           // To be perfectly accurate we'd need a count, but per instructions we keep SQL simple.
           const nextParams = new URLSearchParams(req.query);
           nextParams.set('offset', offset + limit);
           links.next = `${baseUrl}?${nextParams.toString()}`;
      }

      if (offset > 0) {
          const prevParams = new URLSearchParams(req.query);
          const prevOffset = Math.max(0, offset - limit);
          prevParams.set('offset', prevOffset);
          links.prev = `${baseUrl}?${prevParams.toString()}`;
      }
  }

  return {
    data,
    meta: {
      ...meta,
      limit: limit || null,
      offset: offset || 0 
    },
    links
  };
};

// Helper: Measure DB time and update metrics
const measureDB = async (promise, res) => {
  const start = process.hrtime();
  const result = await promise;
  const diff = process.hrtime(start);
  const ms = parseFloat((diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3));
  
  if (res.locals && res.locals.metrics) {
      res.locals.metrics.dbQueryTime = ms;
  }
  return result;
};

class AnalyticsController {
  /**
   * Expose Cache Metrics
   */
  async getCacheMetrics(req, res, next) {
    try {
      const metrics = cacheService.getMetrics();
      return res.json({
        data: metrics,
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async getDAU(req, res, next) {
    try {
      const { value, error } = dateRangeSchema.validate(req.query);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      let { from, to } = value;
      const org_id = getOrgId(req);
      
      if (!org_id) {
        return res.status(400).json({ error: 'org_id is required (via query param or authentication)' });
      }
      
      const defaults = getDefaults();
      
      if (!from) from = defaults.from;
      if (!to) to = defaults.to;
      
      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];

      // Cache Key: dau:{org_id}:{from}:{to}
      const cacheKey = cacheService.generateKey('dau', org_id, fromStr, toStr);
      let data = await cacheService.get(cacheKey);

      if (data) {
        if (res.locals && res.locals.metrics) res.locals.metrics.cacheHit = true;
      } else {
        if (res.locals && res.locals.metrics) res.locals.metrics.cacheHit = false;
        // Cache miss -> DB
        data = await measureDB(analyticsService.getDAU(org_id, from, to), res);
        await cacheService.set(cacheKey, data);
      }
      
      return res.json(formatResponse(req, data, { 
        org_id, 
        from: fromStr, 
        to: toStr,
        limit: null,
        offset: null
      }));
    } catch (err) {
      next(err);
    }
  }

  async getEvents(req, res, next) {
    try {
      const { value, error } = eventsSchema.validate(req.query);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      let { from, to, limit, offset } = value;
      const org_id = getOrgId(req);
      
      if (!org_id) {
        return res.status(400).json({ error: 'org_id is required (via query param or authentication)' });
      }
      
      const defaults = getDefaults();
      
      if (!from) from = defaults.from;
      if (!to) to = defaults.to;

      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];

      // Cache Key: events:{org_id}:{from}:{to}:{limit}:{offset}
      const cacheKey = cacheService.generateKey('events', org_id, fromStr, toStr, limit, offset);
      let data = await cacheService.get(cacheKey);

      if (data) {
        if (res.locals && res.locals.metrics) res.locals.metrics.cacheHit = true;
      } else {
        if (res.locals && res.locals.metrics) res.locals.metrics.cacheHit = false;
        data = await measureDB(analyticsService.getRawEvents(org_id, from, to, limit, offset), res);
        await cacheService.set(cacheKey, data);
      }

      return res.json(formatResponse(req, data, { 
        org_id, 
        from: fromStr, 
        to: toStr,
        limit,
        offset
      }));
    } catch (err) {
      next(err);
    }
  }

  async getRevenue(req, res, next) {
    try {
      const { value, error } = dateRangeSchema.validate(req.query);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      let { from, to } = value;
      const org_id = getOrgId(req);
      
      if (!org_id) {
        return res.status(400).json({ error: 'org_id is required (via query param or authentication)' });
      }
      
      const defaults = getDefaults();
      
      if (!from) from = defaults.from;
      if (!to) to = defaults.to;

      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];

      // Cache Key: revenue:{org_id}:{from}:{to}
      const cacheKey = cacheService.generateKey('revenue', org_id, fromStr, toStr);
      let data = await cacheService.get(cacheKey);

      if (data) {
        if (res.locals && res.locals.metrics) res.locals.metrics.cacheHit = true;
      } else {
        if (res.locals && res.locals.metrics) res.locals.metrics.cacheHit = false;
        data = await measureDB(analyticsService.getDailyRevenue(org_id, from, to), res);
        await cacheService.set(cacheKey, data);
      }

      return res.json(formatResponse(req, data, { 
        org_id, 
        from: fromStr, 
        to: toStr,
        limit: null,
        offset: null
      }));
    } catch (err) {
      next(err);
    }
  }

  async getLTV(req, res, next) {
    try {
      const { value, error } = ltvSchema.validate(req.query);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const { limit, offset } = value;
      const org_id = getOrgId(req);
      
      if (!org_id) {
        return res.status(400).json({ error: 'org_id is required (via query param or authentication)' });
      }
      
      // Cache Key: ltv:{org_id}:{limit}:{offset}
      const cacheKey = cacheService.generateKey('ltv', org_id, limit, offset);
      let data = await cacheService.get(cacheKey);

      if (data) {
        if (res.locals && res.locals.metrics) res.locals.metrics.cacheHit = true;
      } else {
        if (res.locals && res.locals.metrics) res.locals.metrics.cacheHit = false;
        data = await measureDB(analyticsService.getUserLTV(org_id, limit, offset), res);
        await cacheService.set(cacheKey, data);
      }

      return res.json(formatResponse(req, data, { 
        org_id, 
        limit,
        offset: offset || 0,
        from: null,
        to: null
      }));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AnalyticsController();
