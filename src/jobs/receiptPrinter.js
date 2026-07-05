const { Worker } = require('bullmq');
const redisConnection = require('../config/redis');
const ReceiptService = require('../services/receiptService');
const NotificationService = require('../services/notificationService');
const Transaction = require('../models/Transaction');
const Store = require('../models/Store');

const receiptWorker = new Worker('receipt-generation', async (job) => {
  const { transactionId, type, userId } = job.data;
  
  try {
    const transaction = await Transaction.findById(transactionId)
      .populate('salesAttendantId', 'firstName lastName')
      .populate('financeAttendantId', 'firstName lastName')
      .populate('warehouseStaffId', 'firstName lastName')
      .populate('items.productId');

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const store = await Store.findById(transaction.storeId);
    if (!store) {
      throw new Error('Store not found');
    }

    let buffer;
    let filename;

    switch (type) {
      case 'sales':
        buffer = await ReceiptService.generateSalesReceipt({
          ...transaction.toObject(),
          store: store.toObject(),
          attendant: transaction.salesAttendantId
        });
        filename = `sales_${transaction.transactionNumber}_${Date.now()}.pdf`;
        break;

      case 'payment':
        buffer = await ReceiptService.generatePaymentReceipt({
          ...transaction.toObject(),
          store: store.toObject(),
          cashier: transaction.financeAttendantId
        });
        filename = `payment_${transaction.transactionNumber}_${Date.now()}.pdf`;
        break;

      case 'invoice':
        buffer = await ReceiptService.generateInvoice({
          ...transaction.toObject(),
          store: store.toObject(),
          warehouseStaff: transaction.warehouseStaffId
        });
        filename = `invoice_${transaction.finalInvoiceNumber}_${Date.now()}.pdf`;
        break;

      default:
        throw new Error('Invalid receipt type');
    }

    // Save PDF
    const filepath = await ReceiptService.saveReceipt(buffer, filename);

    // Send notification
    await NotificationService.sendTransactionNotification(transaction, `${type}_receipt_generated`);

    return {
      success: true,
      filepath,
      filename,
      size: buffer.length,
      type
    };
  } catch (error) {
    console.error('Receipt generation failed:', error);
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 5,
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 1000 }
});

receiptWorker.on('completed', (job) => {
  console.log(`Receipt job ${job.id} completed successfully`);
});

receiptWorker.on('failed', (job, err) => {
  console.error(`Receipt job ${job.id} failed:`, err);
});

module.exports = receiptWorker;