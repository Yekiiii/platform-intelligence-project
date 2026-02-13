# Analytics API V1 Contract

## Status
**FROZEN**. This API is version-locked (v1). Any breaking changes must target `/v2`.

## Base Configuration
*   **Base URL**: `/v1/analytics/`
*   **Rate Limit**: 60 requests/minute per IP
*   **Authentication**: None (Internal/Protected by generic middleware if applicable)

## Endpoints

### 1. Daily Active Users (DAU)
*   **Path**: `GET /dau`
*   **Parameters**:
    *   `org_id` (Required, string): ID of the organization.
    *   `from` (Optional, date YYYY-MM-DD): Start date (default: 30 days ago).
    *   `to` (Optional, date YYYY-MM-DD): End date (default: today).
*   **Response**:
    ```json
    {
      "data": [
        { "date": "2026-01-01", "active_users": 100 }
      ],
      "meta": {
        "org_id": "org_test",
        "from": "2026-01-01",
        "to": "2026-01-02",
        "limit": null,
        "offset": null
      },
      "links": { "self": "..." }
    }
    ```

### 2. Event Counts
*   **Path**: `GET /events`
*   **Parameters**:
    *   `org_id` (Required, string).
    *   `from` (Optional, date).
    *   `to` (Optional, date).
    *   `limit` (Optional, int, default 10).
    *   `offset` (Optional, int, default 0).
*   **Response**:
    ```json
    {
      "data": [
        { "event_name": "login", "date": "2026-01-01", "event_count": 50 }
      ],
      "meta": { "limit": 10, "offset": 0, ... },
      "links": { "self": "...", "next": "...", "prev": "..." }
    }
    ```

### 3. Revenue
*   **Path**: `GET /revenue`
*   **Parameters**:
    *   `org_id` (Required, string).
    *   `from` (Optional, date).
    *   `to` (Optional, date).
*   **Response**:
    ```json
    {
      "data": [
        { "date": "2026-01-01", "revenue": 500.00 }
      ],
      "meta": { ... },
      "links": { ... }
    }
    ```

### 4. Lifetime Value (LTV)
*   **Path**: `GET /ltv`
*   **Parameters**:
    *   `org_id` (Required, string).
    *   `limit` (Optional, int, default 10).
*   **Response**:
    ```json
    {
      "data": [
        { "user_id": "u1", "lifetime_value": 1500.50 }
      ],
      "meta": { "limit": 10, ... },
      "links": { ... }
    }
    ```

## Error Formats
All errors follow this structure:
```json
{
  "error": "Description of error",
  "message": "Optional detailed message"
}
```
*   **400**: Validation Error (Invalid key, date range, etc.)
*   **429**: Too Many Requests
*   **500**: Internal Server Error
