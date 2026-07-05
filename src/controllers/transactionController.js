// const TransactionService = require('../services/transactionService');

// /**
//  * Create transaction
//  */
// exports.createTransaction = async (req, res) => {
//   try {
//     const transaction = await TransactionService.createTransaction(
//       req.user._id,
//       req.user.storeId,
//       req.ip,
//       req.headers['user-agent']
//     );

//     res.status(201).json({
//       success: true,
//       data: transaction
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Add item to transaction
//  */
// exports.addItem = async (req, res) => {
//   try {
//     const { productId, quantity } = req.body;
//     const transaction = await TransactionService.addItem(
//       req.params.id,
//       req.user._id,
//       productId,
//       quantity,
//       req.ip,
//       req.headers['user-agent']
//     );

//     res.json({
//       success: true,
//       data: transaction
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Generate sales QR
//  */
// exports.generateSalesQR = async (req, res) => {
//   try {
//     const result = await TransactionService.generateSalesQR(
//       req.params.id,
//       req.user._id,
//       req.ip,
//       req.headers['user-agent']
//     );

//     res.json({
//       success: true,
//       data: result
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Process payment
//  */
// exports.processPayment = async (req, res) => {
//   try {
//     const { paymentMethod, amountPaid } = req.body;
//     const result = await TransactionService.processPayment(
//       req.params.id,
//       req.user._id,
//       paymentMethod,
//       amountPaid,
//       req.ip,
//       req.headers['user-agent']
//     );

//     res.json({
//       success: true,
//       data: result
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Release stock
//  */
// exports.releaseStock = async (req, res) => {
//   try {
//     const { releasedItems } = req.body;
//     const transaction = await TransactionService.releaseStock(
//       req.params.id,
//       req.user._id,
//       releasedItems,
//       req.ip,
//       req.headers['user-agent']
//     );

//     res.json({
//       success: true,
//       data: transaction
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Complete transaction
//  */
// exports.completeTransaction = async (req, res) => {
//   try {
//     const transaction = await TransactionService.completeTransaction(
//       req.params.id,
//       req.user._id,
//       req.ip,
//       req.headers['user-agent']
//     );

//     res.json({
//       success: true,
//       data: transaction
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Get transaction by ID
//  */
// exports.getTransactionById = async (req, res) => {
//   try {
//     const transaction = await TransactionService.getTransactionById(
//       req.params.id,
//       req.user
//     );

//     res.json({
//       success: true,
//       data: transaction
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Get transactions list
//  */
// exports.getTransactions = async (req, res) => {
//   try {
//     const result = await TransactionService.getTransactions(req.query, req.user);

//     res.json({
//       success: true,
//       data: result
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Validate QR code
//  */
// exports.validateQR = async (req, res) => {
//   try {
//     const { qrData } = req.body;
//     if (!qrData) {
//       return res.status(400).json({
//         success: false,
//         message: 'QR data is required'
//       });
//     }

//     const result = await TransactionService.validateQRAndGetAction(qrData, req.user);

//     res.json({
//       success: true,
//       data: result
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };




























// // controllers/transactionController.js
// const TransactionService = require("../services/transactionService");
// const ReceiptService = require("../services/receiptService");
// const { AppError } = require("../middleware/errorHandler");

// /**
//  * Create transaction
//  */
// exports.createTransaction = async (req, res) => {
//   try {
//     const transaction = await TransactionService.createTransaction(
//       req.user._id,
//       req.user.storeId,
//       req.ip,
//       req.headers["user-agent"],
//     );

//     res.status(201).json({
//       success: true,
//       data: transaction,
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// /**
//  * Add item to transaction (auto-generates Sales QR)
//  */
// exports.addItem = async (req, res) => {
//   try {
//     const { productId, quantity } = req.body;
//     const transaction = await TransactionService.addItem(
//       req.params.id,
//       req.user._id,
//       productId,
//       quantity,
//       req.ip,
//       req.headers["user-agent"],
//     );

//     // Get the QR codes
//     const qrs = {
//       salesQR: transaction.salesQR,
//       salesQRGeneratedAt: transaction.salesQRGeneratedAt,
//     };

