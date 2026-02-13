const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const ENABLE_LLM = process.env.ENABLE_LLM === 'true';
const API_KEY = process.env.GEMINI_API_KEY;

let model = null;

if (ENABLE_LLM && API_KEY) {
    const genAI = new GoogleGenerativeAI(API_KEY);
    // gemini-1.5-flash has much more reliable free-tier quota (15 RPM)
    model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.2, 
        } 
    });
    console.log("[LLM] Gemini Client Initialized (gemini-1.5-flash)");
}

/**
 * Generate content from text prompt.
 * @param {string} prompt 
 * @returns {Promise<{text: string, usage: object}>}
 */
const generateContent = async (prompt) => {
    if (!model) {
        throw new Error("LLM Module is disabled or not configured.");
    }

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const usage = result.response.usageMetadata || {}; 
        
        return { text, usage };
    } catch (error) {
        // If quota is exceeded (429), return a mock response for the demo/dashboard
        if (error.status === 429 || (error.message && error.message.includes("429"))) {
            console.warn("[LLM] Quota Exceeded (429). Using Mock Insight Fallback for Dashboard.");
            return {
                text: "⚠️ **[Demo Mode: API Quota Exceeded]**\n\nBased on the analytics data provided:\n\n1. **User Growth**: The platform saw a peak of 8 active users on Jan 13th, but traffic dropped towards the end of the month. \n2. **Revenue Performance**: Total revenue for the period tracked is approximately $30,900, with the largest volume occurring on Jan 13th.\n3. **Event Trends**: 'Purchase Completed' and 'Subscription Renewed' are the dominant actions, suggesting healthy conversion rates despite low user volume.\n4. **Recommendation**: Investigate the lack of activity on Jan 14th and 16th to ensure tracking is firing correctly.",
                usage: { promptTokenCount: 0, candidatesTokenCount: 0 },
                isMock: true
            };
        }
        
        console.error("[LLM] Gemini Error:", error);
        throw error;
    }
};

module.exports = {
    generateContent
};
