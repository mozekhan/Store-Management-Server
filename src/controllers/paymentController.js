const PaymentService = require("../services/paymentService");

/**
 * Get payment list
 */
exports.getPayments = async (req, res) => {
  try {
    const { page, limit, status, search, startDate, endDate, storeId } =
      req.query;

    const targetStoreId =
      req.user.role === "SUPER_ADMIN" ? storeId : req.user.storeId;

    const result = await PaymentService.getPayments({
      page,
      limit,
      status,
      search,
      startDate,
      endDate,
      storeId: targetStoreId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Process payment
 */
exports.processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, amountPaid, reference, details } = req.body;

    if (!paymentMethod || !amountPaid) {
      return res.status(400).json({
        success: false,
        message: "Payment method and amount paid are required",
      });
    }

    if (amountPaid <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount paid must be greater than 0",
      });
    }

    const result = await PaymentService.processPayment(
      id,
      req.user._id,
      {
        method: paymentMethod,
        amountPaid,
        reference,
        details,
      },
      req.ip,
      req.headers["user-agent"],
    );

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.to(`store-${result.transaction.storeId}`).emit("transaction-paid", {
        transactionId: result.transaction._id,
        paymentId: result.payment._id,
      });
    }

    res.json({
      success: true,
      data: result,
      message: "Payment processed successfully",
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Refund payment
 */
exports.refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Refund reason is required",
      });
    }

    const payment = await PaymentService.refundPayment(
      paymentId,
      req.user._id,
      reason,
      req.ip,
      req.headers["user-agent"],
    );

    res.json({
      success: true,
      data: payment,
      message: "Payment refunded successfully",
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get payments by transaction
 */
exports.getPaymentsByTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const payments =
      await PaymentService.getPaymentsByTransaction(transactionId);

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get payment statistics
 */
exports.getPaymentStats = async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.query;
    const targetStoreId =
      req.user.role === "SUPER_ADMIN" ? storeId : req.user.storeId;

    if (!targetStoreId) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required",
      });
    }

    const stats = await PaymentService.getPaymentStats(
      targetStoreId,
      startDate,
      endDate,
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
