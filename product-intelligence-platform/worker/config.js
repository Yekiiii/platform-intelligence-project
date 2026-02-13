/**
 * Worker Configuration
 * 
 * Centralizes all environment variables and provides sane defaults.
 */
require('dotenv').config();
const os = require('os');

module.exports = {
  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    stream: process.env.REDIS_STREAM || 'events_stream',
    consumerGroup: process.env.REDIS_CONSUMER_GROUP || 'events_workers',
    consumerName: process.env.REDIS_CONSUMER_NAME || `worker-${os.hostname()}-${process.pid}`,
    // How long to block on XREADGROUP (ms). 0 = indefinite, but we use 5000 for graceful shutdown
    blockTimeout: parseInt(process.env.REDIS_BLOCK_TIMEOUT, 10) || 5000,
    // How many messages to fetch per read
    batchSize: parseInt(process.env.REDIS_BATCH_SIZE, 10) || 10,
  },

  // PostgreSQL Configuration
  postgres: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123@localhost:5432/product_intelligence',
  },

  // Worker behavior
  worker: {
    // Process pending messages on startup before consuming new ones
    processPendingOnStartup: true,
  }
};
