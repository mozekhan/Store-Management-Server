// const Transaction = require('../models/Transaction');
// const Inventory = require('../models/Inventory');

// exports.salesReport = async (req, res) => {
//   try {
//     const { startDate, endDate, storeId } = req.query;
    
//     const query = {
//       status: 'COMPLETED',
//       createdAt: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate)
//       }
//     };
    
//     if (storeId) query.storeId = storeId;
//     else if (req.user.role !== 'SUPER_ADMIN') {
//       query.storeId = req.user.storeId;
//     }
    
//     const sales = await Transaction.aggregate([
//       { $match: query },
//       {
//         $group: {
//           _id: {
//             day: { $dayOfMonth: '$createdAt' },
//             month: { $month: '$createdAt' },
//             year: { $year: '$createdAt' }
//           },
//           totalSales: { $sum: '$totalAmount' },
//           totalTransactions: { $sum: 1 },
//           averageOrderValue: { $avg: '$totalAmount' },
//           totalItems: { $sum: { $size: '$items' } }
//         }
//       },
//       { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
//     ]);
    
//     // Payment method breakdown
//     const paymentBreakdown = await Transaction.aggregate([
//       { $match: query },
//       {
//         $group: {
//           _id: '$paymentMethod',
//           count: { $sum: 1 },
//           totalAmount: { $sum: '$totalAmount' }
//         }
//       }
//     ]);
    
//     res.json({
//       success: true,
//       data: {
//         sales,
//         paymentBreakdown,
//         summary: {
//           totalSales: sales.reduce((sum, s) => sum + s.totalSales, 0),
//           totalTransactions: sales.reduce((sum, s) => sum + s.totalTransactions, 0),
//           averageOrderValue: sales.length > 0 
//             ? sales.reduce((sum, s) => sum + s.averageOrderValue, 0) / sales.length 
//             : 0
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

// exports.inventoryReport = async (req, res) => {
//   try {
//     const { storeId } = req.query;
    
//     const query = {};
//     if (storeId) query.storeId = storeId;
//     else if (req.user.role !== 'SUPER_ADMIN') {
//       query.storeId = req.user.storeId;
//     }
    
//     const inventory = await Inventory.find(query)
//       .populate('productId')
//       .sort({ quantity: 1 });
    
//     const lowStock = inventory.filter(item => item.quantity <= item.reorderPoint);
//     const outOfStock = inventory.filter(item => item.quantity === 0);
    
//     res.json({
//       success: true,
//       data: {
//         inventory,
//         summary: {
//           totalProducts: inventory.length,
//           lowStock: lowStock.length,
//           outOfStock: outOfStock.length,
//           totalValue: inventory.reduce((sum, item) => {
//             return sum + (item.quantity * item.productId.unitPrice);
//           }, 0)
//         },
//         lowStock,
//         outOfStock
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// exports.financialReport = async (req, res) => {
//   try {
//     const { startDate, endDate, storeId } = req.query;
    
//     const query = {
//       status: 'COMPLETED',
//       createdAt: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate)
//       }
//     };
    
//     if (storeId) query.storeId = storeId;
//     else if (req.user.role !== 'SUPER_ADMIN') {
//       query.storeId = req.user.storeId;
//     }
    
//     const results = await Transaction.aggregate([
//       { $match: query },
//       {
//         $group: {
//           _id: null,
//           totalRevenue: { $sum: '$totalAmount' },
//           totalTax: { $sum: '$taxTotal' },
//           totalSubtotal: { $sum: '$subtotal' },
//           transactionCount: { $sum: 1 },
//           averageOrderValue: { $avg: '$totalAmount' }
//         }
//       }
//     ]);
    
//     const paymentMethods = await Transaction.aggregate([
//       { $match: query },
//       {
//         $group: {
//           _id: '$paymentMethod',
//           total: { $sum: '$totalAmount' },
//           count: { $sum: 1 }
//         }
//       }
//     ]);
    
//     res.json({
//       success: true,
//       data: {
//         summary: results[0] || {},
//         paymentMethods
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

























// const ReportService = require('../services/reportService');
// const { AppError } = require('../middleware/errorHandler');

// exports.salesReport = async (req, res) => {
//   try {
//     const { startDate, endDate, storeId } = req.query;

//     if (!startDate || !endDate) {
//       return res.status(400).json({
//         success: false,
//         message: 'Start date and end date are required'
//       });
//     }

