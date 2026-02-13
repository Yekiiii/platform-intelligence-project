const { createClient } = require('redis');
require('dotenv').config();

const client = createClient({
  url: process.env.REDIS_URL
});

client.on('error', (err) => console.error('Redis Client Error', err));

const connectRedis = async () => {
  if (!client.isOpen) {
    await client.connect();
    console.log('Connected to Redis');
  }
};

const addToStream = async (streamKey, eventData) => {
  try {
    // XADD streamKey * field1 value1 field2 value2 ...
    // We store the entire event as a JSON string in a 'data' field, 
    // or we can store individual fields. Storing as JSON is often simpler for flexible schemas.
    // However, Redis Streams supports field-value pairs. 
    // Let's store key metadata as fields and the rest as payload.
    
    const id = await client.xAdd(streamKey, '*', {
      org_id: eventData.org_id,
      user_id: eventData.user_id,
      event_name: eventData.event_name,
      event_id: eventData.event_id || '', // Store client provided ID if exists
      properties: JSON.stringify(eventData.properties),
      timestamp: eventData.timestamp
    });
    
    return id;
  } catch (err) {
    console.error('Error adding to Redis Stream:', err);
    throw err;
  }
};

module.exports = {
  client,
  connectRedis,
  addToStream
};
