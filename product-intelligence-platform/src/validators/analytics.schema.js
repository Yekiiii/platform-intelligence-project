const Joi = require('joi');

const dateRangeSchema = Joi.object({
  org_id: Joi.string().optional(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
}).custom((value, helpers) => {
  const { from, to } = value;
  if (from && to && new Date(from) > new Date(to)) {
    return helpers.message('"from" date must be less than or equal to "to" date');
  }
  return value;
});

const eventsSchema = dateRangeSchema.keys({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

const ltvSchema = Joi.object({
  org_id: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

module.exports = {
  dateRangeSchema,
  eventsSchema,
  ltvSchema,
};
