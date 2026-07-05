// ============================================================
// services/baseService.js - Base service with common functionality
// ============================================================

const AuditLog = require('../models/AuditLog');
const { AppError } = require('../middleware/errorHandler');

class BaseService {
  constructor() {
    this.auditLog = this.auditLog.bind(this);
  }

  /**
   * Unified audit logging - single source of truth
   */
  async auditLog(actorId, actorRole, action, resourceType, resourceId, storeId, details, severity = 'INFO') {
    try {
      const auditLog = new AuditLog({
        actorId,
        actorRole: actorRole || 'SYSTEM',
        action,
        resourceType,
        resourceId,
        storeId,
        details: {
          before: details?.before || null,
          after: details?.after || null,
          metadata: details?.metadata || {}
        },
        severity
      });
      await auditLog.save();
      return auditLog;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging shouldn't break the main flow
    }
  }

  /**
   * Get user from request object
   */
  getUserFromReq(req) {
    return {
      id: req.user?._id,
      role: req.user?.role,
      storeId: req.user?.storeId,
      ip: req.ip,
      userAgent: req.headers?.['user-agent']
    };
  }

  /**
   * Build metadata from request
   */
  buildMetadata(req, additional = {}) {
    return {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
      ...additional
    };
  }

  /**
   * Check if user has access to a store
   */
  hasStoreAccess(user, storeId) {
    if (user.role === 'SUPER_ADMIN') return true;
    return user.storeId?.toString() === storeId?.toString();
  }

  /**
   * Sanitize input
   */
  sanitize(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
  }
}

module.exports = BaseService;