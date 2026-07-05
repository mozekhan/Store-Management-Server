// const Transaction = require('../models/Transaction');
// const Product = require('../models/Product');
// const Inventory = require('../models/Inventory');
// const User = require('../models/User');
// const Payment = require('../models/Payment');
// const { AppError } = require('../middleware/errorHandler');

// class ReportService {
//   async generateSalesReport(storeId, startDate, endDate) {
//     const query = {
//       status: 'COMPLETED',
//       createdAt: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate)
//       }
//     };

//     if (storeId) query.storeId = storeId;

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
//           totalAmount: { $sum: '$totalAmount' },
//           averageAmount: { $avg: '$totalAmount' }
//         }
//       }
//     ]);

//     // Product performance
//     const productPerformance = await Transaction.aggregate([
//       { $match: query },
//       { $unwind: '$items' },
//       {
//         $group: {
//           _id: '$items.productId',
//           totalQuantity: { $sum: '$items.quantity' },
//           totalRevenue: { $sum: '$items.totalPrice' }
//         }
//       },
//       {
//         $lookup: {
//           from: 'products',
//           localField: '_id',
//           foreignField: '_id',
//           as: 'product'
//         }
//       },
//       { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
//       { $sort: { totalRevenue: -1 } },
//       { $limit: 10 }
//     ]);

//     // Staff performance
//     const staffPerformance = await Transaction.aggregate([
//       { $match: query },
//       {
//         $group: {
//           _id: '$salesAttendantId',
//           totalSales: { $sum: '$totalAmount' },
//           totalTransactions: { $sum: 1 },
//           averageOrderValue: { $avg: '$totalAmount' }
//         }
//       },
//       {
//         $lookup: {
//           from: 'users',
//           localField: '_id',
//           foreignField: '_id',
//           as: 'staff'
//         }
//       },
//       { $unwind: { path: '$staff', preserveNullAndEmptyArrays: true } },
//       { $sort: { totalSales: -1 } }
//     ]);

//     return {
//       summary: {
//         totalSales: sales.reduce((sum, s) => sum + s.totalSales, 0),
//         totalTransactions: sales.reduce((sum, s) => sum + s.totalTransactions, 0),
//         averageOrderValue: sales.length > 0 
//           ? sales.reduce((sum, s) => sum + s.averageOrderValue, 0) / sales.length 
//           : 0,
//         totalItems: sales.reduce((sum, s) => sum + s.totalItems, 0)
//       },
//       sales,
//       paymentBreakdown,
//       productPerformance,
//       staffPerformance
//     };
//   }

//   async generateInventoryReport(storeId) {
//     const query = {};
//     if (storeId) query.storeId = storeId;

//     const inventory = await Inventory.find(query)
//       .populate('productId')
//       .populate('storeId', 'name code');

//     const summary = {
//       totalProducts: inventory.length,
//       totalStock: inventory.reduce((sum, item) => sum + item.quantity, 0),
//       totalValue: inventory.reduce((sum, item) => {
//         return sum + (item.quantity * (item.productId?.unitPrice || 0));
//       }, 0),
//       lowStock: inventory.filter(item => item.quantity <= item.reorderPoint).length,
//       outOfStock: inventory.filter(item => item.quantity === 0).length
//     };

//     // Category breakdown
//     const categoryBreakdown = {};
//     inventory.forEach(item => {
//       const category = item.productId?.category || 'Uncategorized';
//       if (!categoryBreakdown[category]) {
//         categoryBreakdown[category] = {
//           count: 0,
//           totalValue: 0,
//           totalStock: 0
//         };
//       }
//       categoryBreakdown[category].count++;
//       categoryBreakdown[category].totalValue += item.quantity * (item.productId?.unitPrice || 0);
//       categoryBreakdown[category].totalStock += item.quantity;
//     });

