/**
 * Event Worker - Main Entry Point
 * 
 * This is a standalone Node.js process that:
 * 1. Connects to Redis and PostgreSQL
 * 2. Creates/joins a consumer group for events_stream
 * 3. Processes any pending (unacknowledged) messages first
 * 4. Continuously consumes new messages
 * 5. Writes events to ingestion.events with idempotency
 * 6. Acknowledges messages only after successful DB write
 * 
 * Run with: node worker/index.js
 */
const config = require('./config');
const consumer = require('./consumer');
const db = require('./db');

// Graceful shutdown flag
let isShuttingDown = false;

/**
 * Process a single message:
 * 1. Parse the Redis message into an event object
 * 2. Insert into PostgreSQL (idempotent)
 * 3. Acknowledge in Redis ONLY if DB write succeeded or was a duplicate
 * 
 * @param {object} message - Raw message from XREADGROUP
 * @returns {Promise<boolean>} - True if processed successfully, false otherwise
 */
const processMessage = async (message) => {
  const streamId = message.id;
  
  console.log(`[Worker] Received message from Redis: ${streamId}`);
  
  try {
    // 1. Parse the message
    const event = consumer.parseMessage(message);
    console.log(`[Worker] Processing event: ${event.id} (${event.event_name}) for org: ${event.org_id}`);
    
    // 2. Insert into PostgreSQL (idempotent)
    // This is idempotent: duplicates are silently skipped via ON CONFLICT DO NOTHING
    // Also updates analytics tables transactionally if event is new
    const { inserted } = await db.processEvent(event);
    
    if (inserted) {
      console.log(`[Worker] ✓ Processed event (Ingestion + Analytics): ${event.id}`);
    } else {
      console.log(`[Worker] ✓ Duplicate acknowledged (skipped): ${event.id}`);
    }
    
    // 3. Acknowledge the message in Redis
    // CRITICAL: We only reach here if the DB operation succeeded (insert or duplicate)
    // This ensures at-least-once delivery: if we crash before ACK, the message
    // will be redelivered and the duplicate will be handled by ON CONFLICT
    await consumer.acknowledgeMessage(streamId);
    console.log(`[Worker] ✓ Message XACK'd: ${streamId}`);
    
    return true;
  } catch (err) {
    // DO NOT acknowledge the message if we failed to process it
    // It will remain in the PEL and be retried on next startup or by another consumer
    console.error(`[Worker] ✗ Failed to process message ${streamId}:`, err.message);
    return false;
  }
};

/**
 * Process a batch of messages
 * @param {Array} messages - Array of raw messages from XREADGROUP
 */
const processBatch = async (messages) => {
  let successCount = 0;
  let failCount = 0;
  
  for (const message of messages) {
    if (isShuttingDown) {
      console.log('[Worker] Shutdown requested, stopping batch processing');
      break;
    }
    
    const success = await processMessage(message);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  if (messages.length > 0) {
    console.log(`[Worker] Batch complete: ${successCount} succeeded, ${failCount} failed`);
  }
};

/**
 * Main worker loop
 * 1. Process pending messages (PEL) on startup
 * 2. Continuously poll for new messages
 */
const run = async () => {
  console.log('[Worker] Starting Event Worker...');
  console.log(`[Worker] Consumer Name: ${config.redis.consumerName}`);
  console.log(`[Worker] Consumer Group: ${config.redis.consumerGroup}`);
  console.log(`[Worker] Stream: ${config.redis.stream}`);
  
  try {
    // Initialize connections
    await consumer.connect();
    await db.initSchema();
    
    // Ensure consumer group exists
    await consumer.ensureConsumerGroup();
    
    // Step 1: Process any pending messages from previous runs
    // These are messages that were delivered but not acknowledged
    if (config.worker.processPendingOnStartup) {
      console.log('[Worker] Checking for pending messages...');
      const pendingMessages = await consumer.readPendingMessages();
      if (pendingMessages.length > 0) {
        console.log(`[Worker] Reprocessing ${pendingMessages.length} pending messages`);
        await processBatch(pendingMessages);
      }
    }
    
    // Step 2: Main loop - continuously consume new messages
    console.log('[Worker] Starting main consumption loop...');
    
    while (!isShuttingDown) {
      try {
        const messages = await consumer.readNewMessages();
        
        if (messages.length > 0) {
          await processBatch(messages);
        }
        // If no messages, readNewMessages blocks for config.redis.blockTimeout
        // then returns empty array, and we loop again
      } catch (err) {
        if (!isShuttingDown) {
          console.error('[Worker] Error in consumption loop:', err.message);
          // Brief pause before retrying to avoid tight error loops
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    console.log('[Worker] Exiting main loop');
  } catch (err) {
    console.error('[Worker] Fatal error:', err);
    process.exit(1);
  }
};

/**
 * Graceful shutdown handler
 */
const shutdown = async (signal) => {
  console.log(`\n[Worker] Received ${signal}, shutting down gracefully...`);
  isShuttingDown = true;
  
  // Give the current batch a moment to complete
  await new Promise(resolve => setTimeout(resolve, 500));
  
  try {
    await consumer.disconnect();
    await db.disconnect();
    console.log('[Worker] Shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('[Worker] Error during shutdown:', err);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('[Worker] Uncaught exception:', err);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Worker] Unhandled rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});

// Start the worker
run();