//     res.json({
//       success: true,
//       data: {
//         transaction,
//         qrCodes: qrs,
//       },
//       message: "Item added and Sales QR generated",
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// /**
//  * Add batch items to transaction
//  */
// exports.addBatchItems = async (req, res) => {
//   try {
//     const { items } = req.body; // Array of { productId, quantity }

//     if (!items || !Array.isArray(items) || items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Items array is required",
//       });
//     }

//     const transaction = await TransactionService.addBatchItems(
//       req.params.id,
//       req.user._id,
//       items,
//       req.ip,
//       req.headers["user-agent"],
//     );

//     res.json({
//       success: true,
//       data: transaction,
//       message: `${items.length} items added successfully`,
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// /**
//  * Create transaction with items in one call
//  */
// exports.createTransactionWithItems = async (req, res) => {
//   try {
//     const { items } = req.body;

//     if (!items || !Array.isArray(items) || items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Items array is required",
//       });
//     }

//     const result = await TransactionService.createTransactionWithItems(
//       req.user._id,
//       req.user.storeId,
//       items,
//       req.ip,
//       req.headers["user-agent"],
//     );

//     res.status(201).json({
//       success: true,
//       data: result,
//       message: `Transaction created with ${items.length} items`,
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// /**
//  * Generate Sales QR (manual generation)
//  */
// exports.generateSalesQR = async (req, res) => {
//   try {
//     const result = await TransactionService.generateSalesQR(
//       req.params.id,
//       req.user._id,
//       req.ip,
//       req.headers["user-agent"],
//     );

//     res.json({
//       success: true,
//       data: result,
//       message: "Sales QR generated successfully",
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// /**
//  * Process payment (generates Payment QR)
//  */
// exports.processPayment = async (req, res) => {
//   try {
//     const { paymentMethod, amountPaid, reference, details } = req.body;

//     if (!paymentMethod || !amountPaid) {
//       return res.status(400).json({
//         success: false,
//         message: "Payment method and amount paid are required",
//       });
//     }

//     if (amountPaid <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Amount paid must be greater than 0",
//       });
//     }

//     const result = await TransactionService.processPayment(
//       req.params.id,
//       req.user._id,
//       paymentMethod,
//       amountPaid,
//       { reference, details },
//       req.ip,
//       req.headers["user-agent"],
//     );

//     res.json({
//       success: true,
//       data: {
//         transaction: result.transaction,
//         payment: result.payment,
//         paymentQR: result.paymentQR,
//         receiptData: result.receiptData,
//         change: result.change,
//       },
//       message: "Payment processed and Payment QR generated",
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// /**
//  * Release stock (generates Release QR and Invoice QR)
//  */
// exports.releaseStock = async (req, res) => {
//   try {
//     const { releasedItems } = req.body;

//     if (
//       !releasedItems ||
//       !Array.isArray(releasedItems) ||
//       releasedItems.length === 0
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Released items array is required",
//       });
//     }

//     const result = await TransactionService.releaseStock(
//       req.params.id,
//       req.user._id,
//       releasedItems,
//       req.ip,
//       req.headers["user-agent"],
//     );

//     res.json({
//       success: true,
//       data: {
//         transaction: result.transaction,
//         invoiceNumber: result.invoiceNumber,
//         releaseQR: result.releaseQR,
//         invoiceQR: result.invoiceQR,
//         releaseResults: result.releaseResults,
//       },
//       message: "Stock released and QR codes generated",
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// /**
//  * Complete transaction
//  */
// exports.completeTransaction = async (req, res) => {
//   try {
//     const result = await TransactionService.completeTransaction(
//       req.params.id,
//       req.user._id,
//       req.ip,
//       req.headers["user-agent"],
//     );

//     res.json({
//       success: true,
//       data: {
//         transaction: result.transaction,
//         receiptData: result.receiptData,
//       },
//       message: "Transaction completed successfully",
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// /**
//  * Get transaction by ID with receipt
//  */
// exports.getTransactionById = async (req, res) => {
//   try {
//     const transaction = await TransactionService.getTransactionById(
//       req.params.id,
//       req.user,
//     );

