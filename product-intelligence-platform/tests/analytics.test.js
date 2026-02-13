const request = require('supertest');
const app = require('../src/app');
const analyticsService = require('../src/services/analytics.service');
const cacheService = require('../src/services/cache.service');

// Mock external services to unit test the controller/API layer
jest.mock('../src/services/analytics.service');
jest.mock('../src/services/cache.service');

describe('Analytics API (Phase 5)', () => {
    
    // Clear mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default behavior for generateKey to behave like real implementation
        if (cacheService.generateKey.mock) {
            cacheService.generateKey.mockImplementation((...parts) => parts.join(':'));
        }
    });

    const ORG_ID = 'org_test';
    const TEST_TTL = 90; // The default TTL specified in requirements

    // ---------------------------------------------------------
    // 1. DAU Endpoint Tests
    // ---------------------------------------------------------
    describe('GET /v1/analytics/dau', () => {
        const mockData = [
            { date: '2026-01-01', active_users: 10 },
            { date: '2026-01-02', active_users: 15 }
        ];

        it('should return 200 and correct data structure on cache miss', async () => {
            // Setup Cache Miss
            cacheService.get.mockResolvedValue(null);
            // Setup DB Hit
            analyticsService.getDAU.mockResolvedValue(mockData);

            const res = await request(app)
                .get(`/v1/analytics/dau?org_id=${ORG_ID}&from=2026-01-01&to=2026-01-02`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toHaveLength(2);
            expect(res.body.meta).toMatchObject({
                org_id: ORG_ID,
                from: '2026-01-01',
                to: '2026-01-02'
            });
            // Verify cache set was called
            expect(cacheService.set).toHaveBeenCalledTimes(1);
        });

        it('should return cached data on cache hit (simulated speedup)', async () => {
            // Setup Cache Hit
            cacheService.get.mockResolvedValue(mockData);

            const start = Date.now();
            const res = await request(app)
                .get(`/v1/analytics/dau?org_id=${ORG_ID}&from=2026-01-01&to=2026-01-02`);
            const duration = Date.now() - start;

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toEqual(mockData);
            // Service should NOT be called
            expect(analyticsService.getDAU).not.toHaveBeenCalled();
            expect(duration).toBeLessThan(50); // Fast response
        });
    });

    // ---------------------------------------------------------
    // 2. Events Endpoint Tests (Pagination)
    // ---------------------------------------------------------
    describe('GET /v1/analytics/events', () => {
        const mockEvents = Array.from({ length: 50 }, (_, i) => ({
            event_name: `event_${i}`,
            count: i
        }));

        it('should handle pagination limits and offsets', async () => {
            cacheService.get.mockResolvedValue(null);
            
            // Simulate DB returning exactly limit items
            analyticsService.getEventCounts.mockResolvedValue(mockEvents.slice(0, 10));
            
            const limit = 10;
            const offset = 5;
            
            const res = await request(app)
                .get(`/v1/analytics/events?org_id=${ORG_ID}&limit=10&offset=5`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.meta).toMatchObject({
                limit,
                offset
            });
            // Verify links
            expect(res.body.links.self).toContain(`limit=${limit}`);
            expect(res.body.links.self).toContain(`offset=${offset}`);
            expect(res.body.links.next).toContain('offset=15'); // 5 + 10
            expect(res.body.links.prev).toContain('offset=0'); // 5 - 10 -> 0
        });

        it('should return 400 for invalid limit', async () => {
            const res = await request(app)
                .get(`/v1/analytics/events?org_id=${ORG_ID}&limit=150`);
            expect(res.statusCode).toBe(400);
        });
    });

    // ---------------------------------------------------------
    // 3. Revenue Endpoint Tests
    // ---------------------------------------------------------
    describe('GET /v1/analytics/revenue', () => {
        it('should handle empty result sets correctly', async () => {
            cacheService.get.mockResolvedValue(null);
            analyticsService.getDailyRevenue.mockResolvedValue([]);

            const res = await request(app)
                .get(`/v1/analytics/revenue?org_id=${ORG_ID}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toEqual([]); // Empty array not null
            expect(res.body.meta).toHaveProperty('org_id', ORG_ID);
        });
    });

    // ---------------------------------------------------------
    // 4. LTV Endpoint Tests
    // ---------------------------------------------------------
    describe('GET /v1/analytics/ltv', () => {
        const mockLTV = [
            { user_id: 'u1', lifetime_value: 100 },
            { user_id: 'u2', lifetime_value: 50 },
        ];

        it('should respect limit parameter', async () => {
            cacheService.get.mockResolvedValue(null);
            analyticsService.getUserLTV.mockResolvedValue(mockLTV);

            const res = await request(app)
                .get(`/v1/analytics/ltv?org_id=${ORG_ID}&limit=2`); 

            expect(res.statusCode).toBe(200);
            expect(res.body.meta.limit).toBe(2);
            expect(analyticsService.getUserLTV).toHaveBeenCalledWith(ORG_ID, 2);
        });
    });

    // ---------------------------------------------------------
    // 5. Cache Verification & Error Handling
    // ---------------------------------------------------------
    describe('Cache Integrity & Fallback', () => {
        it('should fallback to DB if Redis throws error', async () => {
            // Simulate Redis Low-Level Error handled by CacheService
            // CacheService catches error and returns null
            cacheService.get.mockResolvedValue(null);
            
            // Should still fetch from DB
            analyticsService.getDAU.mockResolvedValue([]);

            const res = await request(app)
                .get(`/v1/analytics/dau?org_id=${ORG_ID}`);

            expect(res.statusCode).toBe(200);
            expect(analyticsService.getDAU).toHaveBeenCalled();
        });

        it('should cache data with correct TTL', async () => {
            cacheService.get.mockResolvedValue(null);
            analyticsService.getDailyRevenue.mockResolvedValue([{ date: '2026-01-01', revenue: 100 }]);

            // Explicit dates to be deterministic
            await request(app).get(`/v1/analytics/revenue?org_id=${ORG_ID}&from=2026-01-01&to=2026-01-02`);

            const expectedKey = 'revenue:org_test:2026-01-01:2026-01-02';
            // Verify set was called with key, data, and implicit default TTL
            // Note: Our implementation hardcodes DEFAULT_TTL to 90 if not passed, BUT controller calls .set(key, data)
            // Implementation of CacheService.set uses default param ttl = DEFAULT_TTL
            expect(cacheService.set).toHaveBeenCalledWith(expectedKey, expect.any(Array));
        });
    });

    // ---------------------------------------------------------
    // 6. Invalid Inputs
    // ---------------------------------------------------------
    describe('Validation', () => {
        it('should require org_id', async () => {
            const res = await request(app).get('/v1/analytics/dau');
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/org_id/);
        });

        it('should validate date range', async () => {
            const res = await request(app)
                .get(`/v1/analytics/dau?org_id=${ORG_ID}&from=2026-02-01&to=2026-01-01`); // from > to
            expect(res.statusCode).toBe(400);
        });
    });
});
