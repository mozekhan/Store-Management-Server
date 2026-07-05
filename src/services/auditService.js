const AuditLog = require('../models/AuditLog');
const { AppError } = require('../middleware/errorHandler');
const crypto = require('crypto');

class AuditService {
  async log(actorId, action, resourceType, resourceId, storeId, details, severity = 'INFO') {
    try {
      const auditLog = new AuditLog({
        actorId,
        actorRole: details?.actorRole || 'SYSTEM',
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

  async getLogs(query, options = {}) {
    const { 
      page = 1, 
      limit = 50, 
      actorId, 
      action, 
      resourceType, 
      resourceId,
      storeId,
      startDate,
      endDate,
      severity
    } = query;

    const filter = {};

    if (actorId) filter.actorId = actorId;
    if (action) filter.action = action;
    if (resourceType) filter.resourceType = resourceType;
    if (resourceId) filter.resourceId = resourceId;
    if (storeId) filter.storeId = storeId;
    if (severity) filter.severity = severity;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actorId', 'firstName lastName email role')
        .populate('storeId', 'name code')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(filter)
    ]);

    return {
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  async getLogById(id) {
    const log = await AuditLog.findById(id)
      .populate('actorId', 'firstName lastName email role')
      .populate('storeId', 'name code');

    if (!log) {
      throw new AppError('Audit log not found', 404);
    }

    return log;
  }

  async verifyIntegrity(limit = 1000) {
    const logs = await AuditLog.find().sort({ timestamp: 1 }).limit(limit);
    
    let previousHash = null;
    let corrupted = [];
    let valid = true;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      
      const data = JSON.stringify({
        timestamp: log.timestamp,
        actorId: log.actorId,
        action: log.action,
        resourceId: log.resourceId,
        details: log.details
      });

      const hash = crypto.createHash('sha256');
      hash.update(data);
      if (previousHash) {
        hash.update(previousHash);
      }
      const expectedHash = hash.digest('hex');

      if (log.tamperProofHash !== expectedHash) {
        corrupted.push({
          id: log._id,
          expectedHash,
          actualHash: log.tamperProofHash
        });
        valid = false;
      }

      previousHash = log.tamperProofHash;
    }

    return {
      valid,
      checked: logs.length,
      corrupted: corrupted.length,
      details: corrupted
    };
  }

  async getUserActivity(userId, limit = 100) {
    return await AuditLog.find({ actorId: userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('storeId', 'name code');
  }

  async getResourceHistory(resourceId, resourceType, limit = 100) {
    return await AuditLog.find({ resourceId, resourceType })
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('actorId', 'firstName lastName email')
      .populate('storeId', 'name code');
  }

  async getAuditStats(startDate, endDate) {
    const query = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const stats = await AuditLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            action: '$action',
            severity: '$severity'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.action',
          severity: {
            $push: {
              severity: '$_id.severity',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      }
    ]);

    const userStats = await AuditLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$actorId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          user: { $arrayElemAt: ['$user', 0] },
          count: 1
        }
      }
    ]);

    return {
      actionStats: stats,
      topUsers: userStats,
      total: await AuditLog.countDocuments(query)
    };
  }
}

module.exports = new AuditService();