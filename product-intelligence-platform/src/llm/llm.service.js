const geminiClient = require('./gemini.client');

class LLMService {
  constructor() {
    this.modelName = "gemini-1.5-flash";
    
    // Prompt templates for different insight types
    this.promptTemplates = {
      executive: `You are an expert product analytics assistant providing an executive summary.
Focus on:
- Key performance indicators and trends
- Revenue and user growth patterns  
- Top-level strategic observations
Keep the summary concise (under 200 words).`,

      growth: `You are a growth analyst identifying opportunities and risks.
Focus on:
- User acquisition and activation trends
- Conversion funnel performance
- Growth rate analysis and projections
- Recommendations for growth acceleration
Keep the analysis focused (under 250 words).`,

      churn: `You are a retention specialist analyzing churn patterns.
Focus on:
- User drop-off patterns and timing
- Churn indicators in the event data
- At-risk user segments
- Retention improvement recommendations
Keep the analysis actionable (under 250 words).`,

      features: `You are a product manager analyzing feature adoption.
Focus on:
- Most and least used features
- Feature usage patterns over time
- User engagement with key features
- Recommendations for feature prioritization
Keep the analysis specific (under 250 words).`
    };
  }

  /**
   * Constructs the prompt and calls the LLM.
   * @param {object} analyticsData 
   * @param {string} insightType - 'executive' | 'growth' | 'churn' | 'features'
   * @param {object} orgContext - { org_id, role } from JWT
   */
  async summarizeAnalytics(analyticsData, insightType = 'executive', orgContext = null) {
    const prompt = this._buildSummaryPrompt(analyticsData, insightType, orgContext);
    
    // Safety check on prompt size
    // Gemini 1.5/2.0 Flash has huge context, increasing limit to 500k chars (~125k tokens)
    if (prompt.length > 500000) {
        console.warn(`[LLM] Prompt truncated. Size: ${prompt.length}`);
        // Simple truncation to prevent hard failure, prefer tail for recent events
        // But throwing allows controller to handle it. 
        // Let's just allow it for now or check against a realistic limit.
        throw new Error("Input data too large for summary context window.");
    }

    const start = Date.now();
    try {
        const { text, usage, isMock } = await geminiClient.generateContent(prompt);
        const duration = Date.now() - start;

        // Estimate Cost (Pricing may vary, using rough placeholder for 1.5-Flash)
        // Input: $0.075 / 1M tokens
        // Output: $0.30 / 1M tokens
        const inputCost = (usage.promptTokenCount || 0) / 1_000_000 * 0.075;
        const outputCost = (usage.candidatesTokenCount || 0) / 1_000_000 * 0.30;
        const totalCost = inputCost + outputCost;

        return {
            summary: text,
            meta: {
                model: isMock ? 'mock-fallback' : this.modelName,
                insight_type: insightType,
                latency_ms: duration,
                tokens_input: usage.promptTokenCount || 0,
                tokens_output: usage.candidatesTokenCount || 0,
                estimated_cost_usd: parseFloat(totalCost.toFixed(6)),
                org_id: orgContext?.org_id || null
            }
        };

    } catch (err) {
        // Map specific errors if needed
        throw err;
    }
  }

  _buildSummaryPrompt(data, insightType = 'executive', orgContext = null) {
    const systemPrompt = this.promptTemplates[insightType] || this.promptTemplates.executive;
    const context = JSON.stringify(data, null, 2);
    
    let orgInfo = '';
    if (orgContext && orgContext.org_id) {
      orgInfo = `\nORGANIZATION CONTEXT: Analyzing data for organization "${orgContext.org_id}".\n`;
    }
    
    return `
SYSTEM INSTRUCTION:
${systemPrompt}
${orgInfo}
IMPORTANT RULES:
- Do NOT invent metrics not present in the data.
- Do NOT make assumptions about external factors unless obvious from dates.
- If the data is empty, say "No data available to analyze."

INPUT DATA:
${context}

RESPONSE FORMAT:
Plain text summary with clear sections using ** for headers.
    `.trim();
  }
}

module.exports = new LLMService();
