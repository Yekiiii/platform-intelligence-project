const { client } = require('../../services/queue');

const DEFAULT_TTL = 90; // seconds

class CacheService {
  constructor() {
    this.client = client;
    this.metrics = {
      hits: 0,
      misses: 0
    };
  }

  /**
   * Helper to generate standardized cache keys.
   * Joins parts with ':'
   */
  generateKey(...parts) {
    return parts.join(':');
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get value from cache
   * @param {string} key 
   * @returns {Promise<any|null>} Parsed JSON or null
   */
  async get(key) {
    try {
      if (!this.client.isOpen) {
        this.metrics.misses++;
        return null;
      }
      const data = await this.client.get(key);
      if (data) {
        this.metrics.hits++;
        return JSON.parse(data);
      }
      this.metrics.misses++;
      return null;
    } catch (err) {
      console.error(`[Cache] Get Error for ${key}:`, err.message);
      this.metrics.misses++;
      return null; // Fail safe return null to trigger DB fetch
    }
  }

  /**
   * Set value in cache
   * @param {string} key 
   * @param {any} data 
   * @param {number} ttl Seconds
   */
  async set(key, data, ttl = DEFAULT_TTL) {
    try {
      if (!this.client.isOpen) return;
      await this.client.set(key, JSON.stringify(data), { EX: ttl });
    } catch (err) {
      console.error(`[Cache] Set Error for ${key}:`, err.message);
      // Fail safe, do nothing
    }
  }
}

module.exports = new CacheService();
