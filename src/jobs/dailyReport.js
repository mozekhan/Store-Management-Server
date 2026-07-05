const { Worker } = require('bullmq');
const redisConnection = require('../config/redis');
const Transaction = require('../models/Transaction');
const Store = require('../models/Store');
const NotificationService = require('../services/notificationService');
const ExportUtils = require('../utils/export');

const reportWorker = new Worker('daily-reports', async (job) => {
  const { storeId, date } = job.data;
  
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'COMPLETED'
    };

    if (storeId) {
      query.storeId = storeId;
    }

    // Get all transactions
    const transactions = await Transaction.find(query)
      .populate('salesAttendantId', 'firstName lastName')
      .populate('financeAttendantId', 'firstName lastName')
      .populate('items.productId');

    // Calculate aggregates
    const totals = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$storeId',
          totalSales: { $sum: '$totalAmount' },
          totalTransactions: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' },
          totalItems: { $sum: { $size: '$items' } },
          paymentMethods: {
            $push: {
              method: '$paymentMethod',
              amount: '$paymentAmount'
            }
          }
        }
      },
      {
        $project: {
          storeId: '$_id',
          totalSales: 1,
          totalTransactions: 1,
          averageOrderValue: 1,
          totalItems: 1,
          paymentMethods: 1,
          _id: 0
        }
      }
    ]);

    // Generate report
    const report = {
      date,
      storeId: storeId || 'all',
      transactions,
      totals: totals[0] || {
        totalSales: 0,
        totalTransactions: 0,
        averageOrderValue: 0,
        totalItems: 0,
        paymentMethods: []
      },
      generatedAt: new Date()
    };

    // Send notifications
    if (storeId) {
      await NotificationService.sendDailyReportNotification(storeId, report);
    } else {
      // Send to all stores
      const stores = await Store.find({ isActive: true });
      for (const store of stores) {
        await NotificationService.sendDailyReportNotification(store._id, report);
      }
    }

    // Generate and save report file
    const columns = [
      { header: 'Transaction #', key: 'transactionNumber' },
      { header: 'Amount', key: 'totalAmount' },
      { header: 'Payment Method', key: 'paymentMethod' },
      { header: 'Items', key: 'itemCount' },
      { header: 'Status', key: 'status' }
    ];

    const reportData = transactions.map(t => ({
      ...t.toObject(),
      itemCount: t.items.length
    }));

    const csvData = await ExportUtils.exportToCSV(reportData, columns);
    const filename = `daily_report_${date}_${storeId || 'all'}.csv`;
    
    // Save report (implementation would depend on storage system)
    // await saveReport(csvData, filename);

    return report;
  } catch (error) {
    console.error('Daily report generation failed:', error);
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 2,
  removeOnComplete: { count: 50 },
  removeOnFail: { count: 500 }
});

reportWorker.on('completed', (job) => {
  console.log(`Report job ${job.id} completed successfully`);
});

reportWorker.on('failed', (job, err) => {
  console.error(`Report job ${job.id} failed:`, err);
});

module.exports = reportWorker;