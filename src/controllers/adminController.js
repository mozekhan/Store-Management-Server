// const User = require('../models/User');
// const Store = require('../models/Store');
// const AuditLog = require('../models/AuditLog');
// const Transaction = require('../models/Transaction');
// const Product = require('../models/Product');
// const { AppError } = require('../middleware/errorHandler');

// exports.getSystemStats = async (req, res) => {
//   try {
//     const stats = {
//       users: await User.countDocuments({ isActive: true }),
//       stores: await Store.countDocuments({ isActive: true }),
//       products: await Product.countDocuments({ isActive: true }),
//       transactions: {
//         total: await Transaction.countDocuments(),
//         completed: await Transaction.countDocuments({ status: 'COMPLETED' }),
//         pending: await Transaction.countDocuments({ status: { $in: ['PENDING', 'SALES_QR', 'PAYMENT_QR'] } })
//       },
//       revenue: {
//         today: 0,
//         thisMonth: 0,
//         allTime: 0
//       }
//     };

//     // Calculate revenue
//     const [todayRevenue, monthRevenue, totalRevenue] = await Promise.all([
//       Transaction.aggregate([
//         { 
//           $match: { 
//             status: 'COMPLETED',
//             createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
//           } 
//         },
//         { $group: { _id: null, total: { $sum: '$totalAmount' } } }
//       ]),
//       Transaction.aggregate([
//         { 
//           $match: { 
//             status: 'COMPLETED',
//             createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
//           } 
//         },
//         { $group: { _id: null, total: { $sum: '$totalAmount' } } }
//       ]),
//       Transaction.aggregate([
//         { $match: { status: 'COMPLETED' } },
//         { $group: { _id: null, total: { $sum: '$totalAmount' } } }
//       ])
//     ]);

//     stats.revenue.today = todayRevenue[0]?.total || 0;
//     stats.revenue.thisMonth = monthRevenue[0]?.total || 0;
//     stats.revenue.allTime = totalRevenue[0]?.total || 0;

//     res.json({
//       success: true,
//       data: stats
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// exports.getStoreStats = async (req, res) => {
//   try {
//     const { storeId } = req.params;

//     const store = await Store.findById(storeId);
//     if (!store) {
//       return res.status(404).json({
//         success: false,
//         message: 'Store not found'
//       });
//     }

//     const stats = {
//       store: store,
//       users: await User.countDocuments({ storeId, isActive: true }),
//       products: await Product.countDocuments({ storeId, isActive: true }),
//       transactions: {
//         total: await Transaction.countDocuments({ storeId }),
//         completed: await Transaction.countDocuments({ storeId, status: 'COMPLETED' }),
//         pending: await Transaction.countDocuments({ 
//           storeId, 
//           status: { $in: ['PENDING', 'SALES_QR', 'PAYMENT_QR'] } 
//         })
//       },
//       revenue: {
//         today: 0,
//         thisMonth: 0
//       }
//     };

//     const [todayRevenue, monthRevenue] = await Promise.all([
//       Transaction.aggregate([
//         { 
//           $match: { 
//             storeId: store._id,
//             status: 'COMPLETED',
//             createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
//           } 
//         },
//         { $group: { _id: null, total: { $sum: '$totalAmount' } } }
//       ]),
//       Transaction.aggregate([
//         { 
//           $match: { 
//             storeId: store._id,
//             status: 'COMPLETED',
//             createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
//           } 
//         },
//         { $group: { _id: null, total: { $sum: '$totalAmount' } } }
//       ])
//     ]);

//     stats.revenue.today = todayRevenue[0]?.total || 0;
//     stats.revenue.thisMonth = monthRevenue[0]?.total || 0;

//     res.json({
//       success: true,
//       data: stats
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// exports.getActivityLogs = async (req, res) => {
//   try {
//     const { 
//       page = 1, 
//       limit = 50,
//       action,
//       resourceType,
//       severity,
//       startDate,
//       endDate,
//       storeId 
//     } = req.query;

//     const query = {};

//     if (action) query.action = action;
//     if (resourceType) query.resourceType = resourceType;
//     if (severity) query.severity = severity;
//     if (storeId) query.storeId = storeId;

