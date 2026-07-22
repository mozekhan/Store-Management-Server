// const Payment = require('../models/Payment');
// const Transaction = require('../models/Transaction');
// const AuditLog = require('../models/AuditLog');
// const { AppError } = require('../middleware/errorHandler');

// class PaymentService {
//   async processPayment(transactionId, userId, paymentData) {
//     const { method, amountPaid, reference, details } = paymentData;

//     const transaction = await Transaction.findById(transactionId);
//     if (!transaction) {
//       throw new AppError('Transaction not found', 404);
//     }

//     if (transaction.status !== 'SALES_QR') {
//       throw new AppError('Transaction not ready for payment', 400);
//     }

//     const totalAmount = transaction.totalAmount;
//     const change = amountPaid - totalAmount;

//     if (change < 0) {
//       throw new AppError('Insufficient payment amount', 400);
//     }

//     // Create payment record
//     const count = await Payment.countDocuments({ storeId: transaction.storeId });
//     const paymentNumber = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

//     const payment = new Payment({
//       transactionId: transaction._id,
//       storeId: transaction.storeId,
//       paymentNumber,
//       amount: totalAmount,
//       amountPaid,
//       change,
//       method,
//       status: 'COMPLETED',
//       reference: reference || `PAY-${Date.now()}`,
//       processedBy: userId,
//       processedAt: new Date()
//     });

//     // Add payment-specific details
//     if (method === 'CARD') {
//       payment.cardDetails = details?.cardDetails || {};
//     } else if (method === 'TRANSFER') {
//       payment.transferDetails = details?.transferDetails || {};
//     } else if (method === 'MOBILE_MONEY') {
//       payment.mobileMoneyDetails = details?.mobileMoneyDetails || {};
//     }

//     await payment.save();

//     // Update transaction
//     transaction.paymentMethod = method;
//     transaction.paymentAmount = totalAmount;
//     transaction.amountPaid = amountPaid;
//     transaction.changeAmount = change;
//     transaction.paymentTimestamp = new Date();
//     transaction.financeAttendantId = userId;
//     transaction.paymentStatus = 'PAID';
//     transaction.status = 'PAID';
//     await transaction.save();

//     // Log audit
//     await AuditLog.create({
//       actorId: userId,
//       actorRole: 'FINANCE_CASHIER',
//       action: 'UPDATE',
//       resourceType: 'Transaction',
//       resourceId: transaction._id,
//       storeId: transaction.storeId,
//       details: {
//         after: {
//           paymentStatus: 'PAID',
//           paymentMethod: method,
//           paymentAmount: totalAmount
//         },
//         metadata: {
//           ipAddress: req?.ip,
//           userAgent: req?.headers?.['user-agent']
//         }
//       }
//     });

//     return {
//       payment,
//       transaction,
//       change
//     };
//   }

//   async refundPayment(paymentId, userId, reason) {
//     const payment = await Payment.findById(paymentId);
//     if (!payment) {
//       throw new AppError('Payment not found', 404);
//     }

//     if (payment.status !== 'COMPLETED') {
//       throw new AppError('Only completed payments can be refunded', 400);
//     }

//     payment.status = 'REFUNDED';
//     payment.refundedBy = userId;
//     payment.refundedAt = new Date();
//     payment.refundReason = reason;
//     await payment.save();

//     // Update transaction
//     const transaction = await Transaction.findById(payment.transactionId);
//     if (transaction) {
//       transaction.paymentStatus = 'REFUNDED';
//       transaction.status = 'REFUNDED';
//       await transaction.save();
//     }

//     // Log audit
//     await AuditLog.create({
//       actorId: userId,
//       action: 'UPDATE',
//       resourceType: 'Payment',
//       resourceId: payment._id,
//       storeId: payment.storeId,
//       details: {
//         after: { status: 'REFUNDED' },
//         metadata: {
//           reason,
//           refundedBy: userId
//         }
//       },
//       severity: 'WARNING'
//     });

//     return payment;
//   }

//   async getPaymentByTransaction(transactionId) {
//     return await Payment.find({ transactionId })
//       .populate('processedBy', 'firstName lastName')
//       .sort({ processedAt: -1 });
//   }