//     return {
//       summary,
//       categoryBreakdown,
//       inventory: inventory.map(item => ({
//         product: item.productId,
//         quantity: item.quantity,
//         reservedQuantity: item.reservedQuantity,
//         reorderPoint: item.reorderPoint,
//         value: item.quantity * (item.productId?.unitPrice || 0),
//         status: item.quantity === 0 ? 'OUT_OF_STOCK' :
//                 item.quantity <= item.reorderPoint ? 'LOW_STOCK' : 'IN_STOCK'
//       }))
//     };
//   }

//   async generateFinancialReport(storeId, startDate, endDate) {
//     const query = {
//       createdAt: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate)
//       }
//     };

//     if (storeId) query.storeId = storeId;

//     const financials = await Transaction.aggregate([
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

//     // Daily breakdown
//     const dailyBreakdown = await Transaction.aggregate([
//       { $match: query },
//       {
//         $group: {
//           _id: {
//             year: { $year: '$createdAt' },
//             month: { $month: '$createdAt' },
//             day: { $dayOfMonth: '$createdAt' }
//           },
//           revenue: { $sum: '$totalAmount' },
//           transactions: { $sum: 1 }
//         }
//       },
//       { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
//     ]);

//     // Payment method financials
//     const paymentFinancials = await Payment.aggregate([
//       { 
//         $match: { 
//           ...query,
//           status: 'COMPLETED'
//         } 
//       },
//       {
//         $group: {
//           _id: '$method',
//           totalAmount: { $sum: '$amount' },
//           count: { $sum: 1 },
//           averageAmount: { $avg: '$amount' }
//         }
//       }
//     ]);

//     // Refunds
//     const refunds = await Payment.aggregate([
//       { 
//         $match: { 
//           ...query,
//           status: 'REFUNDED'
//         } 
//       },
//       {
//         $group: {
//           _id: null,
//           totalRefunded: { $sum: '$amount' },
//           count: { $sum: 1 }
//         }
//       }
//     ]);

//     return {
//       summary: financials[0] || {
//         totalRevenue: 0,
//         totalTax: 0,
//         totalSubtotal: 0,
//         transactionCount: 0,
//         averageOrderValue: 0
//       },
//       dailyBreakdown,
//       paymentFinancials,
//       refunds: refunds[0] || { totalRefunded: 0, count: 0 }
//     };
//   }

//   async generateStoreComparisonReport(storeIds, startDate, endDate) {
//     const reports = await Promise.all(
//       storeIds.map(async (storeId) => {
//         const salesReport = await this.generateSalesReport(storeId, startDate, endDate);
//         const financialReport = await this.generateFinancialReport(storeId, startDate, endDate);
//         const inventoryReport = await this.generateInventoryReport(storeId);
        
//         return {
//           storeId,
//           sales: salesReport.summary,
//           financial: financialReport.summary,
//           inventory: inventoryReport.summary
//         };
//       })
//     );

//     return reports;
//   }

//   async generateUserPerformanceReport(storeId, startDate, endDate) {
//     const query = {
//       status: 'COMPLETED',
//       createdAt: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate)
//       }
//     };

//     if (storeId) query.storeId = storeId;

//     const performance = await Transaction.aggregate([
//       { $match: query },
//       {
//         $group: {
//           _id: '$salesAttendantId',
//           totalSales: { $sum: '$totalAmount' },
//           transactionCount: { $sum: 1 },
//           averageOrderValue: { $avg: '$totalAmount' },
//           totalItems: { $sum: { $size: '$items' } }
//         }
//       },
//       {
//         $lookup: {
//           from: 'users',
//           localField: '_id',
//           foreignField: '_id',
//           as: 'user'
//         }
//       },
//       { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
//       { $sort: { totalSales: -1 } }
//     ]);

//     return performance;
//   }

//   async generateProductPerformanceReport(storeId, startDate, endDate) {
//     const query = {
//       status: 'COMPLETED',
//       createdAt: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate)
//       }
//     };

//     if (storeId) query.storeId = storeId;

