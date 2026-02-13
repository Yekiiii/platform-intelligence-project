const express = require('express');
const Joi = require('joi');
const { addToStream } = require('../services/queue');
const { logEvent } = require('../db');

const router = express.Router();

// Validation Schema
const eventSchema = Joi.object({
  org_id: Joi.string().required(),
  user_id: Joi.string().required(),
  event_name: Joi.string().required(),
  event_id: Joi.string().optional(), // Idempotency key
  properties: Joi.object().unknown().default({}), // Allow empty properties
  timestamp: Joi.string().isoDate().required()
});

router.post('/', async (req, res, next) => {
  try {
    // 1. Validate Payload
    const { error, value } = eventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation Error', 
        message: error.details[0].message 
      });
    }

    const eventData = value;

    // Check properties size (approximate)
    const propertiesSize = JSON.stringify(eventData.properties).length;
    if (propertiesSize > 10240) { // 10KB limit
        return res.status(400).json({
            error: 'Payload Too Large',
            message: 'Event properties exceed 10KB limit'
        });
    }

    // 2. Push to Redis Stream
    // We'll use 'events_stream' as the key
    const streamId = await addToStream('events_stream', eventData);

    // 3. Optional: Log to DB (Async, don't block response if possible, but here we await for simplicity or error catching)
    // We attach the stream ID as the event ID for correlation
    const eventWithId = { ...eventData, id: streamId };
    
    // Fire and forget logging to avoid latency, or await if strict durability is needed.
    // For high throughput, we might skip this or do it in the worker. 
    // But per requirements "Optional: log events in DB for debugging", we'll do it here.
    logEvent(eventWithId).catch(err => console.error('Background logging failed', err));

    // 4. Respond
    res.status(202).json({ 
      status: 'accepted', 
      id: streamId 
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
