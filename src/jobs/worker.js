const { Worker } = require('bullmq');
const redisConnection = require('../config/redis');
const ReceiptService = require('../services/receiptService');
const NotificationService = require('../services/notificationService');

// Receipt generation worker
const receiptWorker = new Worker('receipt-generation', async (job) => {
  const { transaction, store, type } = job.data;
  
  try {
    let buffer;
    let filename;
    
    switch (type) {
      case 'sales':
        buffer = await ReceiptService.generateSalesReceipt(transaction, store);
        filename = `sales_${transaction.transactionNumber}_${Date.now()}.pdf`;
        break;
      case 'payment':
        buffer = await ReceiptService.generatePaymentReceipt(transaction, store);
        filename = `payment_${transaction.transactionNumber}_${Date.now()}.pdf`;
        break;
      case 'invoice':
        buffer = await ReceiptService.generateInvoice(transaction, store);
        filename = `invoice_${transaction.finalInvoiceNumber}_${Date.now()}.pdf`;
        break;
      default:
        throw new Error('Invalid receipt type');
    }

    const filepath = await ReceiptService.saveReceipt(buffer, filename);
    
    return {
      success: true,
      filepath,
      filename,
      size: buffer.length
    };
  } catch (error) {
    console.error('Receipt generation failed:', error);
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 5,
});

// Daily report worker
const reportWorker = new Worker('daily-reports', async (job) => {
  const { storeId, date } = job.data;
  
  try {
    const Transaction = require('../models/Transaction');
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      storeId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'COMPLETED'
    };

    const [transactions, totals] = await Promise.all([
      Transaction.find(query).populate('items.productId'),
      Transaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$totalAmount' },
            totalTransactions: { $sum: 1 },
            averageOrderValue: { $avg: '$totalAmount' },
            totalItems: { $sum: { $size: '$items' } }
          }
        }
      ])
    ]);

    const report = {
      date,
      storeId,
      transactions,
      totals: totals[0] || {
        totalSales: 0,
        totalTransactions: 0,
        averageOrderValue: 0,
        totalItems: 0
      },
      generatedAt: new Date()
    };

    // Send notification
    await NotificationService.sendDailyReportNotification(storeId, report);

    return report;
  } catch (error) {
    console.error('Daily report generation failed:', error);
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 2,
});

// Stock alert worker
const stockWorker = new Worker('stock-alerts', async (job) => {
  const { storeId } = job.data;
  
  try {
    const Inventory = require('../models/Inventory');
    const Product = require('../models/Product');
    const NotificationService = require('../services/notificationService');

    const lowStockItems = await Inventory.find({
      storeId,
      $expr: { $lte: ['$quantity', '$reorderPoint'] }
    }).populate('productId');

    for (const item of lowStockItems) {
      await NotificationService.sendLowStockNotification(item.productId, item);
    }

    return {
      storeId,
      lowStockCount: lowStockItems.length,
      items: lowStockItems.map(item => ({
        productId: item.productId._id,
        name: item.productId.name,
        sku: item.productId.sku,
        currentStock: item.quantity,
        reorderPoint: item.reorderPoint
      }))
    };
  } catch (error) {
    console.error('Stock alert check failed:', error);
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 3,
});

// Audit cleanup worker
const auditCleanupWorker = new Worker('audit-cleanup', async (job) => {
  const { retentionDays = 730 } = job.data; // Default 2 years
  
  try {
    const AuditLog = require('../models/AuditLog');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const oldLogs = await AuditLog.find({
      timestamp: { $lt: cutoffDate }
    });

    // Archive old logs (in production, you'd move these to cold storage)
    const archived = await AuditLog.aggregate([
      { $match: { timestamp: { $lt: cutoffDate } } },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]);

    // Delete old logs
    await AuditLog.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    return {
      archivedCount: archived[0]?.count || 0,
      retentionDays,
      cutoffDate
    };
  } catch (error) {
    console.error('Audit cleanup failed:', error);
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 1,
});

module.exports = {
  receiptWorker,
  reportWorker,
  stockWorker,
  auditCleanupWorker
};