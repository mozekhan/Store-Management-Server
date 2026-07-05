// const Inventory = require('../models/Inventory');
// const Product = require('../models/Product');
// const AuditLog = require('../models/AuditLog');
// const { AppError } = require('../middleware/errorHandler');

// exports.getInventory = async (req, res) => {
//   try {
//     const { 
//       page = 1, 
//       limit = 20,
//       lowStock,
//       outOfStock,
//       search,
//       category,
//       sortBy = 'quantity',
//       sortOrder = 'asc'
//     } = req.query;

//     const storeId = req.user.role === 'SUPER_ADMIN' ? req.query.storeId : req.user.storeId;
    
//     const query = { storeId };
    
//     // Filter by stock status
//     if (lowStock === 'true') {
//       query.$expr = { $lte: ['$quantity', '$reorderPoint'] };
//     }
//     if (outOfStock === 'true') {
//       query.quantity = 0;
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     let inventoryQuery = Inventory.find(query)
//       .populate({
//         path: 'productId',
//         match: { isActive: true },
//         populate: { path: 'storeId', select: 'name code' }
//       })
//       .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
//       .skip(skip)
//       .limit(parseInt(limit));

//     let inventory = await inventoryQuery;

//     // Filter out products that were removed (isActive: false)
//     inventory = inventory.filter(item => item.productId !== null);

//     // Apply additional filters
//     if (search) {
//       inventory = inventory.filter(item => 
//         item.productId.name.toLowerCase().includes(search.toLowerCase()) ||
//         item.productId.sku.toLowerCase().includes(search.toLowerCase())
//       );
//     }

//     if (category) {
//       inventory = inventory.filter(item => 
//         item.productId.category === category
//       );
//     }

//     const total = await Inventory.countDocuments(query);

//     // Calculate statistics
//     const stats = await Inventory.aggregate([
//       { $match: query },
//       {
//         $group: {
//           _id: null,
//           totalItems: { $sum: '$quantity' },
//           totalValue: { 
//             $sum: { $multiply: ['$quantity', '$productId.unitPrice'] } 
//           },
//           lowStockCount: {
//             $sum: {
//               $cond: [{ $lte: ['$quantity', '$reorderPoint'] }, 1, 0]
//             }
//           },
//           outOfStockCount: {
//             $sum: {
//               $cond: [{ $eq: ['$quantity', 0] }, 1, 0]
//             }
//           }
//         }
//       }
//     ]);

//     res.json({
//       success: true,
//       data: {
//         inventory,
//         stats: stats[0] || {
//           totalItems: 0,
//           totalValue: 0,
//           lowStockCount: 0,
//           outOfStockCount: 0
//         },
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

// exports.adjustStock = async (req, res) => {
//   try {
//     const { productId, quantity, reason } = req.body;

//     if (!reason) {
//       return res.status(400).json({
//         success: false,
//         message: 'Reason is required for stock adjustment'
//       });
//     }

//     if (quantity === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Adjustment quantity cannot be zero'
//       });
//     }

//     const inventory = await Inventory.findOne({
//       productId,
//       storeId: req.user.storeId
//     }).populate('productId');

//     if (!inventory) {
//       return res.status(404).json({
//         success: false,
//         message: 'Inventory not found'
//       });
//     }

//     const before = inventory.toObject();
//     const newQuantity = inventory.quantity + quantity;
    
//     if (newQuantity < 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Insufficient stock. Current quantity: ' + inventory.quantity
//       });
//     }

//     inventory.quantity = newQuantity;
//     inventory.lastCounted = new Date();
//     await inventory.save();

//     // Log audit
//     await AuditLog.create({
//       actorId: req.user._id,
//       actorRole: req.user.role,
//       action: 'UPDATE',
//       resourceType: 'Inventory',
//       resourceId: inventory._id,
//       storeId: req.user.storeId,
//       details: {
//         before: { quantity: before.quantity },
//         after: { quantity: inventory.quantity },
//         metadata: {
//           ipAddress: req.ip,
//           userAgent: req.headers['user-agent'],
//           reason,
//           adjustment: quantity,
//           productName: inventory.productId.name,
//           productSku: inventory.productId.sku
//         }
//       },
//       severity: quantity < 0 ? 'WARNING' : 'INFO'
//     });

//     // Check if stock is low
//     if (inventory.quantity <= inventory.reorderPoint && inventory.quantity > 0) {
//       // Trigger low stock notification
//       const io = req.app.get('io');
//       if (io) {
//         io.to(`store-${req.user.storeId}`).emit('low-stock', {
//           productId: inventory.productId._id,
//           productName: inventory.productId.name,
//           sku: inventory.productId.sku,
//           currentStock: inventory.quantity,
//           reorderPoint: inventory.reorderPoint,
//           timestamp: new Date()
//         });
//       }
//     }

//     res.json({
//       success: true,
//       data: {
//         inventory,
//         adjustment: quantity,
//         reason,
//         previousQuantity: before.quantity,
//         newQuantity: inventory.quantity
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// exports.bulkAdjustStock = async (req, res) => {
//   try {
//     const { adjustments } = req.body;

//     if (!Array.isArray(adjustments) || adjustments.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Adjustments array is required'
//       });
//     }

//     const results = [];
//     const errors = [];

//     for (const adjustment of adjustments) {
//       try {
//         const { productId, quantity, reason } = adjustment;
        
