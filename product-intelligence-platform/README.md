# Event-Driven Product Intelligence Platform - Phase 1

This is the core event ingestion service for the Product Intelligence Platform. It receives events via an HTTP API, validates them, and pushes them to a Redis Stream for asynchronous processing.

## Prerequisites

- Node.js (v14+)
- PostgreSQL
- Redis

## Setup

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Variables:**
    Create a `.env` file in the root directory (or copy the example):
    ```env
    PORT=3000
    DATABASE_URL=postgresql://user:password@localhost:5432/product_intelligence
    REDIS_URL=redis://localhost:6379
    ```
    *Update `DATABASE_URL` and `REDIS_URL` with your local credentials.*

3.  **Database Setup:**
    Ensure the PostgreSQL database exists:
    ```bash
    createdb product_intelligence
    ```
    The application will automatically create the `events_log` table on startup.

## Running the Server

```bash
npm start
```
Or for development with auto-restart (if nodemon is installed):
```bash
npx nodemon server.js
```

## API Usage

### POST /track

Ingest a new event.

**Endpoint:** `POST http://localhost:3000/track`

**Headers:**
- `Content-Type: application/json`

**Body:**
```json
{
  "org_id": "org_123",
  "event_name": "payment_completed",
  "payload": {
    "amount": 99.00,
    "currency": "USD",
    "plan": "pro"
  },
  "timestamp": "2023-10-27T10:00:00Z"
}
```

**Response (Success - 202 Accepted):**
```json
{
  "status": "accepted",
  "id": "1698400800000-0" 
}
```
*(ID is the Redis Stream ID)*

**Response (Error - 400 Bad Request):**
```json
{
  "error": "Validation Error",
  "message": "\"timestamp\" must be in ISO 8601 date format"
}
```

## Architecture

- **server.js**: Entry point, initializes connections.
- **routes/track.js**: API endpoint, validates data using Joi.
- **services/queue.js**: Redis Stream producer.
- **db/index.js**: PostgreSQL connection and logging.
