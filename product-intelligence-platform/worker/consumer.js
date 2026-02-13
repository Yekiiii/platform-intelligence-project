/**
 * Redis Stream Consumer
 * 
 * Handles connection to Redis, consumer group management, and message consumption.
 * Uses XREADGROUP for reliable, distributed consumption with acknowledgments.
 */
const { createClient } = require('redis');
const config = require('./config');

let client = null;

/**
 * Initialize Redis client connection
 */
const connect = async () => {
  if (client && client.isOpen) {
    return client;
  }

  client = createClient({ url: config.redis.url });
  client.on('error', (err) => console.error('[Redis] Client error:', err));
  
  await client.connect();
  console.log(`[Redis] Connected to ${config.redis.url}`);
  
  return client;
};

/**
 * Ensure the consumer group exists.
 * Creates it if not present, starting from the beginning of the stream ('0').
 * If stream doesn't exist yet, MKSTREAM creates it.
 */
const ensureConsumerGroup = async () => {
  const { stream, consumerGroup } = config.redis;
  
  try {
    // XGROUP CREATE stream group id [MKSTREAM]
    // '0' means read from the beginning if the group is new
    await client.xGroupCreate(stream, consumerGroup, '0', { MKSTREAM: true });
    console.log(`[Redis] Created consumer group: ${consumerGroup}`);
  } catch (err) {
    // BUSYGROUP means group already exists - that's fine
    if (err.message.includes('BUSYGROUP')) {
      console.log(`[Redis] Consumer group already exists: ${consumerGroup}`);
    } else {
      throw err;
    }
  }
};

/**
 * Read pending messages (PEL - Pending Entries List).
 * These are messages that were delivered to this consumer but never acknowledged.
 * Called on startup to reprocess any messages that failed previously.
 * 
 * Uses '0' as the start ID to get all pending messages for this consumer.
 */
const readPendingMessages = async () => {
  const { stream, consumerGroup, consumerName, batchSize } = config.redis;
  
  console.log(`[Redis] Checking for pending messages for consumer: ${consumerName}`);
  
  // XREADGROUP GROUP group consumer STREAMS stream id
  // '0' means "give me my pending messages that I haven't ACK'd yet"
  const response = await client.xReadGroup(
    consumerGroup,
    consumerName,
    { key: stream, id: '0' }, // '0' = pending messages only
    { COUNT: batchSize }
  );
  
  if (!response || response.length === 0) {
    console.log('[Redis] No pending messages found');
    return [];
  }
  
  const messages = response[0].messages;
  console.log(`[Redis] Found ${messages.length} pending messages to reprocess`);
  
  return messages;
};

/**
 * Read new messages from the stream.
 * Uses '>' to get only new (never-delivered) messages.
 * Blocks for config.redis.blockTimeout ms if no messages available.
 */
const readNewMessages = async () => {
  const { stream, consumerGroup, consumerName, batchSize, blockTimeout } = config.redis;
  
  // XREADGROUP GROUP group consumer [BLOCK ms] [COUNT n] STREAMS stream >
  // '>' means "give me new messages that haven't been delivered to anyone"
  const response = await client.xReadGroup(
    consumerGroup,
    consumerName,
    { key: stream, id: '>' }, // '>' = new messages only
    { COUNT: batchSize, BLOCK: blockTimeout }
  );
  
  if (!response || response.length === 0) {
    return [];
  }
  
  return response[0].messages;
};

/**
 * Acknowledge a message as successfully processed.
 * Only call this AFTER the message has been durably written to PostgreSQL
 * or confirmed as a duplicate.
 * 
 * @param {string} messageId - The Redis Stream message ID (e.g., "1234567890123-0")
 */
const acknowledgeMessage = async (messageId) => {
  const { stream, consumerGroup } = config.redis;
  
  // XACK stream group id
  await client.xAck(stream, consumerGroup, messageId);
};

/**
 * Parse a raw Redis Stream message into a structured event object.
 * Redis stores everything as strings, so we need to parse JSON fields.
 * 
 * Maps to CANONICAL SCHEMA:
 * - id: TEXT (from event_id or Redis Stream ID)
 * - org_id: TEXT
 * - user_id: TEXT
 * - event_name: TEXT
 * - properties: JSONB
 * - event_timestamp: TIMESTAMPTZ (from API timestamp field)
 * 
 * @param {object} message - Raw message from XREADGROUP { id, message: { field: value } }
 * @returns {object} Parsed event ready for database insertion
 */
const parseMessage = (message) => {
  const { id, message: fields } = message;
  
  console.log(`[Redis] Parsing message: ${id}`);
  
  // Parse properties from JSON string to object
  let properties = {};
  if (fields.properties) {
    try {
      properties = JSON.parse(fields.properties);
    } catch (err) {
      console.warn(`[Redis] Failed to parse properties for message ${id}:`, err.message);
      properties = {};
    }
  }
  
  // Map fields to canonical schema
  const event = {
    id: fields.event_id || id, // Use client event_id if provided, else Redis stream ID
    streamId: id, // Always keep the Redis stream ID for XACK
    org_id: fields.org_id,
    user_id: fields.user_id,
    event_name: fields.event_name,
    properties: properties, // Parsed JSONB
    event_timestamp: fields.timestamp, // API 'timestamp' maps to DB 'event_timestamp'
  };
  
  console.log(`[Redis] Parsed event: { id: ${event.id}, org_id: ${event.org_id}, event_name: ${event.event_name}, event_timestamp: ${event.event_timestamp} }`);
  
  return event;
};

/**
 * Gracefully disconnect from Redis
 */
const disconnect = async () => {
  if (client && client.isOpen) {
    await client.quit();
    console.log('[Redis] Disconnected');
  }
};

module.exports = {
  connect,
  ensureConsumerGroup,
  readPendingMessages,
  readNewMessages,
  acknowledgeMessage,
  parseMessage,
  disconnect,
};