//         if (!reason) {
//           errors.push({ productId, error: 'Reason is required' });
//           continue;
//         }

//         if (quantity === 0) {
//           errors.push({ productId, error: 'Adjustment quantity cannot be zero' });
//           continue;
//         }

//         const inventory = await Inventory.findOne({
//           productId,
//           storeId: req.user.storeId
//         }).populate('productId');

//         if (!inventory) {
//           errors.push({ productId, error: 'Inventory not found' });
//           continue;
//         }

//         const beforeQuantity = inventory.quantity;
//         const newQuantity = inventory.quantity + quantity;
        
//         if (newQuantity < 0) {
//           errors.push({ 
//             productId, 
//             error: `Insufficient stock. Current: ${inventory.quantity}` 
//           });
//           continue;
//         }

//         inventory.quantity = newQuantity;
//         inventory.lastCounted = new Date();
//         await inventory.save();

//         // Log audit
//         await AuditLog.create({
//           actorId: req.user._id,
//           actorRole: req.user.role,
//           action: 'UPDATE',
//           resourceType: 'Inventory',
//           resourceId: inventory._id,
//           storeId: req.user.storeId,
//           details: {
//             before: { quantity: beforeQuantity },
//             after: { quantity: inventory.quantity },
//             metadata: {
//               ipAddress: req.ip,
//               userAgent: req.headers['user-agent'],
//               reason,
//               adjustment: quantity
//             }
//           }
//         });

//         results.push({
//           productId,
//           productName: inventory.productId?.name || 'Unknown',
//           previousQuantity: beforeQuantity,
//           newQuantity: inventory.quantity,
//           adjustment: quantity
//         });
//       } catch (error) {
//         errors.push({ productId: adjustment.productId, error: error.message });
//       }
//     }

//     res.json({
//       success: true,
//       data: {
//         results,
//         errors,
//         totalProcessed: results.length,
//         totalErrors: errors.length
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// exports.getInventoryByProduct = async (req, res) => {
//   try {
//     const { productId } = req.params;

//     const inventory = await Inventory.findOne({
//       productId,
//       storeId: req.user.storeId
//     }).populate('productId');

//     if (!inventory) {
//       return res.status(404).json({
//         success: false,
//         message: 'Inventory not found'
//       });
//     }

//     // Get stock movement history
//     const movements = await AuditLog.find({
//       resourceType: 'Inventory',
//       resourceId: inventory._id
//     })
//     .sort({ timestamp: -1 })
//     .limit(100)
//     .populate('actorId', 'firstName lastName');

//     res.json({
//       success: true,
//       data: {
//         inventory,
//         movements
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// exports.getStockMovements = async (req, res) => {
//   try {
//     const { 
//       productId, 
//       startDate, 
//       endDate,
//       page = 1,
//       limit = 50
//     } = req.query;

//     const query = {
//       resourceType: 'Inventory',
//       action: 'UPDATE'
//     };

//     if (productId) {
//       const inventory = await Inventory.findOne({ 
//         productId, 
//         storeId: req.user.storeId 
//       });
//       if (inventory) {
//         query.resourceId = inventory._id;
//       } else {
//         return res.json({
//           success: true,
//           data: {
//             movements: [],
//             pagination: { page: 1, limit, total: 0, pages: 0 }
//           }
//         });
//       }
//     }

//     if (startDate || endDate) {
//       query.timestamp = {};
//       if (startDate) query.timestamp.$gte = new Date(startDate);
//       if (endDate) query.timestamp.$lte = new Date(endDate);
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     const [movements, total] = await Promise.all([
//       AuditLog.find(query)
//         .populate('actorId', 'firstName lastName email')
//         .populate('storeId', 'name')
//         .sort({ timestamp: -1 })
//         .skip(skip)
//         .limit(parseInt(limit)),
//       AuditLog.countDocuments(query)
//     ]);

//     res.json({
//       success: true,
//       data: {
//         movements,
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























// ============================================================
// controllers/inventoryController.js - Inventory controller
// ============================================================

const InventoryService = require('../services/inventoryService');

/**
 * Get inventory list
 */
exports.getInventory = async (req, res) => {
  try {
    const result = await InventoryService.getInventory(req.query, req.user);

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
 * Adjust stock
 */
exports.adjustStock = async (req, res) => {
  try {
    const { productId, quantity, reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required for stock adjustment'
      });
    }

    const result = await InventoryService.adjustStock(
      productId,
      req.user.storeId,
      quantity,
      reason,
      req.user._id,
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

/**
 * Bulk adjust stock
 */
exports.bulkAdjustStock = async (req, res) => {
  try {
    const { adjustments } = req.body;

    if (!Array.isArray(adjustments) || adjustments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Adjustments array is required'
      });
    }

    const result = await InventoryService.bulkAdjustStock(
      adjustments,
      req.user._id,
      req.user.storeId,
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

/**
 * Get low stock items
 */
exports.getLowStockItems = async (req, res) => {
  try {
    const items = await InventoryService.getLowStockItems(req.user.storeId);

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get inventory summary
 */
exports.getInventorySummary = async (req, res) => {
  try {
    const summary = await InventoryService.getInventorySummary(req.user.storeId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get inventory by product
 */
exports.getInventoryByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const inventory = await InventoryService.getInventoryByProduct(
      productId,
      req.user.storeId
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