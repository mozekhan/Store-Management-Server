// const Transaction = require('../models/Transaction');
// const Inventory = require('../models/Inventory');
// const AuditLog = require('../models/AuditLog');
// const QRService = require('../services/qrService');

// exports.releaseStock = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { releasedItems } = req.body;
    
//     const transaction = await Transaction.findById(id)
//       .populate('items.productId');
    
//     if (!transaction) {
//       return res.status(404).json({
//         success: false,
//         message: 'Transaction not found'
//       });
//     }
    
//     if (transaction.status !== 'PAYMENT_QR') {
//       return res.status(400).json({
//         success: false,
//         message: 'Transaction not ready for release'
//       });
//     }
    
//     // Process each item release
//     for (const release of releasedItems) {
//       const inventory = await Inventory.findOne({
//         productId: release.productId,
//         storeId: transaction.storeId
//       });
      
//       if (!inventory) {
//         return res.status(404).json({
//           success: false,
//           message: `Inventory not found for product ${release.productId}`
//         });
//       }
      
//       if (inventory.quantity < release.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: `Insufficient stock for product ${release.productId}`
//         });
//       }
      
//       // Deduct stock
//       inventory.quantity -= release.quantity;
//       inventory.reservedQuantity -= release.quantity;
//       await inventory.save();
      
//       // Add to released items
//       transaction.itemsReleased.push({
//         productId: release.productId,
//         quantityReleased: release.quantity,
//         releasedBy: req.user._id
//       });
//     }
    
//     transaction.warehouseStaffId = req.user._id;
//     transaction.releaseTimestamp = new Date();
//     transaction.warehouseStatus = 'RELEASED';
//     transaction.status = 'RELEASED';
    
//     // Generate invoice number
//     const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
//     transaction.finalInvoiceNumber = invoiceNumber;
    
//     await transaction.save();
    
//     await AuditLog.create({
//       actorId: req.user._id,
//       actorRole: req.user.role,
//       action: 'UPDATE',
//       resourceType: 'Transaction',
//       resourceId: transaction._id,
//       storeId: transaction.storeId,
//       details: {
//         after: {
//           warehouseStatus: 'RELEASED',
//           status: 'RELEASED',
//           invoiceNumber
//         },
//         metadata: {
//           ipAddress: req.ip,
//           userAgent: req.headers['user-agent']
//         }
//       }
//     });
    
//     // Emit socket event
//     const io = req.app.get('io');
//     if (io) {
//       io.to(`store-${transaction.storeId}`).emit('transaction-released', {
//         transactionId: transaction._id,
//         invoiceNumber
//       });
//     }
    
//     res.json({
//       success: true,
//       data: transaction
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// exports.completeTransaction = async (req, res) => {
//   try {
//     const { id } = req.params;
    
//     const transaction = await Transaction.findById(id);
    
//     if (!transaction) {
//       return res.status(404).json({
//         success: false,
//         message: 'Transaction not found'
//       });
//     }
    
//     if (transaction.status !== 'RELEASED') {
//       return res.status(400).json({
//         success: false,
//         message: 'Transaction not ready for completion'
//       });
//     }
    
//     transaction.finalInvoicePrinted = true;
//     transaction.status = 'COMPLETED';
//     await transaction.save();
    
//     await AuditLog.create({
//       actorId: req.user._id,
//       actorRole: req.user.role,
//       action: 'UPDATE',
//       resourceType: 'Transaction',
//       resourceId: transaction._id,
//       storeId: transaction.storeId,
//       details: {
//         after: { status: 'COMPLETED' },
//         metadata: {
//           ipAddress: req.ip,
//           userAgent: req.headers['user-agent']
//         }
//       }
//     });
    
//     res.json({
//       success: true,
//       data: transaction
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };


























// ============================================================
// controllers/warehouseController.js - Warehouse controller
// ============================================================

const WarehouseService = require('../services/warehouseService');

/**
 * Release stock for a transaction
 */
exports.releaseStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { releasedItems } = req.body;

    if (!releasedItems || !Array.isArray(releasedItems) || releasedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Released items array is required'
      });
    }

    const result = await WarehouseService.releaseStock(
      id,
      req.user._id,
      releasedItems,
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      data: result,
      message: 'Stock released successfully'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Complete transaction
 */
exports.completeTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await WarehouseService.completeTransaction(
      id,
      req.user._id,
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      data: transaction,
      message: 'Transaction completed successfully'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get warehouse dashboard stats
 */
exports.getWarehouseStats = async (req, res) => {
  try {
    const storeId = req.user.role === 'SUPER_ADMIN' 
      ? req.query.storeId 
      : req.user.storeId;

    const stats = await WarehouseService.getWarehouseStats(storeId);

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
 * Get transaction for warehouse processing
 */
exports.getTransactionForWarehouse = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await WarehouseService.getTransactionForWarehouse(
      id,
      req.user
    );

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get warehouse transactions
 */
exports.getWarehouseTransactions = async (req, res) => {
  try {
    const result = await WarehouseService.getWarehouseTransactions(
      req.query,
      req.user
    );

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
 * Get inventory item for warehouse
 */
exports.getWarehouseInventoryItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const storeId = req.user.role === 'SUPER_ADMIN'
      ? req.query.storeId
      : req.user.storeId;

    const inventory = await WarehouseService.getWarehouseInventoryItem(
      productId,
      storeId,
      req.user
    );

    res.json({
      success: true,
      data: inventory
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Bulk update inventory locations
 */
exports.bulkUpdateLocations = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required'
      });
    }

    const storeId = req.user.role === 'SUPER_ADMIN'
      ? req.query.storeId
      : req.user.storeId;

    const result = await WarehouseService.bulkUpdateLocations(
      updates,
      req.user._id,
      storeId,
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};