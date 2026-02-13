const request = require('supertest');
const app = require('../../src/app');

// Note: This test requires the server (and DB/Redis) to be running or mocked.
// Since we are stressing the logic/app, we'll import app. 
// For true load testing, run against a deployed instance.

describe('Stress/Concurrency Tests', () => {
    it('should handle 50 concurrent requests correctly', async () => {
        const ORG_ID = 'org_stress_test';
        const requests = [];
        
        // Generate 50 concurrent requests
        for (let i = 0; i < 50; i++) {
            requests.push(
                request(app)
                    .get(`/v1/analytics/dau?org_id=${ORG_ID}&from=2026-01-01&to=2026-01-30`)
            );
        }

        const start = Date.now();
        const responses = await Promise.all(requests);
        const duration = Date.now() - start;

        console.log(`Executed 50 concurrent requests in ${duration}ms`);

        // Check all succeeded
        responses.forEach(res => {
            expect(res.statusCode).toBeLessThan(500); 
            // 200 OK or 429 Too Many Requests (if rate limiter is active)
        });

        const successCount = responses.filter(r => r.statusCode === 200).length;
        const rateLimitedCount = responses.filter(r => r.statusCode === 429).length;
        
        console.log(`Success: ${successCount}, Rate Limited: ${rateLimitedCount}`);
        
        // At least some should pass (rate limiter is 60/min so 50 should pass if fresh)
        expect(successCount).toBeGreaterThan(0);
    });
});
