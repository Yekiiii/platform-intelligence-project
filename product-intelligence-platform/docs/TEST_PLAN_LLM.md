# Phase 8 – Gemini LLM Integration Test Plan

## Purpose

This document defines the **official testing procedure** for validating the Gemini LLM integration layer.

Goals:

* Verify feature-flag behavior
* Validate API contract
* Ensure safety boundaries
* Confirm observability & cost logging
* Test failure scenarios
* Confirm rate limiting
* Verify no analytics or DB coupling

---

## 1. Pre-Test Setup

### Environment

Create `.env`:

```
ENABLE_LLM=true
GEMINI_API_KEY=your_real_key_here
```

Start server:

```bash
npm start
```

Ensure Redis + Postgres are running.

---

## 2. Feature Flag Validation

### Test 2.1 – LLM Disabled

Set:

```
ENABLE_LLM=false
```

Request:

```
POST /v1/llm/summary
```

Expected:

* HTTP 404 or route not found
* No Gemini client initialized
* No LLM logs

---

## 3. Happy Path Test (Summary)

### Test 3.1 – Valid Summary Request

Request:

```
POST /v1/llm/summary
Content-Type: application/json
```

Body:

```json
{
  "dau": [
    { "date": "2026-01-13", "active_users": 120 },
    { "date": "2026-01-14", "active_users": 90 }
  ],
  "revenue": [
    { "date": "2026-01-13", "revenue": 15000 },
    { "date": "2026-01-14", "revenue": 11000 }
  ],
  "events": [
    { "event_name": "purchase_completed", "date": "2026-01-13", "event_count": 42 }
  ]
}
```

Expected:

* HTTP 200
* JSON:

```json
{
  "data": {
    "summary": "..."
  }
}
```

* Summary text is coherent
* No hallucinated metrics

---

## 4. Validation Tests

### Test 4.1 – Missing Field

Remove `events`.

Expected:

* HTTP 400
* Joi validation error

---

### Test 4.2 – Payload Too Large

Send > 20k characters.

Expected:

* HTTP 413 or 400
* Error message indicating size limit

---

### Test 4.3 – Unexpected Fields

Add:

```json
"user_email": "test@example.com"
```

Expected:

* HTTP 400
* Request rejected

---

## 5. Safety Boundary Tests

### Test 5.1 – Raw Events Attempt

Include:

```json
{ "user_id": "abc123", "email": "x@y.com" }
```

Expected:

* Request rejected
* No Gemini call triggered

---

### Test 5.2 – SQL Injection Attempt

Include prompt-like strings:

```
DROP TABLE analytics.daily_active_users
```

Expected:

* Treated as plain text
* No DB access
* Safe response

---

## 6. Rate Limiting Tests

### Test 6.1 – Burst Test

Send 11 requests within 1 minute.

Expected:

* First 10 → HTTP 200
* 11th → HTTP 429

---

## 7. Observability Tests

Perform valid request.

Check logs:

Expected structured log:

```json
{
  "llm_request_id": "...",
  "llm_latency_ms": 800,
  "llm_model": "gemini-1.5-pro",
  "llm_tokens_input": 400,
  "llm_tokens_output": 120,
  "llm_estimated_cost_usd": 0.003
}
```

Ensure:

* No prompt content logged
* No PII logged

---

## 8. Failure Mode Tests

### Test 8.1 – Invalid API Key

Set:

```
GEMINI_API_KEY=invalid
```

Expected:

* HTTP 502
* Clear upstream error message
* Graceful failure
* No server crash

---

### Test 8.2 – Timeout Simulation

Throttle network or modify timeout to 1ms.

Expected:

* HTTP 504
* Logged timeout metric

---

## 9. Automated Tests

Run:

```bash
npm test
```

Verify:

* tests/llm.test.js passes
* Gemini client is mocked
* No real API calls during CI

---

## 10. No-Write Guarantee

After tests:

Verify DB unchanged:

```sql
SELECT count(*) FROM ingestion.events;
SELECT count(*) FROM analytics.daily_active_users;
```

Counts must be unchanged.

---

## 11. Completion Criteria

Phase 8 is certified complete when:

* All above tests pass
* Logs show correct metrics
* Rate limit enforced
* No DB writes occur
* Feature flag works
* CI tests pass

---

## 12. Sign-off

Once validated:

* Mark Phase 8 complete
* Tag repo:

```bash
git tag v1-llm-safe
```

---

End of test plan.