//   async getPaymentStats(storeId, startDate, endDate) {
//     const query = { storeId };
//     if (startDate || endDate) {
//       query.processedAt = {};
//       if (startDate) query.processedAt.$gte = new Date(startDate);
//       if (endDate) query.processedAt.$lte = new Date(endDate);
//     }

//     const stats = await Payment.aggregate([
//       { $match: query },
//       {
//         $group: {
//           _id: '$method',
//           totalAmount: { $sum: '$amount' },
//           count: { $sum: 1 },
//           averageAmount: { $avg: '$amount' }
//         }
//       }
//     ]);

//     const totals = await Payment.aggregate([
//       { $match: query },
//       {
//         $group: {
//           _id: null,
//           totalAmount: { $sum: '$amount' },
//           totalCount: { $sum: 1 }
//         }
//       }
//     ]);

//     return {
//       byMethod: stats,
//       totals: totals[0] || { totalAmount: 0, totalCount: 0 }
//     };
//   }
// }

// module.exports = new PaymentService();

// ============================================================
// services/paymentService.js - Unified payment service
// ============================================================
const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const Transaction = require("../models/Transaction");
const BaseService = require("./baseService");
const { AppError } = require("../middleware/errorHandler");


class PaymentService extends BaseService {
  /**
   * Get paginated payments
   */
  async getPayments(filters = {}) {
    const {
      page = 1,
      limit = 20,
      storeId,
      status,
      search,
      startDate,
      endDate,
    } = filters;

    const query = {};

    if (storeId) {
      query.storeId = storeId;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.processedAt = {};

      if (startDate) {
        query.processedAt.$gte = new Date(startDate);
      }

      if (endDate) {
        query.processedAt.$lte = new Date(endDate);
      }
    }

    if (search) {
      query.$or = [
        { paymentNumber: { $regex: search, $options: "i" } },
        { reference: { $regex: search, $options: "i" } },
        { method: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate("processedBy", "firstName lastName")
        .populate("transactionId", "transactionNumber")
        .sort({ processedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),

      Payment.countDocuments(query),
    ]);

    return {
      payments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Process payment for a transaction
   */
  async processPayment(transactionId, userId, paymentData, ip, userAgent) {
    const { method, amountPaid, reference, details } = paymentData;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    if (transaction.status !== "SALES_QR") {
      throw new AppError("Transaction not ready for payment", 400);
    }

    const totalAmount = transaction.totalAmount;
    const change = amountPaid - totalAmount;

    if (change < 0) {
      throw new AppError("Insufficient payment amount", 400);
    }

    const count = await Payment.countDocuments({
      storeId: transaction.storeId,
    });
    const paymentNumber = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;

    const payment = new Payment({
      transactionId: transaction._id,
      storeId: transaction.storeId,
      paymentNumber,
      amount: totalAmount,
      amountPaid,
      change,
      method,
      status: "COMPLETED",
      reference: reference || `PAY-${Date.now()}`,
      processedBy: userId,
      processedAt: new Date(),
    });

    // Add payment-specific details
    if (method === "CARD") {
      payment.cardDetails = details?.cardDetails || {};
    } else if (method === "TRANSFER") {
      payment.transferDetails = details?.transferDetails || {};
    } else if (method === "MOBILE_MONEY") {
      payment.mobileMoneyDetails = details?.mobileMoneyDetails || {};
    }

    await payment.save();

    // Update transaction
    transaction.paymentMethod = method;
    transaction.paymentAmount = totalAmount;
    transaction.amountPaid = amountPaid;
    transaction.changeAmount = change;
    transaction.paymentTimestamp = new Date();
    transaction.financeAttendantId = userId;
    transaction.paymentStatus = "PAID";
    transaction.status = "PAID";
    await transaction.save();

    await this.auditLog(
      userId,
      "FINANCE_CASHIER",
      "UPDATE",
      "Transaction",
      transaction._id,
      transaction.storeId,
      {
        after: {
          paymentStatus: "PAID",
          paymentMethod: method,
          paymentAmount: totalAmount,
        },
        metadata: { ipAddress: ip, userAgent },
      },
    );

    return { payment, transaction, change };
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId, userId, reason, ip, userAgent) {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    if (payment.status !== "COMPLETED") {
      throw new AppError("Only completed payments can be refunded", 400);
    }

    payment.status = "REFUNDED";
    payment.refundedBy = userId;
    payment.refundedAt = new Date();
    payment.refundReason = reason;
    await payment.save();

    const transaction = await Transaction.findById(payment.transactionId);
    if (transaction) {
      transaction.paymentStatus = "REFUNDED";
      transaction.status = "REFUNDED";
      await transaction.save();
    }

    await this.auditLog(
      userId,
      null,
      "UPDATE",
      "Payment",
      payment._id,
      payment.storeId,
      {
        after: { status: "REFUNDED" },
        metadata: { ipAddress: ip, userAgent, reason, refundedBy: userId },
      },
      "WARNING",
    );

    return payment;
  }

  /**
   * Get payments by transaction
   */
  async getPaymentsByTransaction(transactionId) {
    return await Payment.find({ transactionId })
      .populate("processedBy", "firstName lastName")
      .sort({ processedAt: -1 });
  }

// async function getPaymentStats(storeId, startDate, endDate) {
  async getPaymentStats(storeId, startDate, endDate) {
  try {
    if (!storeId) {
      throw new Error("storeId is required");
    }

    // Ensure ObjectId
    const objectStoreId =
      storeId instanceof mongoose.Types.ObjectId
        ? storeId
        : new mongoose.Types.ObjectId(storeId);

    // Build completed payments query
    const matchQuery = {
      storeId: objectStoreId,
      status: "COMPLETED",
    };

    if (startDate || endDate) {
      matchQuery.processedAt = {};

      if (startDate) {
        matchQuery.processedAt.$gte = new Date(startDate);
      }

      if (endDate) {
        matchQuery.processedAt.$lte = new Date(endDate);
      }
    }


    // Debug
    const payments = await Payment.find(matchQuery).lean();

    console.log(`Payments Found: ${payments.length}`);

    if (payments.length) {
      console.log("First Payment:", payments[0]);
    }

    const [byMethod, totals, refunds] = await Promise.all([
      Payment.aggregate([
        {
          $match: matchQuery,
        },
        {
          $group: {
            _id: "$method",
            totalAmount: {
              $sum: "$amount",
            },
            totalCount: {
              $sum: 1,
            },
            averageAmount: {
              $avg: "$amount",
            },
            minAmount: {
              $min: "$amount",
            },
            maxAmount: {
              $max: "$amount",
            },
          },
        },
        {
          $sort: {
            totalAmount: -1,
          },
        },
      ]),

      Payment.aggregate([
        {
          $match: matchQuery,
        },
        {
          $group: {
            _id: null,
            totalAmount: {
              $sum: "$amount",
            },
            totalCount: {
              $sum: 1,
            },
            averageAmount: {
              $avg: "$amount",
            },
          },
        },
      ]),

      Payment.aggregate([
        {
          $match: {
            storeId: objectStoreId,
            status: "REFUNDED",
          },
        },
        {
          $group: {
            _id: null,
            totalRefunded: {
              $sum: "$amount",
            },
            refundCount: {
              $sum: 1,
            },
          },
        },
      ]),
    ]);


    const totalsData = totals[0] || {
      totalAmount: 0,
      totalCount: 0,
      averageAmount: 0,
    };

    const refundData = refunds[0] || {
      totalRefunded: 0,
      refundCount: 0,
    };

    return {
      byMethod,

      totals: {
        totalAmount: totalsData.totalAmount,
        totalCount: totalsData.totalCount,
        averageAmount: totalsData.averageAmount,
      },

      refunds: {
        totalRefunded: refundData.totalRefunded,
        refundCount: refundData.refundCount,
      },

      summary: {
        totalRevenue: totalsData.totalAmount,
        totalTransactions: totalsData.totalCount,
        averageTransactionValue: totalsData.averageAmount,
        totalRefunded: refundData.totalRefunded,
        refundCount: refundData.refundCount,
      },
    };
  } catch (error) {
    console.error("Error getting payment stats:", error);

    return {
      byMethod: [],
      totals: {
        totalAmount: 0,
        totalCount: 0,
        averageAmount: 0,
      },
      refunds: {
        totalRefunded: 0,
        refundCount: 0,
      },
      summary: {
        totalRevenue: 0,
        totalTransactions: 0,
        averageTransactionValue: 0,
        totalRefunded: 0,
        refundCount: 0,
      },
    };
  }
}

}

module.exports = new PaymentService();
