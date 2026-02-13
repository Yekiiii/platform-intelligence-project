# LLM Scope & Rules

## Purpose
This document defines the strict boundaries for the AI integration. The LLM layer is **stateless** and **advisory only**.

## 1. Allowed Actions
*   Summarize analytics outputs (e.g., "DAU increased by 20%").
*   Explain trends from provided JSON data.
*   Generate human-readable insights.
*   Assist debugging by explaining error logs (if sanitized).
*   Support dashboard widgets with text summaries.

## 2. Forbidden Actions
*   ❌ **Computing Metrics**: The LLM must NOT calculate sums, averages, or complex aggregations. It must rely on the deterministic API.
*   ❌ **Writing to DB**: The LLM layer is Read-Only.
*   ❌ **Triggering Business Actions**: It cannot refund users, ban accounts, or change settings.
*   ❌ **Replacing Logic**: It cannot replace regex, SQL, or code logic.
*   ❌ **Accessing Raw Events**: It cannot query `ingestion.events` or `public.events`.

## 3. Data Access Rules
*   **Allowed Data**:
    *   Aggregated JSON responses from `/v1/analytics/*`.
    *   Schema definitions (metadata).
*   **Forbidden Data**:
    *   Raw event streams.
    *   PII (Personal Identifiable Information): No real names, emails, addresses.
    *   Payment Details (CC numbers).
    *   Internal Secrets (API Keys, Passwords).

## 4. Architecture Statement
> The LLM layer receives data **after** it has been processed, aggregated, and sanitized by the Analytics Service. It does not touch the raw inputs.
