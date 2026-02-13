# Observability: LLM Layer

## Logging Standard
All interactions with the LLM must be logged using `src/middleware/perfLogger.js` or a specific LLM logger helper.

### Attributes
Log entries must contain:
*   `type`: "llm_interaction"
*   `llm_request_id`: UUID for the specific LLM call.
*   `llm_model`: e.g., "gemini-pro".
*   `llm_latency_ms`: Time taken for the external API call.
*   `llm_tokens_input`: Count (estimate or actual).
*   `llm_tokens_output`: Count (estimate or actual).
*   `llm_cost_estimate`: (Optional) Calculated cost.

### Safety Rules
1.  **Sanitization**: Never log the full raw prompt if it might contain sensitive user text (though our scope forbids PII inputs).
2.  **Structured JSON**: Do not use `console.log("text")`. Use structured objects.

## Metrics
We will track:
*   `llm_requests_total`
*   `llm_errors_total`
*   `llm_latency_histogram`

## Traceability
The `llm_request_id` should be returned in the API response headers (`X-LLM-Request-ID`) to allow debugging specific constraints.
