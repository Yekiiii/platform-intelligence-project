const request = require('supertest');
const app = require('../src/app');

// Mock gemini client
jest.mock('../src/llm/gemini.client', () => ({
    generateContent: jest.fn()
}));

const geminiClient = require('../src/llm/gemini.client');

describe('LLM API (Phase 8)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Mocking process.env before app import is tricky in Jest due to hoisting.
    // Instead we will mock the app behavior or rely on manual enabling for this test file.
    // The standard way is to isolate the module being tested.
    
    // For this specific integration test, we need to ensure app.js sees ENABLE_LLM=true.
    // We will use jest.resetModules() to re-import app with the new environment.

    const getApp = () => {
        jest.resetModules();
        process.env.ENABLE_LLM = 'true';
        jest.mock('../src/llm/gemini.client', () => ({
            generateContent: jest.fn()
        }));
        // We need to re-mock other dependencies if app.js imports them and they have side effects
        return require('../src/app');
    };

    const mockPayload = {
        dau: [{ date: '2026-01-01', active_users: 100 }],
        revenue: [{ date: '2026-01-01', revenue: 500 }]
    };

    it('should return summary on valid input', async () => {
        const app = getApp();
        const geminiClient = require('../src/llm/gemini.client');
        
        // Mock successful LLM response
        geminiClient.generateContent.mockResolvedValue({
            text: "DAU shows stable trend.",
            usage: { promptTokenCount: 10, candidatesTokenCount: 5 }
        });

        const res = await request(app)
            .post('/v1/llm/summary')
            .send(mockPayload);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.summary).toBe("DAU shows stable trend.");
        expect(res.body.data.meta).toHaveProperty('estimated_cost_usd');
        expect(res.body.data.meta.tokens_input).toBe(10);
    });

    it('should return 400 for invalid payload', async () => {
        const app = getApp();
        const res = await request(app)
            .post('/v1/llm/summary')
            .send({ randomField: "data" }); // Missing allowed fields

        expect(res.statusCode).toBe(400);
    });

    it('should handle LLM failure gracefully (502)', async () => {
        const app = getApp();
        const geminiClient = require('../src/llm/gemini.client');
        
        geminiClient.generateContent.mockRejectedValue(new Error("fetch failed"));

        const res = await request(app)
            .post('/v1/llm/summary')
            .send(mockPayload);

        expect(res.statusCode).toBe(502);
    });

    it('should handle too large payload (413)', async () => {
        const app = getApp();
        const hugePayload = { dau: Array(1000).fill({ date: 'x', val: 'y'.repeat(100) }) }; 
        
        const largeString = 'a'.repeat(25000);
        
        const res = await request(app)
            .post('/v1/llm/summary')
            .send({ dau: [{ date: '2026-01-01', note: largeString }] });

        expect(res.statusCode).toBe(413);
    });
});
