
// const ReceiptService = require('../services/receiptService');
// const { AppError } = require('../middleware/errorHandler');

// /**
//  * Get receipt by ID
//  */
// exports.getReceiptById = async (req, res) => {
//   try {
//     const receipt = await ReceiptService.getReceiptById(req.params.id, req.user);

//     res.json({
//       success: true,
//       data: receipt
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Get receipts by transaction
//  */
// exports.getReceiptsByTransaction = async (req, res) => {
//   try {
//     const { transactionId } = req.params;
//     const { type } = req.query;

//     const receipts = await ReceiptService.getReceiptsByTransaction(transactionId);
//     const filtered = type ? receipts.filter(r => r.type === type) : receipts;

//     if (filtered.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'No receipts found for this transaction'
//       });
//     }

//     res.json({
//       success: true,
//       data: filtered
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Mark receipt as printed
//  */
// exports.markReceiptPrinted = async (req, res) => {
//   try {
//     const receipt = await ReceiptService.markAsPrinted(req.params.id, req.user._id);

//     res.json({
//       success: true,
//       data: receipt
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Generate receipt PDF
//  */
// exports.generateReceiptPDF = async (req, res) => {
//   try {
//     const receipt = await ReceiptService.getReceiptById(req.params.id, req.user);
//     const transaction = receipt.transactionId;
//     const store = receipt.storeId;

//     let buffer, filename;
//     switch (receipt.type) {
//       case 'SALES':
//         buffer = await ReceiptService.generateSalesReceipt(transaction, store);
//         filename = `sales_${transaction.transactionNumber}.pdf`;
//         break;
//       case 'PAYMENT':
//         buffer = await ReceiptService.generatePaymentReceipt(transaction, store);
//         filename = `payment_${transaction.transactionNumber}.pdf`;
//         break;
//       case 'INVOICE':
//         buffer = await ReceiptService.generateInvoice(transaction, store);
//         filename = `invoice_${transaction.finalInvoiceNumber}.pdf`;
//         break;
//       default:
//         throw new AppError('Invalid receipt type', 400);
//     }

//     const filepath = await ReceiptService.saveReceipt(buffer, filename);
//     receipt.filePath = filepath;
//     receipt.fileSize = buffer.length;
//     await receipt.save();

//     res.json({
//       success: true,
//       data: {
//         receipt,
//         downloadUrl: `/api/receipts/${receipt._id}/download`
//       }
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Download receipt
//  */
// exports.downloadReceipt = async (req, res) => {
//   try {
//     const receipt = await ReceiptService.getReceiptById(req.params.id, req.user);

//     if (!receipt.filePath) {
//       return res.status(404).json({
//         success: false,
//         message: 'Receipt file not found'
//       });
//     }

//     res.download(receipt.filePath);
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };


























// controllers/receiptController.js
const ReceiptService = require('../services/receiptService');
const TransactionService = require('../services/transactionService');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get receipts with pagination and filters
 */
exports.getReceipts = async (req, res) => {
  try {
    const { 
      page, 
      limit, 
      type, 
      startDate, 
      endDate, 
      search,
      storeId 
    } = req.query;

    const targetStoreId = req.user.role === "SUPER_ADMIN" ? storeId : req.user.storeId;

    const result = await ReceiptService.getReceipts({
      page,
      limit,
      type,
      startDate,
      endDate,
      search,
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
 * Get receipt by ID
 */
exports.getReceiptById = async (req, res) => {
  try {
    const receipt = await ReceiptService.getReceiptById(req.params.id, req.user);

    res.json({
      success: true,
      data: receipt,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get receipts by transaction
 */
exports.getReceiptsByTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { type } = req.query;

    const receipts = await ReceiptService.getReceiptsByTransaction(transactionId, type);

    if (receipts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No receipts found for this transaction',
      });
    }

    res.json({
      success: true,
      data: receipts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Generate and save receipt
 */
exports.generateReceipt = async (req, res) => {
  try {
    const { transactionId, type } = req.body;
    
    if (!transactionId || !type) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID and type are required',
      });
    }

    // Get transaction
    const transaction = await TransactionService.getTransactionById(transactionId, req.user);
    
    // Get store
    const store = transaction.storeId;

    // Generate QR code
    const qrCode = await ReceiptService.generateReceiptQR(
      transaction._id,
      transaction.storeId,
      type,
      type
    );

    // Generate receipt data
    const receiptData = await ReceiptService.generateReceiptData(transaction, type);

    // Create receipt record
    const receipt = await ReceiptService.createReceiptRecord(
      transaction,
      type,
      qrCode,
      receiptData
    );

    // Generate PDF
    const buffer = await ReceiptService.generateReceiptPDF(transaction, store, type);
    
    // Save PDF
    const filename = `${type.toLowerCase()}_${transaction.transactionNumber}_${Date.now()}.pdf`;
    const filepath = await ReceiptService.saveReceipt(buffer, filename);
    
    receipt.filePath = filepath;
    receipt.fileSize = buffer.length;
    receipt.fileType = 'PDF';
    await receipt.save();

    res.json({
      success: true,
      data: {
        receipt,
        downloadUrl: `/api/receipts/${receipt._id}/download`,
        formattedText: receiptData.formattedText || ReceiptService.formatReceiptForPrinting(receiptData),
      },
    });
  } catch (error) {
    console.error('Generate receipt error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Mark receipt as printed
 */
exports.markReceiptPrinted = async (req, res) => {
  try {
    const receipt = await ReceiptService.markAsPrinted(req.params.id, req.user._id);

    res.json({
      success: true,
      data: receipt,
      message: 'Receipt marked as printed',
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Download receipt
 */
exports.downloadReceipt = async (req, res) => {
  try {
    const receipt = await ReceiptService.getReceiptById(req.params.id, req.user);

    if (!receipt.filePath) {
      return res.status(404).json({
        success: false,
        message: 'Receipt file not found',
      });
    }

    res.download(receipt.filePath);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get receipt preview (formatted for display)
 */
exports.getReceiptPreview = async (req, res) => {
  try {
    const receipt = await ReceiptService.getReceiptById(req.params.id, req.user);

    let formattedText = null;
    let receiptData = null;

    if (receipt.receiptData) {
      receiptData = receipt.receiptData;
      formattedText = ReceiptService.formatReceiptForPrinting(receiptData);
    } else {
      // Generate receipt data if not cached
      const transaction = await TransactionService.getTransactionById(receipt.transactionId._id, req.user);
      receiptData = await ReceiptService.generateReceiptData(transaction, receipt.type);
      receipt.receiptData = receiptData;
      await receipt.save();
      formattedText = ReceiptService.formatReceiptForPrinting(receiptData);
    }

    res.json({
      success: true,
      data: {
        receipt,
        receiptData,
        formattedText,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};