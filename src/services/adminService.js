// ============================================================
// services/adminService.js - Admin management service
// ============================================================

const User = require('../models/User');
const Store = require('../models/Store');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');
const BaseService = require('./baseService');
const { AppError } = require('../middleware/errorHandler');
const crypto = require('crypto');

class AdminService extends BaseService {
  /**
   * Get system-wide statistics
   */
  async getSystemStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalUsers,
      totalStores,
      totalProducts,
      totalTransactions,
      completedTransactions,
      pendingTransactions,
      todayRevenue,
      monthRevenue,
      totalRevenue,
      inventoryStats
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Store.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true }),
      Transaction.countDocuments(),
      Transaction.countDocuments({ status: 'COMPLETED' }),
      Transaction.countDocuments({
        status: { $in: ['PENDING', 'SALES_QR', 'PAYMENT_QR'] }
      }),
      Transaction.aggregate([
        {
          $match: {
            status: 'COMPLETED',
            createdAt: { $gte: today }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Transaction.aggregate([
        {
          $match: {
            status: 'COMPLETED',
            createdAt: { $gte: monthStart }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Transaction.aggregate([
        { $match: { status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Inventory.aggregate([
        {
          $group: {
            _id: null,
            totalItems: { $sum: '$quantity' },
            lowStockCount: {
              $sum: {
                $cond: [{ $lte: ['$quantity', '$reorderPoint'] }, 1, 0]
              }
            },
            outOfStockCount: {
              $sum: {
                $cond: [{ $eq: ['$quantity', 0] }, 1, 0]
              }
            }
          }
        }
      ])
    ]);

    return {
      users: totalUsers,
      stores: totalStores,
      products: totalProducts,
      transactions: {
        total: totalTransactions,
        completed: completedTransactions,
        pending: pendingTransactions
      },
      revenue: {
        today: todayRevenue[0]?.total || 0,
        thisMonth: monthRevenue[0]?.total || 0,
        allTime: totalRevenue[0]?.total || 0
      },
      inventory: inventoryStats[0] || {
        totalItems: 0,
        lowStockCount: 0,
        outOfStockCount: 0
      }
    };
  }

  /**
   * Get store-specific statistics
   */
  async getStoreStats(storeId, user) {
    // Check access
    if (user.role !== 'SUPER_ADMIN' &&
        storeId.toString() !== user.storeId?.toString()) {
      throw new AppError('Access denied', 403);
    }

    const store = await Store.findById(storeId);
    if (!store) {
      throw new AppError('Store not found', 404);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalUsers,
      totalProducts,
      totalTransactions,
      completedTransactions,
      pendingTransactions,
      todayRevenue,
      monthRevenue,
      inventoryStats
    ] = await Promise.all([
      User.countDocuments({ storeId, isActive: true }),
      Product.countDocuments({ storeId, isActive: true }),
      Transaction.countDocuments({ storeId }),
      Transaction.countDocuments({ storeId, status: 'COMPLETED' }),
      Transaction.countDocuments({
        storeId,
        status: { $in: ['PENDING', 'SALES_QR', 'PAYMENT_QR'] }
      }),
      Transaction.aggregate([
        {
          $match: {
            storeId,
            status: 'COMPLETED',
            createdAt: { $gte: today }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Transaction.aggregate([
        {
          $match: {
            storeId,
            status: 'COMPLETED',
            createdAt: { $gte: monthStart }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Inventory.aggregate([
        { $match: { storeId } },
        {
          $group: {
            _id: null,
            totalItems: { $sum: '$quantity' },
            lowStockCount: {
              $sum: {
                $cond: [{ $lte: ['$quantity', '$reorderPoint'] }, 1, 0]
              }
            },
            outOfStockCount: {
              $sum: {
                $cond: [{ $eq: ['$quantity', 0] }, 1, 0]
              }
            }
          }
        }
      ])
    ]);

    return {
      store,
      users: totalUsers,
      products: totalProducts,
      transactions: {
        total: totalTransactions,
        completed: completedTransactions,
        pending: pendingTransactions
      },
      revenue: {
        today: todayRevenue[0]?.total || 0,
        thisMonth: monthRevenue[0]?.total || 0
      },
      inventory: inventoryStats[0] || {
        totalItems: 0,
        lowStockCount: 0,
        outOfStockCount: 0
      }
    };
  }

  /**
   * Get activity logs with filters
   */
  async getActivityLogs(query, user) {
    const {
      page = 1,
      limit = 50,
      action,
      resourceType,
      severity,
      startDate,
      endDate,
      storeId,
      actorId
    } = query;

    const filter = {};

    // Check access
    if (user.role !== 'SUPER_ADMIN') {
      filter.storeId = user.storeId;
    } else if (storeId) {
      filter.storeId = storeId;
    }

    if (action) filter.action = action;
    if (resourceType) filter.resourceType = resourceType;
    if (severity) filter.severity = severity;
    if (actorId) filter.actorId = actorId;

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

  /**
   * Verify system integrity
   */
  async verifySystemIntegrity() {
    const [auditLogs, transactions, inventory] = await Promise.all([
      this._verifyAuditIntegrity(),
      this._verifyTransactionIntegrity(),
      this._verifyInventoryIntegrity()
    ]);

    return {
      auditLogs,
      transactions,
      inventory,
      timestamp: new Date()
    };
  }

  /**
   * Verify audit log integrity
   */
  async _verifyAuditIntegrity() {
    const logs = await AuditLog.find().sort({ timestamp: 1 }).limit(1000);
    let previousHash = null;
    const corrupted = [];
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

  /**
   * Verify transaction integrity
   */
  async _verifyTransactionIntegrity() {
    // Check for orphaned transactions
    const orphaned = await Transaction.aggregate([
      {
        $lookup: {
          from: 'stores',
          localField: 'storeId',
          foreignField: '_id',
          as: 'store'
        }
      },
      { $match: { store: { $size: 0 } } }
    ]);

    // Check for incomplete workflow (stuck for more than 24 hours)
    const stuckThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const incomplete = await Transaction.find({
      $or: [
        { status: 'SALES_QR', paymentStatus: 'PENDING' },
        { status: 'PAYMENT_QR', warehouseStatus: 'PENDING' }
      ],
      createdAt: { $lt: stuckThreshold }
    });

    return {
      orphanedTransactions: orphaned.length,
      incompleteTransactions: incomplete.length,
      details: {
        orphaned: orphaned.map(t => t.transactionNumber),
        incomplete: incomplete.map(t => ({
          transactionNumber: t.transactionNumber,
          status: t.status,
          createdAt: t.createdAt
        }))
      }
    };
  }

  /**
   * Verify inventory integrity
   */
  async _verifyInventoryIntegrity() {
    // Check for negative inventory
    const negative = await Inventory.find({ quantity: { $lt: 0 } });

    // Check for products without inventory
    const products = await Product.find({ isActive: true });
    const inventories = await Inventory.find({});
    const productIds = products.map(p => p._id.toString());
    const inventoryProductIds = inventories.map(i => i.productId.toString());
    const missingInventory = productIds.filter(id => !inventoryProductIds.includes(id));

    // Check for reserved quantity exceeding available
    const overReserved = await Inventory.find({
      $expr: { $gt: ['$reservedQuantity', '$quantity'] }
    });

    return {
      negativeInventory: negative.length,
      missingInventory: missingInventory.length,
      overReserved: overReserved.length,
      details: {
        negative: negative.map(i => ({
          productId: i.productId,
          quantity: i.quantity
        })),
        missing: missingInventory,
        overReserved: overReserved.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          reservedQuantity: i.reservedQuantity
        }))
      }
    };
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [transactions, actions, loginCount] = await Promise.all([
      Transaction.countDocuments({
        $or: [
          { salesAttendantId: userId },
          { financeAttendantId: userId },
          { warehouseStaffId: userId }
        ],
        createdAt: { $gte: startDate }
      }),
      AuditLog.countDocuments({
        actorId: userId,
        timestamp: { $gte: startDate }
      }),
      AuditLog.countDocuments({
        actorId: userId,
        action: 'LOGIN',
        timestamp: { $gte: startDate }
      })
    ]);

    return {
      userId,
      days,
      transactionsProcessed: transactions,
      totalActions: actions,
      loginCount,
      lastLogin: await this._getLastLogin(userId)
    };
  }

  /**
   * Get last login time
   */
  async _getLastLogin(userId) {
    const log = await AuditLog.findOne({
      actorId: userId,
      action: 'LOGIN'
    }).sort({ timestamp: -1 });
    return log?.timestamp || null;
  }
}

module.exports = new AdminService();