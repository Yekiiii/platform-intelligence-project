# LLM Architecture Boundary

## Module Isolation
*   **Location**: `src/llm/*`
*   **Dependency Rule**: usage of `src/llm` from other modules is RESTRICTED via `ENABLE_LLM` flag.
*   **Import Rule**: `src/llm` code should NOT direct import `src/worker/*`.

## Data Flow
```mermaid
graph TD
    User[User/Frontend] -->|Request| API[API Gateway / App]
    API -->|1. Fetch Data| Analytics[Analytics Service / DB]
    Analytics -->|2. Return JSON| API
    
    subgraph LLM Layer [src/llm]
    API -.->|3. Pass JSON (Optional)| LLM_Service
    LLM_Service -->|4. Construct Prompt| Gemini[Gemini API]
    Gemini -->|5. Return Text| LLM_Service
    end
    
    LLM_Service -.->|6. Return Insight| API
    API -->|7. Final Response| User
```

## Constraints
1.  **No Shared Writes**: The LLM module cannot write to the `analytics` schema.
2.  **No Shared Cache Keys**: The LLM module must use its own Redis prefix (e.g., `llm:*`) if caching is needed.
3.  **One-Way Dependency**: The LLM module depends on the Analytics output, not the other way around.
