const Joi = require('joi');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errors
      });
    }

    req[property] = value;
    next();
  };
};

const validateParams = (schema) => {
  return validate(schema, 'params');
};

const validateQuery = (schema) => {
  return validate(schema, 'query');
};

module.exports = {
  validate,
  validateParams,
  validateQuery
};