const { Worker } = require('bullmq');
const redisConnection = require('../config/redis');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const NotificationService = require('../services/notificationService');

const stockWorker = new Worker('stock-alerts', async (job) => {
  const { storeId } = job.data;
  
  try {
    const query = { $expr: { $lte: ['$quantity', '$reorderPoint'] } };
    if (storeId) {
      query.storeId = storeId;
    }

    const lowStockItems = await Inventory.find(query)
      .populate('productId')
      .populate('storeId');

    const alerts = [];
    
    for (const item of lowStockItems) {
      if (item.productId && item.storeId) {
        await NotificationService.sendLowStockNotification(
          item.productId,
          item
        );
        
        alerts.push({
          productId: item.productId._id,
          productName: item.productId.name,
          sku: item.productId.sku,
          storeId: item.storeId._id,
          storeName: item.storeId.name,
          currentStock: item.quantity,
          reorderPoint: item.reorderPoint
        });
      }
    }

    // Send consolidated report to warehouse managers
    if (alerts.length > 0) {
      // Group by store
      const groupedAlerts = alerts.reduce((acc, alert) => {
        const key = alert.storeId.toString();
        if (!acc[key]) {
          acc[key] = {
            storeName: alert.storeName,
            items: []
          };
        }
        acc[key].items.push(alert);
        return acc;
      }, {});

      // Send notifications for each store
      for (const [storeId, data] of Object.entries(groupedAlerts)) {
        // Implementation would depend on notification system
        console.log(`Low stock alert for ${data.storeName}: ${data.items.length} items`);
      }
    }

    return {
      storeId: storeId || 'all',
      alerts,
      totalAlerts: alerts.length,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Stock alert check failed:', error);
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 3,
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 }
});

stockWorker.on('completed', (job) => {
  console.log(`Stock alert job ${job.id} completed successfully`);
});

stockWorker.on('failed', (job, err) => {
  console.error(`Stock alert job ${job.id} failed:`, err);
});

module.exports = stockWorker;