//     const performance = await Transaction.aggregate([
//       { $match: query },
//       { $unwind: '$items' },
//       {
//         $group: {
//           _id: '$items.productId',
//           totalQuantity: { $sum: '$items.quantity' },
//           totalRevenue: { $sum: '$items.totalPrice' },
//           averagePrice: { $avg: '$items.unitPrice' },
//           transactionCount: { $sum: 1 }
//         }
//       },
//       {
//         $lookup: {
//           from: 'products',
//           localField: '_id',
//           foreignField: '_id',
//           as: 'product'
//         }
//       },
//       { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
//       { $sort: { totalRevenue: -1 } }
//     ]);

//     // Get current inventory for these products
//     const productIds = performance.map(p => p._id).filter(id => id);
//     const inventory = await Inventory.find({
//       productId: { $in: productIds },
//       storeId
//     });

//     const productsWithInventory = performance.map(p => {
//       const inv = inventory.find(i => i.productId.toString() === p._id.toString());
//       return {
//         ...p,
//         inventory: inv ? {
//           quantity: inv.quantity,
//           reorderPoint: inv.reorderPoint
//         } : null
//       };
//     });

//     return productsWithInventory;
//   }
// }

// module.exports = new ReportService();























// ============================================================
// services/reportService.js - Unified report service
// ============================================================

const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Payment = require('../models/Payment');
const BaseService = require('./baseService');
const { AppError } = require('../middleware/errorHandler');

class ReportService extends BaseService {
  /**
   * Generate sales report
   */
  async generateSalesReport(storeId, startDate, endDate) {
    const query = {
      status: 'COMPLETED',
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    if (storeId) query.storeId = storeId;

    const [sales, paymentBreakdown, productPerformance, staffPerformance] = await Promise.all([
      this._getSalesAggregation(query),
      this._getPaymentBreakdown(query),
      this._getProductPerformance(query),
      this._getStaffPerformance(query)
    ]);

    return {
      summary: {
        totalSales: sales.reduce((sum, s) => sum + s.totalSales, 0),
        totalTransactions: sales.reduce((sum, s) => sum + s.totalTransactions, 0),
        averageOrderValue: sales.length > 0
          ? sales.reduce((sum, s) => sum + s.averageOrderValue, 0) / sales.length
          : 0,
        totalItems: sales.reduce((sum, s) => sum + s.totalItems, 0)
      },
      sales,
      paymentBreakdown,
      productPerformance,
      staffPerformance
    };
  }

  /**
   * Generate inventory report
   */
  async generateInventoryReport(storeId) {
    const query = {};
    if (storeId) query.storeId = storeId;

    const inventory = await Inventory.find(query)
      .populate('productId')
      .populate('storeId', 'name code');

    const summary = {
      totalProducts: inventory.length,
      totalStock: inventory.reduce((sum, item) => sum + item.quantity, 0),
      totalValue: inventory.reduce((sum, item) => {
        return sum + (item.quantity * (item.productId?.unitPrice || 0));
      }, 0),
      lowStock: inventory.filter(item => item.quantity <= item.reorderPoint).length,
      outOfStock: inventory.filter(item => item.quantity === 0).length
    };

    const categoryBreakdown = this._getCategoryBreakdown(inventory);

    return {
      summary,
      categoryBreakdown,
      inventory: inventory.map(item => ({
        product: item.productId,
        quantity: item.quantity,
        reservedQuantity: item.reservedQuantity,
        reorderPoint: item.reorderPoint,
        value: item.quantity * (item.productId?.unitPrice || 0),
        status: item.quantity === 0 ? 'OUT_OF_STOCK' :
                item.quantity <= item.reorderPoint ? 'LOW_STOCK' : 'IN_STOCK'
      }))
    };
  }

  /**
   * Generate financial report
   */
  async generateFinancialReport(storeId, startDate, endDate) {
    const query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    if (storeId) query.storeId = storeId;

    const [financials, dailyBreakdown, paymentFinancials, refunds] = await Promise.all([
      this._getFinancialSummary(query),
      this._getDailyBreakdown(query),
      this._getPaymentFinancials(query),
      this._getRefunds(query)
    ]);

    return {
      summary: financials[0] || {
        totalRevenue: 0,
        totalTax: 0,
        totalSubtotal: 0,
        transactionCount: 0,
        averageOrderValue: 0
      },
      dailyBreakdown,
      paymentFinancials,
      refunds: refunds[0] || { totalRefunded: 0, count: 0 }
    };
  }

  /**
   * Generate store comparison report
   */
  async generateStoreComparisonReport(storeIds, startDate, endDate) {
    return await Promise.all(
      storeIds.map(async (storeId) => {
        const [salesReport, financialReport, inventoryReport] = await Promise.all([
          this.generateSalesReport(storeId, startDate, endDate),
          this.generateFinancialReport(storeId, startDate, endDate),
          this.generateInventoryReport(storeId)
        ]);

        return {
          storeId,
          sales: salesReport.summary,
          financial: financialReport.summary,
          inventory: inventoryReport.summary
        };
      })
    );
  }

  /**
   * Generate user performance report
   */
  async generateUserPerformanceReport(storeId, startDate, endDate) {
    const query = {
      status: 'COMPLETED',
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    if (storeId) query.storeId = storeId;

    return await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$salesAttendantId',
          totalSales: { $sum: '$totalAmount' },
          transactionCount: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' },
          totalItems: { $sum: { $size: '$items' } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $sort: { totalSales: -1 } }
    ]);
  }