//     if (startDate || endDate) {
//       query.timestamp = {};
//       if (startDate) query.timestamp.$gte = new Date(startDate);
//       if (endDate) query.timestamp.$lte = new Date(endDate);
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     const [logs, total] = await Promise.all([
//       AuditLog.find(query)
//         .populate('actorId', 'firstName lastName email role')
//         .populate('storeId', 'name code')
//         .sort({ timestamp: -1 })
//         .skip(skip)
//         .limit(parseInt(limit)),
//       AuditLog.countDocuments(query)
//     ]);

//     res.json({
//       success: true,
//       data: {
//         logs,
//         pagination: {
//           page: parseInt(page),
//           limit: parseInt(limit),
//           total,
//           pages: Math.ceil(total / parseInt(limit))
//         }
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// exports.verifySystemIntegrity = async (req, res) => {
//   try {
//     const results = {
//       auditLogs: await verifyAuditIntegrity(),
//       transactions: await verifyTransactionIntegrity(),
//       inventory: await verifyInventoryIntegrity(),
//       timestamp: new Date()
//     };

//     res.json({
//       success: true,
//       data: results
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// const verifyAuditIntegrity = async () => {
//   const logs = await AuditLog.find().sort({ timestamp: 1 }).limit(1000);
//   const crypto = require('crypto');
  
//   let previousHash = null;
//   let corrupted = [];
//   let valid = true;

//   for (let i = 0; i < logs.length; i++) {
//     const log = logs[i];
    
//     const data = JSON.stringify({
//       timestamp: log.timestamp,
//       actorId: log.actorId,
//       action: log.action,
//       resourceId: log.resourceId,
//       details: log.details
//     });

//     const hash = crypto.createHash('sha256');
//     hash.update(data);
//     if (previousHash) {
//       hash.update(previousHash);
//     }
//     const expectedHash = hash.digest('hex');

//     if (log.tamperProofHash !== expectedHash) {
//       corrupted.push({
//         id: log._id,
//         expectedHash,
//         actualHash: log.tamperProofHash
//       });
//       valid = false;
//     }

//     previousHash = log.tamperProofHash;
//   }

//   return {
//     valid,
//     checked: logs.length,
//     corrupted: corrupted.length,
//     details: corrupted
//   };
// };

// const verifyTransactionIntegrity = async () => {
//   // Check for orphaned transactions
//   const orphaned = await Transaction.aggregate([
//     {
//       $lookup: {
//         from: 'stores',
//         localField: 'storeId',
//         foreignField: '_id',
//         as: 'store'
//       }
//     },
//     { $match: { store: { $size: 0 } } }
//   ]);

//   // Check for incomplete workflow
//   const incomplete = await Transaction.find({
//     $or: [
//       { status: 'SALES_QR', paymentStatus: 'PENDING' },
//       { status: 'PAYMENT_QR', warehouseStatus: 'PENDING' }
//     ],
//     createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
//   });

//   return {
//     orphanedTransactions: orphaned.length,
//     incompleteTransactions: incomplete.length,
//     details: {
//       orphaned: orphaned.map(t => t.transactionNumber),
//       incomplete: incomplete.map(t => t.transactionNumber)
//     }
//   };
// };

// const verifyInventoryIntegrity = async () => {
//   // Check for negative inventory
//   const negative = await Inventory.find({ quantity: { $lt: 0 } });
  
//   // Check for products without inventory
//   const products = await Product.find({ isActive: true });
//   const inventories = await Inventory.find({});
//   const productIds = products.map(p => p._id.toString());
//   const inventoryProductIds = inventories.map(i => i.productId.toString());
//   const missingInventory = productIds.filter(id => !inventoryProductIds.includes(id));

//   return {
//     negativeInventory: negative.length,
//     missingInventory: missingInventory.length,
//     details: {
//       negative: negative.map(i => ({
//         productId: i.productId,
//         quantity: i.quantity
//       })),
//       missing: missingInventory
//     }
//   };
// };





















// ============================================================
// controllers/adminController.js - Admin controller
// ============================================================

const AdminService = require('../services/adminService');

/**
 * Get system statistics
 */
exports.getSystemStats = async (req, res) => {
  try {
    const stats = await AdminService.getSystemStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get store statistics
 */
exports.getStoreStats = async (req, res) => {
  try {
    const { storeId } = req.params;
    const stats = await AdminService.getStoreStats(storeId, req.user);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get activity logs
 */
exports.getActivityLogs = async (req, res) => {
  try {
    const result = await AdminService.getActivityLogs(req.query, req.user);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Verify system integrity
 */
exports.verifySystemIntegrity = async (req, res) => {
  try {
    const result = await AdminService.verifySystemIntegrity();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get user activity summary
 */
exports.getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const result = await AdminService.getUserActivitySummary(userId, parseInt(days));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};