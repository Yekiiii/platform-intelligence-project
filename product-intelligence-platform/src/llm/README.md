# LLM Module

**Status**: INACTIVE
**Activation**: Requires `ENABLE_LLM=true` in `.env`.

This directory contains the scaffolding for the Generative AI integrations (Gemini).

## Structure
*   `gemini.client.js`: Wrapper for Google Generative AI SDK.
*   `llm.service.js`: Logic to construct prompts and parse responses.
*   `llm.controller.js`: Handles HTTP requests for AI insights.
*   `llm.routes.js`: Express routes (mounted at `/v1/ai` presumably).

## Rules
*   Do not import this module if the feature flag is disabled.
*   Do not put raw SQL queries here.