//     res.json({
//       success: true,
//       data: {
//         transaction,
//         receiptData: transaction.receiptData,
//       },
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// /**
//  * Get all QR codes for a transaction
//  */
// exports.getTransactionQRs = async (req, res) => {
//   try {
//     const qrs = await TransactionService.getTransactionQRs(
//       req.params.id,
//       req.user,
//     );

//     res.json({
//       success: true,
//       data: qrs,
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// /**
//  * Get transactions list
//  */
// exports.getTransactions = async (req, res) => {
//   try {
//     const result = await TransactionService.getTransactions(
//       req.query,
//       req.user,
//     );

//     res.json({
//       success: true,
//       data: result,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// /**
//  * Validate QR code
//  */
// exports.validateQR = async (req, res) => {
//   try {
//     const { qrData } = req.body;
//     if (!qrData) {
//       return res.status(400).json({
//         success: false,
//         message: "QR data is required",
//       });
//     }

//     const result = await TransactionService.validateQRAndGetAction(
//       qrData,
//       req.user,
//     );

//     res.json({
//       success: true,
//       data: {
//         transaction: result.transaction,
//         qrType: result.qrType,
//         step: result.step,
//         nextAction: result.nextAction,
//         nextStep: result.nextStep,
//         receiptData: result.receiptData,
//         isValid: result.isValid,
//       },
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// /**
//  * Get receipt data
//  */
// exports.getReceipt = async (req, res) => {
//   try {
//     const transaction = await TransactionService.getTransactionById(
//       req.params.id,
//       req.user,
//     );

//     if (!transaction.receiptData) {
//       const receiptData = await ReceiptService.generateReceiptData(transaction);
//       transaction.receiptData = receiptData;
//       await transaction.save();
//     }

//     res.json({
//       success: true,
//       data: transaction.receiptData,
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// /**
//  * Print receipt (formatted for printing)
//  */
// exports.printReceipt = async (req, res) => {
//   try {
//     const transaction = await TransactionService.getTransactionById(
//       req.params.id,
//       req.user,
//     );

//     if (!transaction.receiptData) {
//       const receiptData = await ReceiptService.generateReceiptData(transaction);
//       transaction.receiptData = receiptData;
//       await transaction.save();
//     }

//     const formattedReceipt = ReceiptService.formatReceiptForPrinting(
//       transaction.receiptData,
//     );

//     res.json({
//       success: true,
//       data: {
//         receiptData: transaction.receiptData,
//         formatted: formattedReceipt,
//       },
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };



























const TransactionService = require("../services/transactionService");
const ReceiptService = require("../services/receiptService");
const { AppError } = require("../middleware/errorHandler");

/**
 * Create transaction with items (generates Sales QR)
 */
exports.createTransactionWithItems = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required",
      });
    }

    const result = await TransactionService.createTransactionWithItems(
      req.user._id,
      req.user.storeId,
      items,
      req.ip,
      req.headers["user-agent"],
    );

    res.status(201).json({
      success: true,
      data: result,
      message: `Transaction created with ${items.length} items. Sales QR generated.`,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Scan Sales QR - Show transaction details for payment
 */
exports.scanSalesQR = async (req, res) => {
  try {
    const { qrData } = req.body;
    
    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: "QR data is required",
      });
    }

    const result = await TransactionService.scanSalesQR(
      qrData,
      req.user._id,
      req.ip,
      req.headers["user-agent"],
    );

    res.json({
      success: true,
      data: result,
      message: "Sales QR scanned successfully. Ready for payment.",
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Scan Payment QR - Show transaction details for warehouse release
 */
exports.scanPaymentQR = async (req, res) => {
  try {
    const { qrData } = req.body;
    
    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: "QR data is required",
      });
    }

    const result = await TransactionService.scanPaymentQR(
      qrData,
      req.user._id,
      req.ip,
      req.headers["user-agent"],
    );

    res.json({
      success: true,
      data: result,
      message: "Payment QR scanned successfully. Ready for warehouse release.",
    });
  } 
  // catch (error) {
  //   res.status(error.statusCode || 500).json({
  //     success: false,
  //     message: error.message,
  //   });
  // }
  catch (error) {
    console.error(error);

    res.status(500).json({
        success: false,
        message: error.message,
        stack: error.stack
    });
}
};