//     const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;

//     const report = await ReportService.generateSalesReport(
//       storeFilter,
//       startDate,
//       endDate
//     );

//     res.json({
//       success: true,
//       data: report
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// exports.inventoryReport = async (req, res) => {
//   try {
//     const { storeId } = req.query;

//     const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;

//     const report = await ReportService.generateInventoryReport(storeFilter);

//     res.json({
//       success: true,
//       data: report
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// exports.financialReport = async (req, res) => {
//   try {
//     const { startDate, endDate, storeId } = req.query;

//     if (!startDate || !endDate) {
//       return res.status(400).json({
//         success: false,
//         message: 'Start date and end date are required'
//       });
//     }

//     const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;

//     const report = await ReportService.generateFinancialReport(
//       storeFilter,
//       startDate,
//       endDate
//     );

//     res.json({
//       success: true,
//       data: report
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// exports.storeComparison = async (req, res) => {
//   try {
//     const { storeIds, startDate, endDate } = req.query;

//     if (!storeIds || !startDate || !endDate) {
//       return res.status(400).json({
//         success: false,
//         message: 'Store IDs, start date and end date are required'
//       });
//     }

//     const ids = storeIds.split(',');
    
//     // Check if user has access to all stores
//     if (req.user.role !== 'SUPER_ADMIN') {
//       // Filter to only user's store
//       const filteredIds = ids.filter(id => id === req.user.storeId.toString());
//       if (filteredIds.length === 0) {
//         return res.status(403).json({
//           success: false,
//           message: 'Access denied to these stores'
//         });
//       }
//     }

//     const report = await ReportService.generateStoreComparisonReport(
//       ids,
//       startDate,
//       endDate
//     );

//     res.json({
//       success: true,
//       data: report
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// exports.userPerformance = async (req, res) => {
//   try {
//     const { startDate, endDate, storeId } = req.query;

//     if (!startDate || !endDate) {
//       return res.status(400).json({
//         success: false,
//         message: 'Start date and end date are required'
//       });
//     }

//     const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;

//     const report = await ReportService.generateUserPerformanceReport(
//       storeFilter,
//       startDate,
//       endDate
//     );

//     res.json({
//       success: true,
//       data: report
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// exports.productPerformance = async (req, res) => {
//   try {
//     const { startDate, endDate, storeId } = req.query;

//     if (!startDate || !endDate) {
//       return res.status(400).json({
//         success: false,
//         message: 'Start date and end date are required'
//       });
//     }

//     const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;

//     const report = await ReportService.generateProductPerformanceReport(
//       storeFilter,
//       startDate,
//       endDate
//     );

//     res.json({
//       success: true,
//       data: report
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };


























// ============================================================
// controllers/reportController.js - Report controller
// ============================================================

const ReportService = require('../services/reportService');

/**
 * Generate sales report
 */
exports.salesReport = async (req, res) => {
  try {
    const { startDate, endDate, storeId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;
    const report = await ReportService.generateSalesReport(storeFilter, startDate, endDate);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Generate inventory report
 */
exports.inventoryReport = async (req, res) => {
  try {
    const { storeId } = req.query;
    const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;
    const report = await ReportService.generateInventoryReport(storeFilter);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Generate financial report
 */
exports.financialReport = async (req, res) => {
  try {
    const { startDate, endDate, storeId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;
    const report = await ReportService.generateFinancialReport(storeFilter, startDate, endDate);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Generate user performance report
 */
exports.userPerformanceReport = async (req, res) => {
  try {
    const { startDate, endDate, storeId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;
    const report = await ReportService.generateUserPerformanceReport(storeFilter, startDate, endDate);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Generate product performance report
 */
exports.productPerformanceReport = async (req, res) => {
  try {
    const { startDate, endDate, storeId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;
    const report = await ReportService.generateProductPerformanceReport(storeFilter, startDate, endDate);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Generate store comparison report
 */
exports.storeComparisonReport = async (req, res) => {
  try {
    const { storeIds, startDate, endDate } = req.query;

    if (!storeIds || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Store IDs, start date and end date are required'
      });
    }

    const ids = storeIds.split(',');

    if (req.user.role !== 'SUPER_ADMIN') {
      const filteredIds = ids.filter(id => id === req.user.storeId.toString());
      if (filteredIds.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to these stores'
        });
      }
    }

    const report = await ReportService.generateStoreComparisonReport(ids, startDate, endDate);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};