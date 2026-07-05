const winston = require('winston');
const path = require('path');
const fs = require('fs');

const logDir = path.join(__dirname, '../../logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'store-management-api' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Stream for Morgan HTTP logging
logger.stream = {
  write: (message) => logger.info(message.trim())
};

// Custom logger methods
const customLogger = {
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },
  error: (message, meta = {}) => {
    logger.error(message, meta);
  },
  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },
  debug: (message, meta = {}) => {
    logger.debug(message, meta);
  },
  verbose: (message, meta = {}) => {
    logger.verbose(message, meta);
  },
  silly: (message, meta = {}) => {
    logger.silly(message, meta);
  },
  // Log API request
  api: (req, res, duration) => {
    const meta = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?._id,
      userAgent: req.headers['user-agent']
    };
    const level = res.statusCode >= 400 ? 'error' : 'info';
    logger[level](`API Request ${req.method} ${req.path}`, meta);
  },
  // Log system events
  system: (message, meta = {}) => {
    logger.info(`[SYSTEM] ${message}`, meta);
  },
  // Log security events
  security: (message, meta = {}) => {
    logger.warn(`[SECURITY] ${message}`, meta);
  },
  // Log database operations
  database: (operation, meta = {}) => {
    logger.debug(`[DB] ${operation}`, meta);
  },
  // Log business events
  business: (event, meta = {}) => {
    logger.info(`[BUSINESS] ${event}`, meta);
  }
};

// Create child loggers
customLogger.child = (meta) => {
  const childLogger = logger.child(meta);
  return {
    info: (message, additionalMeta = {}) => childLogger.info(message, additionalMeta),
    error: (message, additionalMeta = {}) => childLogger.error(message, additionalMeta),
    warn: (message, additionalMeta = {}) => childLogger.warn(message, additionalMeta),
    debug: (message, additionalMeta = {}) => childLogger.debug(message, additionalMeta)
  };
};

module.exports = customLogger;