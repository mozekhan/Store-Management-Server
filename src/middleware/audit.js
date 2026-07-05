const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const auditMiddleware = (options = {}) => {
  return async (req, res, next) => {
    // Store original end function
    const originalEnd = res.end;
    const originalJson = res.json;

    // Capture response data
    let responseBody = null;
    res.json = function(data) {
      responseBody = data;
      return originalJson.call(this, data);
    };

    // Log after response is sent
    res.end = function(chunk, encoding) {
      const endTime = Date.now();
      const duration = endTime - req.startTime;

      // Log if audit is enabled for this route
      if (options.enabled !== false) {
        const auditData = {
          actorId: req.user?._id,
          actorRole: req.user?.role,
          action: req.method,
          resourceType: options.resourceType || 'API',
          resourceId: req.params.id || req.body.id || null,
          storeId: req.user?.storeId,
          details: {
            metadata: {
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
              method: req.method,
              path: req.path,
              query: req.query,
              body: req.body,
              statusCode: res.statusCode,
              duration: duration,
              response: responseBody
            }
          },
          severity: res.statusCode >= 400 ? 'WARNING' : 'INFO'
        };

        // Create audit log asynchronously
        AuditLog.create(auditData)
          .catch(err => logger.error('Failed to create audit log:', err));

        // Also log to file
        logger.info('API Request', {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration: duration,
          userId: req.user?._id,
          ip: req.ip
        });
      }

      return originalEnd.call(this, chunk, encoding);
    };

    // Set start time
    req.startTime = Date.now();
    next();
  };
};

module.exports = auditMiddleware;