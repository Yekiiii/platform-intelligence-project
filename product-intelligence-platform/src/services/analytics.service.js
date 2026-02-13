const pool = require('../db/pool');

/**
 * Service to handle read-only analytics queries.
 * Treat analytics.* tables as the source of truth.
 */
class AnalyticsService {
  /**
   * Get Daily Active Users
   * @param {string} orgId 
   * @param {Date} from 
   * @param {Date} to 
   */
  async getDAU(orgId, from, to) {
    const query = `
      SELECT date, active_users
      FROM analytics.daily_active_users
      WHERE org_id = $1
        AND date BETWEEN $2 AND $3
      ORDER BY date;
    `;
    const { rows } = await pool.query(query, [orgId, from, to]);
    return rows;
  }

  /**
   * Get Raw Events (Events Explorer)
   * @param {string} orgId 
   * @param {Date} from 
   * @param {Date} to 
   * @param {number} limit 
   * @param {number} offset 
   */
  async getRawEvents(orgId, from, to, limit, offset) {
    const query = `
      SELECT event_name, event_timestamp as timestamp, user_id, properties as payload, id as event_id
      FROM ingestion.events
      WHERE org_id = $1
        AND event_timestamp BETWEEN $2 AND $3
      ORDER BY event_timestamp DESC
      LIMIT $4 OFFSET $5;
    `;
    const { rows } = await pool.query(query, [orgId, from, to, limit, offset]);
    return rows;
  }

  /**
   * Get Event Counts Over Time (Deprecated/Stats)
   * @param {string} orgId 
   * @param {Date} from 
   * @param {Date} to 
   * @param {number} limit 
   * @param {number} offset 
   */
  async getEventCounts(orgId, from, to, limit, offset) {
    const query = `
      SELECT event_name, date, event_count
      FROM analytics.event_counts_daily
      WHERE org_id = $1
        AND date BETWEEN $2 AND $3
      ORDER BY date, event_name
      LIMIT $4 OFFSET $5;
    `;
    const { rows } = await pool.query(query, [orgId, from, to, limit, offset]);
    return rows;
  }

  /**
   * Get Revenue Over Time
   * @param {string} orgId 
   * @param {Date} from 
   * @param {Date} to 
   */
  async getDailyRevenue(orgId, from, to) {
    const query = `
      SELECT date, revenue
      FROM analytics.daily_revenue
      WHERE org_id = $1
        AND date BETWEEN $2 AND $3
      ORDER BY date;
    `;
    const { rows } = await pool.query(query, [orgId, from, to]);
    return rows;
  }

  /**
   * Get User Lifetime Value
   * @param {string} orgId 
   * @param {number} limit 
   * @param {number} offset 
   */
  async getUserLTV(orgId, limit, offset) {
    const query = `
      SELECT user_id, lifetime_value as total_revenue, last_updated as last_seen
      FROM analytics.user_lifetime_value
      WHERE org_id = $1
      ORDER BY lifetime_value DESC
      LIMIT $2 OFFSET $3;
    `;
    const { rows } = await pool.query(query, [orgId, limit, offset]);
    return rows;
  }
}

module.exports = new AnalyticsService();
