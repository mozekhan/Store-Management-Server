const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { AppError } = require('./errorHandler');

const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: {
      success: false,
      error: 'Rate Limit Exceeded',
      message: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,

    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?._id?.toString() || ipKeyGenerator(req);
    },

    handler: (req, res) => {
      throw new AppError(
        'Too many requests, please try again later.',
        429
      );
    },

    ...options
  });
};

// Specific rate limiters
const rateLimiters = {
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => ipKeyGenerator(req)
  }),

  api: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100
  }),

  sensitive: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 20
  }),

  scan: createRateLimiter({
    windowMs: 60 * 1000,
    max: 30
  }),

  reports: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10
  })
};

module.exports = rateLimiters;