  /**
   * Generate product performance report
   */
  async generateProductPerformanceReport(storeId, startDate, endDate) {
    const query = {
      status: 'COMPLETED',
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    if (storeId) query.storeId = storeId;

    const performance = await Transaction.aggregate([
      { $match: query },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
          averagePrice: { $avg: '$items.unitPrice' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Get inventory for products
    const productIds = performance.map(p => p._id).filter(id => id);
    const inventory = await Inventory.find({
      productId: { $in: productIds },
      storeId
    });

    return performance.map(p => {
      const inv = inventory.find(i => i.productId.toString() === p._id.toString());
      return {
        ...p,
        inventory: inv ? { quantity: inv.quantity, reorderPoint: inv.reorderPoint } : null
      };
    });
  }

  // Private helper methods
  _getSalesAggregation(query) {
    return Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: '$createdAt' },
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          totalSales: { $sum: '$totalAmount' },
          totalTransactions: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' },
          totalItems: { $sum: { $size: '$items' } }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
    ]);
  }

  _getPaymentBreakdown(query) {
    return Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          averageAmount: { $avg: '$totalAmount' }
        }
      }
    ]);
  }

  _getProductPerformance(query) {
    return Transaction.aggregate([
      { $match: query },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);
  }

  _getStaffPerformance(query) {
    return Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$salesAttendantId',
          totalSales: { $sum: '$totalAmount' },
          totalTransactions: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'staff'
        }
      },
      { $unwind: { path: '$staff', preserveNullAndEmptyArrays: true } },
      { $sort: { totalSales: -1 } }
    ]);
  }

  _getFinancialSummary(query) {
    return Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalTax: { $sum: '$taxTotal' },
          totalSubtotal: { $sum: '$subtotal' },
          transactionCount: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);
  }

  _getDailyBreakdown(query) {
    return Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
  }

  _getPaymentFinancials(query) {
    return Payment.aggregate([
      { $match: { ...query, status: 'COMPLETED' } },
      {
        $group: {
          _id: '$method',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          averageAmount: { $avg: '$amount' }
        }
      }
    ]);
  }

  _getRefunds(query) {
    return Payment.aggregate([
      { $match: { ...query, status: 'REFUNDED' } },
      {
        $group: {
          _id: null,
          totalRefunded: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
  }

  _getCategoryBreakdown(inventory) {
    const breakdown = {};
    inventory.forEach(item => {
      const category = item.productId?.category || 'Uncategorized';
      if (!breakdown[category]) {
        breakdown[category] = { count: 0, totalValue: 0, totalStock: 0 };
      }
      breakdown[category].count++;
      breakdown[category].totalValue += item.quantity * (item.productId?.unitPrice || 0);
      breakdown[category].totalStock += item.quantity;
    });
    return breakdown;
  }
}

module.exports = new ReportService();