/**
 * Scan Release QR - Show transaction details for invoice
 */
exports.scanReleaseQR = async (req, res) => {
  try {
    const { qrData } = req.body;
    
    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: "QR data is required",
      });
    }

    const result = await TransactionService.scanReleaseQR(
      qrData,
      req.user._id,
      req.ip,
      req.headers["user-agent"],
    );

    res.json({
      success: true,
      data: result,
      message: "Release QR scanned successfully. Invoice generated.",
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Scan Invoice QR - Complete transaction
 */
exports.scanInvoiceQR = async (req, res) => {
  try {
    const { qrData } = req.body;
    
    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: "QR data is required",
      });
    }

    const result = await TransactionService.scanInvoiceQR(
      qrData,
      req.user._id,
      req.ip,
      req.headers["user-agent"],
    );

    res.json({
      success: true,
      data: result,
      message: "Transaction completed successfully!",
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Process payment and generate Payment QR
 */
exports.processPayment = async (req, res) => {
  try {
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

    const result = await TransactionService.processPayment(
      req.params.id,
      req.user._id,
      paymentMethod,
      amountPaid,
      { reference, details },
      req.ip,
      req.headers["user-agent"],
    );

    res.json({
      success: true,
      data: {
        transaction: result.transaction,
        payment: result.payment,
        paymentQR: result.paymentQR,
        receiptData: result.receiptData,
        change: result.change,
      },
      message: "Payment processed and Payment QR generated",
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Release stock and generate Release QR
 */
exports.releaseStock = async (req, res) => {
  try {
    const { releasedItems } = req.body;

    if (!releasedItems || !Array.isArray(releasedItems) || releasedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Released items array is required",
      });
    }

    const result = await TransactionService.releaseStock(
      req.params.id,
      req.user._id,
      releasedItems,
      req.ip,
      req.headers["user-agent"],
    );

    res.json({
      success: true,
      data: {
        transaction: result.transaction,
        invoiceNumber: result.invoiceNumber,
        releaseQR: result.releaseQR,
        releaseResults: result.releaseResults,
        releaseErrors: result.releaseErrors,
        receiptData: result.receiptData,
      },
      message: "Stock released and Release QR generated",
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all QR codes for a transaction
 */
exports.getTransactionQRs = async (req, res) => {
  try {
    const qrs = await TransactionService.getTransactionQRs(
      req.params.id,
      req.user,
    );

    res.json({
      success: true,
      data: qrs,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Validate any QR and determine next action
 */
exports.validateQR = async (req, res) => {
  try {
    const { qrData } = req.body;
    
    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: "QR data is required",
      });
    }

    const result = await TransactionService.validateQRAndGetAction(
      qrData,
      req.user,
    );

    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        message: result.error || "Invalid QR code",
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } 
  catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get transaction by ID with receipt
 */
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await TransactionService.getTransactionById(
      req.params.id,
      req.user,
    );

    res.json({
      success: true,
      data: {
        transaction,
        receiptData: transaction.receiptData,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get transactions list
 */
exports.getTransactions = async (req, res) => {
  try {
    const result = await TransactionService.getTransactions(
      req.query,
      req.user,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Add item to transaction (for manual addition)
 */
exports.addItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const transaction = await TransactionService.addItem(
      req.params.id,
      req.user._id,
      productId,
      quantity,
      req.ip,
      req.headers["user-agent"],
    );

    res.json({
      success: true,
      data: transaction,
      message: "Item added successfully",
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Generate Sales QR manually
 */
exports.generateSalesQR = async (req, res) => {
  try {
    const result = await TransactionService.generateSalesQR(
      req.params.id,
      req.user._id,
      req.ip,
      req.headers["user-agent"],
    );

    res.json({
      success: true,
      data: result,
      message: "Sales QR generated successfully",
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};