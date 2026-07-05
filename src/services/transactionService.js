// // services/transactionService.js
// const Transaction = require("../models/Transaction");
// const TransactionItem = require("../models/TransactionItem");
// const Product = require("../models/Product");
// const BaseService = require("./baseService");
// const QRService = require("./qrService");
// const InventoryService = require("./inventoryService");
// const PaymentService = require("./paymentService");
// const ReceiptService = require("./receiptService");
// const NotificationService = require("./notificationService");
// const { AppError } = require("../middleware/errorHandler");

// class TransactionService extends BaseService {
//   /**
//    * Create new transaction
//    */
//   async createTransaction(userId, storeId, ip, userAgent) {
//     const count = await Transaction.countDocuments({ storeId });
//     const transactionNumber = `STR-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;

//     const transaction = new Transaction({
//       transactionNumber,
//       storeId,
//       salesAttendantId: userId,
//       salesTimestamp: new Date(),
//       status: "PENDING",
//       salesStatus: "PENDING",
//     });

//     await transaction.save();

//     await this.auditLog(
//       userId,
//       "SALES_ATTENDANT",
//       "CREATE",
//       "Transaction",
//       transaction._id,
//       storeId,
//       {
//         after: transaction.toObject(),
//         metadata: { ipAddress: ip, userAgent },
//       },
//     );

//     await NotificationService.sendTransactionNotification(
//       transaction,
//       "created",
//     );

//     return transaction;
//   }

//   /**
//    * Add item to transaction and generate sales QR
//    */
//   async addItem(transactionId, userId, productId, quantity, ip, userAgent) {
//     const transaction = await Transaction.findById(transactionId);
//     if (!transaction) {
//       throw new AppError("Transaction not found", 404);
//     }

//     if (transaction.status !== "PENDING" && transaction.status !== "SALES_QR") {
//       throw new AppError("Cannot add items to completed transaction", 400);
//     }

//     const product = await Product.findById(productId);
//     if (!product) {
//       throw new AppError("Product not found", 404);
//     }

//     await InventoryService.reserveStock(
//       productId,
//       transaction.storeId,
//       quantity,
//     );

//     const taxAmount =
//       (product.unitPrice * quantity * (product.taxRate || 0)) / 100;
//     const totalPrice = product.unitPrice * quantity;

//     const transactionItem = new TransactionItem({
//       transactionId: transaction._id,
//       productId: product._id,
//       sku: product.sku,
//       name: product.name,
//       quantity,
//       unitPrice: product.unitPrice,
//       totalPrice,
//       taxRate: product.taxRate || 0,
//       taxAmount,
//       warehouseLocation: product.warehouseLocation,
//       discountAmount: 0,
//       discountPercentage: 0,
//     });

//     await transactionItem.save();

//     transaction.items.push(transactionItem._id);
//     transaction.subtotal += totalPrice;
//     transaction.taxTotal += taxAmount;
//     transaction.totalAmount = transaction.subtotal + transaction.taxTotal;
//     await transaction.save();

//     // Generate Sales QR after adding item
//     await this._generateSalesQR(transaction, userId, ip, userAgent);

//     await this.auditLog(
//       userId,
//       null,
//       "UPDATE",
//       "Transaction",
//       transaction._id,
//       transaction.storeId,
//       {
//         after: { items: transaction.items.length, status: transaction.status },
//         metadata: { ipAddress: ip, userAgent, productId, quantity },
//       },
//     );

//     // Generate receipt data
//     const receiptData = await ReceiptService.generateReceiptData(
//       transaction,
//       "SALES",
//     );
//     transaction.receiptData = receiptData;
//     await transaction.save();

//     return transaction;
//   }

//   /**
//    * Add multiple items to transaction in batch
//    */
//   async addBatchItems(transactionId, userId, items, ip, userAgent) {
//     const transaction = await Transaction.findById(transactionId);
//     if (!transaction) {
//       throw new AppError("Transaction not found", 404);
//     }

//     if (transaction.status !== "PENDING" && transaction.status !== "SALES_QR") {
//       throw new AppError("Cannot add items to completed transaction", 400);
//     }

//     const results = [];
//     let subtotal = transaction.subtotal || 0;
//     let taxTotal = transaction.taxTotal || 0;

//     for (const item of items) {
//       const { productId, quantity } = item;

//       if (!productId || !quantity || quantity <= 0) {
//         continue;
//       }

//       const product = await Product.findById(productId);
//       if (!product) {
//         throw new AppError(`Product ${productId} not found`, 404);
//       }

//       // Check inventory
//       await InventoryService.reserveStock(
//         productId,
//         transaction.storeId,
//         quantity,
//       );

//       const taxAmount =
//         (product.unitPrice * quantity * (product.taxRate || 0)) / 100;
//       const totalPrice = product.unitPrice * quantity;

//       // Check if item already exists in transaction
//       const existingItem = await TransactionItem.findOne({
//         transactionId: transaction._id,
//         productId: product._id,
//       });

//       if (existingItem) {
//         // Update existing item
//         const newQuantity = existingItem.quantity + quantity;
//         const newTotalPrice = product.unitPrice * newQuantity;
//         const newTaxAmount =
//           (product.unitPrice * newQuantity * (product.taxRate || 0)) / 100;

//         existingItem.quantity = newQuantity;
//         existingItem.totalPrice = newTotalPrice;
//         existingItem.taxAmount = newTaxAmount;
//         await existingItem.save();

//         subtotal += totalPrice;
//         taxTotal += taxAmount;
//       } else {
//         // Create new item
//         const transactionItem = new TransactionItem({
//           transactionId: transaction._id,
//           productId: product._id,
//           sku: product.sku,
//           name: product.name,
//           quantity,
//           unitPrice: product.unitPrice,
//           totalPrice,
//           taxRate: product.taxRate || 0,
//           taxAmount,
//           warehouseLocation: product.warehouseLocation,
//         });

//         await transactionItem.save();
//         transaction.items.push(transactionItem._id);

//         subtotal += totalPrice;
//         taxTotal += taxAmount;
//       }

//       results.push({
//         productId: product._id,
//         name: product.name,
//         quantity,
//         totalPrice,
//       });
//     }

//     // Update transaction totals
//     transaction.subtotal = subtotal;
//     transaction.taxTotal = taxTotal;
//     transaction.totalAmount = subtotal + taxTotal;
//     await transaction.save();

//     // Log audit
//     await this.auditLog(
//       userId,
//       null,
//       "UPDATE",
//       "Transaction",
//       transaction._id,
//       transaction.storeId,
//       {
//         after: {
//           items: transaction.items.length,
//           totalAmount: transaction.totalAmount,
//         },
//         metadata: { ipAddress: ip, userAgent, items: results },
//       },
//     );

//     // Populate and return
//     return await transaction.populate("items.productId");
//   }

//   // services/transactionService.js - Add new method
//   /**
//    * Create transaction with items in one call
//    */
//   // async createTransactionWithItems(userId, storeId, items, ip, userAgent) {
//   //   // Create transaction
//   //   const count = await Transaction.countDocuments({ storeId });
//   //   const transactionNumber = `STR-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;

//   //   const transaction = new Transaction({
//   //     transactionNumber,
//   //     storeId,
//   //     salesAttendantId: userId,
//   //     salesTimestamp: new Date(),
//   //     status: "PENDING",
//   //     salesStatus: "PENDING",
//   //   });

//   //   await transaction.save();

//   //   let subtotal = 0;
//   //   let taxTotal = 0;
//   //   const addedItems = [];

//   //   // Process each item
//   //   for (const item of items) {
//   //     const { productId, quantity } = item;

//   //     if (!productId || !quantity || quantity <= 0) {
//   //       continue;
//   //     }

//   //     const product = await Product.findById(productId);
//   //     if (!product) {
//   //       throw new AppError(`Product ${productId} not found`, 404);
//   //     }

//   //     // Check inventory
//   //     await InventoryService.reserveStock(productId, storeId, quantity);

//   //     const taxAmount =
//   //       (product.unitPrice * quantity * (product.taxRate || 0)) / 100;
//   //     const totalPrice = product.unitPrice * quantity;

//   //     // Create transaction item
//   //     const transactionItem = new TransactionItem({
//   //       transactionId: transaction._id,
//   //       productId: product._id,
//   //       sku: product.sku,
//   //       name: product.name,
//   //       quantity,
//   //       unitPrice: product.unitPrice,
//   //       totalPrice,
//   //       taxRate: product.taxRate || 0,
//   //       taxAmount,
//   //       warehouseLocation: product.warehouseLocation,
//   //     });

//   //     await transactionItem.save();
//   //     transaction.items.push(transactionItem._id);

//   //     subtotal += totalPrice;
//   //     taxTotal += taxAmount;
//   //     addedItems.push({
//   //       productId: product._id,
//   //       name: product.name,
//   //       quantity,
//   //       totalPrice,
//   //     });
//   //   }

//   //   // Update transaction totals
//   //   transaction.subtotal = subtotal;
//   //   transaction.taxTotal = taxTotal;
//   //   transaction.totalAmount = subtotal + taxTotal;
//   //   await transaction.save();

//   //   // Log audit
//   //   await this.auditLog(
//   //     userId,
//   //     "SALES_ATTENDANT",
//   //     "CREATE",
//   //     "Transaction",
//   //     transaction._id,
//   //     storeId,
//   //     {
//   //       after: transaction.toObject(),
//   //       metadata: { ipAddress: ip, userAgent, items: addedItems },
//   //     },
//   //   );

//   //   await NotificationService.sendTransactionNotification(
//   //     transaction,
//   //     "created",
//   //   );

//   //   // Populate and return
//   //   return await transaction.populate("items.productId");
//   // }

// /**
//  * Create transaction with items in one call
//  */
// // async createTransactionWithItems(userId, storeId, items, ip, userAgent) {
// //   // Create transaction
// //   const count = await Transaction.countDocuments({ storeId });
// //   const transactionNumber = `STR-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;

// //   const transaction = new Transaction({
// //     transactionNumber,
// //     storeId,
// //     salesAttendantId: userId,
// //     salesTimestamp: new Date(),
// //     status: "PENDING",
// //     salesStatus: "PENDING",
// //   });

// //   await transaction.save();

// //   let subtotal = 0;
// //   let taxTotal = 0;
// //   const addedItems = [];

// //   // Process each item
// //   for (const item of items) {
// //     const { productId, quantity } = item;

// //     if (!productId || !quantity || quantity <= 0) {
// //       continue;
// //     }

// //     const product = await Product.findById(productId);
// //     if (!product) {
// //       throw new AppError(`Product ${productId} not found`, 404);
// //     }

// //     // Check inventory
// //     await InventoryService.reserveStock(productId, storeId, quantity);

// //     const taxAmount =
// //       (product.unitPrice * quantity * (product.taxRate || 0)) / 100;
// //     const totalPrice = product.unitPrice * quantity;

// //     // Create transaction item
// //     const transactionItem = new TransactionItem({
// //       transactionId: transaction._id,
// //       productId: product._id,
// //       sku: product.sku,
// //       name: product.name,
// //       quantity,
// //       unitPrice: product.unitPrice,
// //       totalPrice,
// //       taxRate: product.taxRate || 0,
// //       taxAmount,
// //       warehouseLocation: product.warehouseLocation,
// //     });

// //     await transactionItem.save();
// //     transaction.items.push(transactionItem._id);

// //     subtotal += totalPrice;
// //     taxTotal += taxAmount;
// //     addedItems.push({
// //       productId: product._id,
// //       name: product.name,
// //       quantity,
// //       totalPrice,
// //     });
// //   }

// //   // Update transaction totals
// //   transaction.subtotal = subtotal;
// //   transaction.taxTotal = taxTotal;
// //   transaction.totalAmount = subtotal + taxTotal;
// //   await transaction.save();

// //   // Log audit
// //   await this.auditLog(
// //     userId,
// //     "SALES_ATTENDANT",
// //     "CREATE",
// //     "Transaction",
// //     transaction._id,
// //     storeId,
// //     {
// //       after: transaction.toObject(),
// //       metadata: { ipAddress: ip, userAgent, items: addedItems },
// //     },
// //   );

// //   await NotificationService.sendTransactionNotification(
// //     transaction,
// //     "created",
// //   );

// //   // Populate transaction with items
// //   const populatedTransaction = await transaction.populate("items.productId");

// //   // ============================================================
// //   // GENERATE AND SAVE RECEIPTS FOR THE TRANSACTION
// //   // ============================================================

// //   try {
// //     // 1. Generate Sales Receipt Data
// //     const salesReceiptData = await ReceiptService.generateReceiptData(
// //       populatedTransaction,
// //       "SALES"
// //     );

// //     // 2. Generate Sales QR Code
// //     const salesQR = await ReceiptService.generateReceiptQR(
// //       populatedTransaction._id,
// //       populatedTransaction.storeId,
// //       "SALES",
// //       "SALES_QR"
// //     );

// //     // 3. Create Sales Receipt Record
// //     const salesReceipt = await ReceiptService.createReceiptRecord(
// //       populatedTransaction,
// //       "SALES",
// //       salesQR,
// //       salesReceiptData
// //     );

// //     // 4. Generate Sales Receipt PDF
// //     const store = await populatedTransaction.storeId || await Store.findById(storeId);
// //     const salesPDFBuffer = await ReceiptService.generateReceiptPDF(
// //       populatedTransaction,
// //       store,
// //       "SALES"
// //     );

// //     // 5. Save Sales Receipt PDF
// //     const salesFilename = `sales_${populatedTransaction.transactionNumber}_${Date.now()}.pdf`;
// //     const salesFilePath = await ReceiptService.saveReceipt(salesPDFBuffer, salesFilename);

// //     // 6. Update Sales Receipt with file info
// //     salesReceipt.filePath = salesFilePath;
// //     salesReceipt.fileSize = salesPDFBuffer.length;
// //     salesReceipt.fileType = "PDF";
// //     await salesReceipt.save();

// //     // 7. Update transaction with Sales QR and receipt data
// //     populatedTransaction.salesQR = salesQR;
// //     populatedTransaction.salesQRGeneratedAt = new Date();
// //     populatedTransaction.salesReceiptPrinted = true;
// //     populatedTransaction.status = "SALES_QR";
// //     populatedTransaction.salesStatus = "SALES_QR_PRINTED";
// //     populatedTransaction.receiptData = salesReceiptData;
// //     await populatedTransaction.save();

// //     // 8. Generate Payment Receipt Data (pre-generate for next step)
// //     const paymentReceiptData = await ReceiptService.generateReceiptData(
// //       populatedTransaction,
// //       "PAYMENT"
// //     );

// //     // 9. Generate Payment QR Code
// //     const paymentQR = await ReceiptService.generateReceiptQR(
// //       populatedTransaction._id,
// //       populatedTransaction.storeId,
// //       "PAYMENT",
// //       "PAYMENT_QR"
// //     );

// //     // 10. Create Payment Receipt Record
// //     const paymentReceipt = await ReceiptService.createReceiptRecord(
// //       populatedTransaction,
// //       "PAYMENT",
// //       paymentQR,
// //       paymentReceiptData
// //     );

// //     // 11. Update transaction with Payment QR
// //     populatedTransaction.paymentQR = paymentQR;
// //     populatedTransaction.paymentQRGeneratedAt = new Date();
// //     await populatedTransaction.save();

// //     // 12. Generate Invoice Receipt Data (pre-generate for final step)
// //     const invoiceReceiptData = await ReceiptService.generateReceiptData(
// //       populatedTransaction,
// //       "INVOICE"
// //     );

// //     // 13. Generate Invoice QR Code
// //     const invoiceQR = await ReceiptService.generateReceiptQR(
// //       populatedTransaction._id,
// //       populatedTransaction.storeId,
// //       "INVOICE",
// //       "INVOICE_QR"
// //     );

// //     // 14. Create Invoice Receipt Record
// //     const invoiceReceipt = await ReceiptService.createReceiptRecord(
// //       populatedTransaction,
// //       "INVOICE",
// //       invoiceQR,
// //       invoiceReceiptData
// //     );

// //     // 15. Update transaction with Invoice QR
// //     populatedTransaction.invoiceQR = invoiceQR;
// //     populatedTransaction.invoiceQRGeneratedAt = new Date();
// //     await populatedTransaction.save();

// //     // 16. Generate FINAL Receipt Data
// //     const finalReceiptData = await ReceiptService.generateReceiptData(
// //       populatedTransaction,
// //       "FINAL"
// //     );

// //     // 17. Create FINAL Receipt Record
// //     const finalReceipt = await ReceiptService.createReceiptRecord(
// //       populatedTransaction,
// //       "FINAL",
// //       invoiceQR, // Reuse invoice QR or generate a new one
// //       finalReceiptData
// //     );

// //     // Log receipt generation
// //     await this.auditLog(
// //       userId,
// //       "SALES_ATTENDANT",
// //       "PRINT",
// //       "Receipt",
// //       salesReceipt._id,
// //       storeId,
// //       {
// //         after: {
// //           salesReceiptId: salesReceipt._id,
// //           paymentReceiptId: paymentReceipt._id,
// //           invoiceReceiptId: invoiceReceipt._id,
// //           finalReceiptId: finalReceipt._id,
// //         },
// //         metadata: { ipAddress: ip, userAgent, transactionNumber },
// //       },
// //     );

// //     // Return transaction with receipt data
// //     return {
// //       ...populatedTransaction.toObject(),
// //       receipts: {
// //         sales: {
// //           id: salesReceipt._id,
// //           receiptNumber: salesReceipt.receiptNumber,
// //           filePath: salesReceipt.filePath,
// //           fileSize: salesReceipt.fileSize,
// //           qrCode: salesReceipt.qrCode,
// //         },
// //         payment: {
// //           id: paymentReceipt._id,
// //           receiptNumber: paymentReceipt.receiptNumber,
// //           qrCode: paymentReceipt.qrCode,
// //         },
// //         invoice: {
// //           id: invoiceReceipt._id,
// //           receiptNumber: invoiceReceipt.receiptNumber,
// //           qrCode: invoiceReceipt.qrCode,
// //         },
// //         final: {
// //           id: finalReceipt._id,
// //           receiptNumber: finalReceipt.receiptNumber,
// //         },
// //       },
// //       receiptData: finalReceiptData,
// //     };

// //   } catch (receiptError) {
// //     // Log error but don't fail the transaction creation
// //     console.error("Failed to generate receipts:", receiptError);

// //     // Log the error in audit
// //     await this.auditLog(
// //       userId,
// //       "SALES_ATTENDANT",
// //       "ERROR",
// //       "Receipt",
// //       transaction._id,
// //       storeId,
// //       {
// //         metadata: {
// //           error: receiptError.message,
// //           transactionNumber,
// //           ipAddress: ip,
// //           userAgent,
// //         },
// //       },
// //       "WARNING"
// //     );

// //     // Return transaction without receipts
// //     return populatedTransaction;
// //   }
// // }

// // services/transactionService.js - Fixed createTransactionWithItems method

// async createTransactionWithItems(userId, storeId, items, ip, userAgent) {
//   // Create transaction
//   const count = await Transaction.countDocuments({ storeId });
//   const transactionNumber = `STR-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;

//   const transaction = new Transaction({
//     transactionNumber,
//     storeId,
//     salesAttendantId: userId,
//     salesTimestamp: new Date(),
//     status: "PENDING",
//     salesStatus: "PENDING",
//   });

//   await transaction.save();

//   let subtotal = 0;
//   let taxTotal = 0;
//   const addedItems = [];

//   // Process each item
//   for (const item of items) {
//     const { productId, quantity } = item;

//     if (!productId || !quantity || quantity <= 0) {
//       continue;
//     }

//     const product = await Product.findById(productId);
//     if (!product) {
//       throw new AppError(`Product ${productId} not found`, 404);
//     }

//     // Check inventory
//     await InventoryService.reserveStock(productId, storeId, quantity);

//     const taxAmount = (product.unitPrice * quantity * (product.taxRate || 0)) / 100;
//     const totalPrice = product.unitPrice * quantity;

//     // Create transaction item with ALL product data
//     const transactionItem = new TransactionItem({
//       transactionId: transaction._id,
//       productId: product._id,
//       sku: product.sku || "",
//       name: product.name || "Item",
//       quantity: quantity,
//       unitPrice: product.unitPrice || 0,
//       totalPrice: totalPrice,
//       taxRate: product.taxRate || 0,
//       taxAmount: taxAmount,
//       warehouseLocation: product.warehouseLocation || {},
//       discountAmount: 0,
//       discountPercentage: 0,
//     });

//     await transactionItem.save();
//     transaction.items.push(transactionItem._id);

//     subtotal += totalPrice;
//     taxTotal += taxAmount;
//     addedItems.push({
//       productId: product._id,
//       name: product.name,
//       quantity,
//       totalPrice,
//     });
//   }

//   // Update transaction totals
//   transaction.subtotal = subtotal;
//   transaction.taxTotal = taxTotal;
//   transaction.totalAmount = subtotal + taxTotal;
//   await transaction.save();

//   // Log audit
//   await this.auditLog(
//     userId,
//     "SALES_ATTENDANT",
//     "CREATE",
//     "Transaction",
//     transaction._id,
//     storeId,
//     {
//       after: transaction.toObject(),
//       metadata: { ipAddress: ip, userAgent, items: addedItems },
//     },
//   );

//   await NotificationService.sendTransactionNotification(transaction, "created");

//   // ============================================================
//   // FIX: Populate the transaction with FULL item details
//   // ============================================================
//   const populatedTransaction = await Transaction.findById(transaction._id)
//     .populate({
//       path: 'items',
//       populate: {
//         path: 'productId',
//         select: 'name sku unitPrice taxRate description category brand'
//       }
//     })
//     .populate('storeId')
//     .populate('salesAttendantId', 'firstName lastName email');

//   // ============================================================
//   // GENERATE AND SAVE RECEIPTS WITH POPULATED DATA
//   // ============================================================

//   try {
//     // Generate Sales Receipt Data - NOW WITH FULL ITEM DETAILS
//     const salesReceiptData = await ReceiptService.generateReceiptData(
//       populatedTransaction,
//       "SALES"
//     );

//     // Generate Sales QR Code
//     const salesQR = await ReceiptService.generateReceiptQR(
//       populatedTransaction._id,
//       populatedTransaction.storeId,
//       "SALES",
//       "SALES_QR"
//     );

//     // Create Sales Receipt Record
//     const salesReceipt = await ReceiptService.createReceiptRecord(
//       populatedTransaction,
//       "SALES",
//       salesQR,
//       salesReceiptData
//     );

//     // Get store
//     const Store = require('../models/Store');
//     const store = await Store.findById(storeId);

//     // Generate Sales Receipt PDF
//     const salesPDFBuffer = await ReceiptService.generateReceiptPDF(
//       populatedTransaction,
//       store,
//       "SALES"
//     );

//     // Save Sales Receipt PDF
//     const salesFilename = `sales_${populatedTransaction.transactionNumber}_${Date.now()}.pdf`;
//     const salesFilePath = await ReceiptService.saveReceipt(salesPDFBuffer, salesFilename);

//     // Update Sales Receipt with file info
//     salesReceipt.filePath = salesFilePath;
//     salesReceipt.fileSize = salesPDFBuffer.length;
//     salesReceipt.fileType = "PDF";
//     await salesReceipt.save();

//     // Update transaction with Sales QR and receipt data
//     populatedTransaction.salesQR = salesQR;
//     populatedTransaction.salesQRGeneratedAt = new Date();
//     populatedTransaction.salesReceiptPrinted = true;
//     populatedTransaction.status = "SALES_QR";
//     populatedTransaction.salesStatus = "SALES_QR_PRINTED";
//     populatedTransaction.receiptData = salesReceiptData;
//     await populatedTransaction.save();

//     // Generate Payment Receipt Data
//     const paymentReceiptData = await ReceiptService.generateReceiptData(
//       populatedTransaction,
//       "PAYMENT"
//     );

//     // Generate Payment QR Code
//     const paymentQR = await ReceiptService.generateReceiptQR(
//       populatedTransaction._id,
//       populatedTransaction.storeId,
//       "PAYMENT",
//       "PAYMENT_QR"
//     );

//     // Create Payment Receipt Record
//     const paymentReceipt = await ReceiptService.createReceiptRecord(
//       populatedTransaction,
//       "PAYMENT",
//       paymentQR,
//       paymentReceiptData
//     );

//     // Update transaction with Payment QR
//     populatedTransaction.paymentQR = paymentQR;
//     populatedTransaction.paymentQRGeneratedAt = new Date();
//     await populatedTransaction.save();

//     // Generate Invoice Receipt Data
//     const invoiceReceiptData = await ReceiptService.generateReceiptData(
//       populatedTransaction,
//       "INVOICE"
//     );

//     // Generate Invoice QR Code
//     const invoiceQR = await ReceiptService.generateReceiptQR(
//       populatedTransaction._id,
//       populatedTransaction.storeId,
//       "INVOICE",
//       "INVOICE_QR"
//     );

//     // Create Invoice Receipt Record
//     const invoiceReceipt = await ReceiptService.createReceiptRecord(
//       populatedTransaction,
//       "INVOICE",
//       invoiceQR,
//       invoiceReceiptData
//     );

//     // Update transaction with Invoice QR
//     populatedTransaction.invoiceQR = invoiceQR;
//     populatedTransaction.invoiceQRGeneratedAt = new Date();
//     await populatedTransaction.save();

//     // Generate FINAL Receipt Data
//     const finalReceiptData = await ReceiptService.generateReceiptData(
//       populatedTransaction,
//       "FINAL"
//     );

//     // Create FINAL Receipt Record
//     const finalReceipt = await ReceiptService.createReceiptRecord(
//       populatedTransaction,
//       "FINAL",
//       invoiceQR,
//       finalReceiptData
//     );

//     // Log receipt generation
//     await this.auditLog(
//       userId,
//       "SALES_ATTENDANT",
//       "PRINT",
//       "Receipt",
//       salesReceipt._id,
//       storeId,
//       {
//         after: {
//           salesReceiptId: salesReceipt._id,
//           paymentReceiptId: paymentReceipt._id,
//           invoiceReceiptId: invoiceReceipt._id,
//           finalReceiptId: finalReceipt._id,
//         },
//         metadata: { ipAddress: ip, userAgent, transactionNumber },
//       },
//     );

//     // ============================================================
//     // FINAL: Populate the transaction one more time for the response
//     // ============================================================
//     const finalTransaction = await Transaction.findById(transaction._id)
//       .populate({
//         path: 'items',
//         populate: {
//           path: 'productId',
//           select: 'name sku unitPrice taxRate description category brand'
//         }
//       })
//       .populate('storeId')
//       .populate('salesAttendantId', 'firstName lastName email')
//       .populate('financeAttendantId', 'firstName lastName email')
//       .populate('warehouseStaffId', 'firstName lastName email')
//       .populate('itemsReleased.productId')
//       .populate('itemsReleased.releasedBy', 'firstName lastName');

//     // Return transaction with receipt data
//     return {
//       ...finalTransaction.toObject(),
//       receipts: {
//         sales: {
//           id: salesReceipt._id,
//           receiptNumber: salesReceipt.receiptNumber,
//           filePath: salesReceipt.filePath,
//           fileSize: salesReceipt.fileSize,
//           qrCode: salesReceipt.qrCode,
//         },
//         payment: {
//           id: paymentReceipt._id,
//           receiptNumber: paymentReceipt.receiptNumber,
//           qrCode: paymentReceipt.qrCode,
//         },
//         invoice: {
//           id: invoiceReceipt._id,
//           receiptNumber: invoiceReceipt.receiptNumber,
//           qrCode: invoiceReceipt.qrCode,
//         },
//         final: {
//           id: finalReceipt._id,
//           receiptNumber: finalReceipt.receiptNumber,
//         },
//       },
//       receiptData: finalReceiptData,
//     };

//   } catch (receiptError) {
//     // Log error but don't fail the transaction creation
//     console.error("Failed to generate receipts:", receiptError);

//     // Log the error in audit
//     await this.auditLog(
//       userId,
//       "SALES_ATTENDANT",
//       "ERROR",
//       "Receipt",
//       transaction._id,
//       storeId,
//       {
//         metadata: {
//           error: receiptError.message,
//           transactionNumber,
//           ipAddress: ip,
//           userAgent,
//         },
//       },
//       "WARNING"
//     );

//     // Return transaction without receipts (but with populated items)
//     const fallbackTransaction = await Transaction.findById(transaction._id)
//       .populate({
//         path: 'items',
//         populate: {
//           path: 'productId',
//           select: 'name sku unitPrice taxRate'
//         }
//       })
//       .populate('storeId')
//       .populate('salesAttendantId', 'firstName lastName email');

//     return fallbackTransaction;
//   }
// }

//   /**
//    * Generate Sales QR (called after items are added)
//    */
//   async _generateSalesQR(transaction, userId, ip, userAgent) {
//     if (transaction.items.length === 0) {
//       throw new AppError("Transaction has no items", 400);
//     }

//     const qrData = await QRService.generateQR({
//       type: "SALES",
//       transactionId: transaction._id,
//       storeId: transaction.storeId,
//       step: "SALES_QR",
//       metadata: {
//         itemCount: transaction.items.length,
//         totalAmount: transaction.totalAmount,
//       },
//     });

//     transaction.salesQR = qrData;
//     transaction.salesQRGeneratedAt = new Date();
//     transaction.salesReceiptPrinted = true;
//     transaction.status = "SALES_QR";
//     transaction.salesStatus = "SALES_QR_PRINTED";
//     await transaction.save();

//     await this.auditLog(
//       userId,
//       null,
//       "PRINT",
//       "Transaction",
//       transaction._id,
//       transaction.storeId,
//       {
//         after: { salesQR: qrData, status: "SALES_QR" },
//         metadata: { ipAddress: ip, userAgent },
//       },
//     );

//     await NotificationService.sendTransactionNotification(
//       transaction,
//       "sales_qr",
//     );

//     // return qrData;
//     return {
//       transaction,
//       salesQR: qrData,
//     };
//   }

//   /**
//    * Generate Sales QR publicly (for controller)
//    */
//   async generateSalesQR(transactionId, userId, ip, userAgent) {
//     const transaction =
//       await Transaction.findById(transactionId).populate("items");

//     if (!transaction) {
//       throw new AppError("Transaction not found", 404);
//     }

//     if (transaction.items.length === 0) {
//       throw new AppError("Transaction has no items", 400);
//     }

//     return await this._generateSalesQR(transaction, userId, ip, userAgent);
//   }

//   /**
//    * Process payment and generate payment QR
//    */
//   async processPayment(
//     transactionId,
//     userId,
//     paymentMethod,
//     amountPaid,
//     paymentDetails,
//     ip,
//     userAgent,
//   ) {
//     // Process payment via PaymentService
//     const paymentResult = await PaymentService.processPayment(
//       transactionId,
//       userId,
//       {
//         method: paymentMethod,
//         amountPaid,
//         details: paymentDetails,
//       },
//       ip,
//       userAgent,
//     );

//     const transaction = paymentResult.transaction;

//     // Generate Payment QR
//     const qrData = await QRService.generateQR({
//       type: "PAYMENT",
//       transactionId: transactionId,
//       storeId: transaction.storeId,
//       step: "PAYMENT_QR",
//       metadata: {
//         paymentMethod: paymentMethod,
//         amountPaid: amountPaid,
//         totalAmount: transaction.totalAmount,
//         changeAmount: transaction.changeAmount,
//       },
//     });

//     transaction.paymentQR = qrData;
//     transaction.paymentQRGeneratedAt = new Date();
//     transaction.paymentReceiptPrinted = true;
//     transaction.status = "PAYMENT_QR";
//     await transaction.save();

//     // Generate receipt data
//     const receiptData = await ReceiptService.generateReceiptData(
//       transaction,
//       "PAYMENT",
//     );
//     transaction.receiptData = receiptData;
//     await transaction.save();

//     await NotificationService.sendTransactionNotification(transaction, "paid");

//     return {
//       ...paymentResult,
//       paymentQR: qrData,
//       receiptData: receiptData,
//     };
//   }

//   /**
//    * Release stock and generate release QR
//    */
//   async releaseStock(transactionId, userId, releasedItems, ip, userAgent) {
//     const transaction =
//       await Transaction.findById(transactionId).populate("items");

//     if (!transaction) {
//       throw new AppError("Transaction not found", 404);
//     }

//     if (transaction.status !== "PAYMENT_QR") {
//       throw new AppError("Transaction not ready for release", 400);
//     }

//     // Release stock via InventoryService
//     const releaseResults = [];
//     for (const release of releasedItems) {
//       const result = await InventoryService.releaseStock(
//         release.productId,
//         transaction.storeId,
//         release.quantity,
//       );
//       releaseResults.push(result);
//     }

//     const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, "0")}`;

//     // Update transaction
//     transaction.warehouseStaffId = userId;
//     transaction.releaseTimestamp = new Date();
//     transaction.warehouseStatus = "RELEASED";
//     transaction.status = "RELEASED";
//     transaction.finalInvoiceNumber = invoiceNumber;

//     // Track released items with details
//     for (const release of releasedItems) {
//       const item = transaction.items.find(
//         (i) => i.productId.toString() === release.productId,
//       );
//       if (item) {
//         transaction.itemsReleased.push({
//           productId: release.productId,
//           productName: item.name || "Product",
//           sku: item.sku || "",
//           quantityReleased: release.quantity,
//           unitPrice: item.unitPrice || 0,
//           totalPrice: (item.unitPrice || 0) * release.quantity,
//           releasedBy: userId,
//           releasedAt: new Date(),
//         });
//       }
//     }
//     await transaction.save();

//     // Generate Release QR
//     const releaseQRData = await QRService.generateQR({
//       type: "RELEASE",
//       transactionId: transactionId,
//       storeId: transaction.storeId,
//       step: "RELEASE_QR",
//       metadata: {
//         invoiceNumber: invoiceNumber,
//         itemsReleased: releaseResults.length,
//         releaseTimestamp: new Date().toISOString(),
//       },
//     });

//     transaction.releaseQR = releaseQRData;
//     transaction.releaseQRGeneratedAt = new Date();
//     transaction.status = "RELEASE_QR";
//     await transaction.save();

//     // Generate Invoice QR (final)
//     const invoiceQRData = await this._generateInvoiceQR(
//       transaction,
//       userId,
//       ip,
//       userAgent,
//     );

//     await this.auditLog(
//       userId,
//       "WAREHOUSE_STAFF",
//       "UPDATE",
//       "Transaction",
//       transaction._id,
//       transaction.storeId,
//       {
//         after: {
//           warehouseStatus: "RELEASED",
//           status: "RELEASE_QR",
//           invoiceNumber,
//         },
//         metadata: { ipAddress: ip, userAgent, releasedItems },
//       },
//     );

//     await NotificationService.sendTransactionNotification(
//       transaction,
//       "released",
//     );

//     return {
//       transaction,
//       invoiceNumber,
//       releaseQR: releaseQRData,
//       invoiceQR: invoiceQRData,
//       releaseResults,
//     };
//   }

//   /**
//    * Generate Invoice QR (Final step)
//    */
//   async _generateInvoiceQR(transaction, userId, ip, userAgent) {
//     // Generate receipt data first
//     const receiptData = await ReceiptService.generateReceiptData(
//       transaction,
//       "INVOICE",
//     );
//     transaction.receiptData = receiptData;

//     const qrData = await QRService.generateQR({
//       type: "INVOICE",
//       transactionId: transaction._id,
//       storeId: transaction.storeId,
//       step: "INVOICE_QR",
//       metadata: {
//         invoiceNumber: transaction.finalInvoiceNumber,
//         totalAmount: transaction.totalAmount,
//         itemsCount: transaction.items.length,
//         generatedAt: new Date().toISOString(),
//       },
//     });

//     transaction.invoiceQR = qrData;
//     transaction.invoiceQRGeneratedAt = new Date();
//     transaction.finalInvoicePrinted = true;
//     transaction.status = "INVOICE_QR";
//     await transaction.save();

//     await this.auditLog(
//       userId,
//       null,
//       "PRINT",
//       "Transaction",
//       transaction._id,
//       transaction.storeId,
//       {
//         after: { invoiceQR: qrData, status: "INVOICE_QR" },
//         metadata: { ipAddress: ip, userAgent },
//       },
//     );

//     await NotificationService.sendTransactionNotification(
//       transaction,
//       "invoice",
//     );

//     return qrData;
//   }

//   /**
//    * Complete transaction
//    */
//   async completeTransaction(transactionId, userId, ip, userAgent) {
//     const transaction = await Transaction.findById(transactionId);
//     if (!transaction) {
//       throw new AppError("Transaction not found", 404);
//     }

//     if (
//       transaction.status !== "INVOICE_QR" &&
//       transaction.status !== "RELEASE_QR"
//     ) {
//       throw new AppError("Transaction not ready for completion", 400);
//     }

//     transaction.status = "COMPLETED";
//     transaction.completedAt = new Date();
//     transaction.completedBy = userId;
//     await transaction.save();

//     // Generate final receipt
//     const receiptData = await ReceiptService.generateReceiptData(
//       transaction,
//       "FINAL",
//     );
//     transaction.receiptData = receiptData;
//     await transaction.save();

//     await this.auditLog(
//       userId,
//       null,
//       "UPDATE",
//       "Transaction",
//       transaction._id,
//       transaction.storeId,
//       {
//         after: { status: "COMPLETED" },
//         metadata: { ipAddress: ip, userAgent },
//       },
//     );

//     await NotificationService.sendTransactionNotification(
//       transaction,
//       "completed",
//     );

//     return {
//       transaction,
//       receiptData,
//     };
//   }

//   /**
//    * Get transaction by ID with receipt
//    */
//   async getTransactionById(id, user) {
//     const transaction = await Transaction.findById(id)
//       .populate("salesAttendantId", "firstName lastName email")
//       .populate("financeAttendantId", "firstName lastName email")
//       .populate("warehouseStaffId", "firstName lastName email")
//       .populate("items.productId")
//       .populate("itemsReleased.productId");

//     if (!transaction) {
//       throw new AppError("Transaction not found", 404);
//     }

//     if (
//       user.role !== "SUPER_ADMIN" &&
//       user.role !== "ADMIN" &&
//       transaction.storeId?.toString() !== user.storeId?.toString()
//     ) {
//       throw new AppError("Access denied", 403);
//     }

//     // Generate receipt data if not exists
//     if (!transaction.receiptData) {
//       transaction.receiptData =
//         await ReceiptService.generateReceiptData(transaction);
//       await transaction.save();
//     }

//     return transaction;
//   }

//   /**
//    * Get all QRs for a transaction
//    */
//   async getTransactionQRs(transactionId, user) {
//     const transaction = await this.getTransactionById(transactionId, user);

//     return {
//       salesQR: transaction.salesQR,
//       paymentQR: transaction.paymentQR,
//       releaseQR: transaction.releaseQR,
//       invoiceQR: transaction.invoiceQR,
//       salesQRGeneratedAt: transaction.salesQRGeneratedAt,
//       paymentQRGeneratedAt: transaction.paymentQRGeneratedAt,
//       releaseQRGeneratedAt: transaction.releaseQRGeneratedAt,
//       invoiceQRGeneratedAt: transaction.invoiceQRGeneratedAt,
//     };
//   }

//   /**
//    * Validate QR and determine next action
//    */
//   async validateQRAndGetAction(qrData, user) {
//     const { transaction, qrType, step } =
//       await QRService.validateAndGetTransaction(qrData, user);

//     let nextAction = null;
//     let nextStep = null;

//     switch (qrType) {
//       case "SALES":
//         if (transaction.status === "SALES_QR") {
//           nextAction = "PROCEED_TO_PAYMENT";
//           nextStep = "PAYMENT";
//         }
//         break;
//       case "PAYMENT":
//         if (transaction.status === "PAYMENT_QR") {
//           nextAction = "PROCEED_TO_WAREHOUSE";
//           nextStep = "RELEASE";
//         }
//         break;
//       case "RELEASE":
//         if (
//           transaction.status === "RELEASE_QR" ||
//           transaction.status === "RELEASED"
//         ) {
//           nextAction = "VIEW_INVOICE";
//           nextStep = "INVOICE";
//         }
//         break;
//       case "INVOICE":
//         if (
//           transaction.status === "INVOICE_QR" ||
//           transaction.status === "COMPLETED"
//         ) {
//           nextAction = "COMPLETE_TRANSACTION";
//           nextStep = "COMPLETE";
//         }
//         break;
//     }

//     // Generate receipt data if available
//     let receiptData = null;
//     if (transaction.receiptData) {
//       receiptData = transaction.receiptData;
//     } else if (
//       transaction.status === "COMPLETED" ||
//       transaction.status === "INVOICE_QR"
//     ) {
//       receiptData = await ReceiptService.generateReceiptData(transaction);
//       transaction.receiptData = receiptData;
//       await transaction.save();
//     }

//     return {
//       transaction,
//       qrType,
//       step,
//       nextAction,
//       nextStep,
//       receiptData,
//       isValid: true,
//     };
//   }

//   /**
//    * Get transactions with filters
//    */
//   async getTransactions(query, user) {
//     const { page = 1, limit = 20, status, startDate, endDate, storeId } = query;

//     const filter = {};

//     if (user.role !== "SUPER_ADMIN") {
//       filter.storeId = user.storeId;
//     } else if (storeId) {
//       filter.storeId = storeId;
//     }

//     if (status) filter.status = status;

//     if (startDate || endDate) {
//       filter.createdAt = {};
//       if (startDate) filter.createdAt.$gte = new Date(startDate);
//       if (endDate) filter.createdAt.$lte = new Date(endDate);
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     const [transactions, total] = await Promise.all([
//       Transaction.find(filter)
//         .populate("salesAttendantId", "firstName lastName")
//         .populate("financeAttendantId", "firstName lastName")
//         .populate("warehouseStaffId", "firstName lastName")
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(parseInt(limit)),
//       Transaction.countDocuments(filter),
//     ]);

//     return {
//       transactions,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total,
//         pages: Math.ceil(total / parseInt(limit)),
//       },
//     };
//   }
// }

// module.exports = new TransactionService();

// const Transaction = require("../models/Transaction");
// const TransactionItem = require("../models/TransactionItem");
// const Product = require("../models/Product");
// const Store = require("../models/Store");
// const Inventory = require("../models/Inventory");
// const BaseService = require("./baseService");
// const QRService = require("./qrService");
// const InventoryService = require("./inventoryService");
// const PaymentService = require("./paymentService");
// const ReceiptService = require("./receiptService");
// const NotificationService = require("./notificationService");
// const { AppError } = require("../middleware/errorHandler");

// class TransactionService extends BaseService {
//   /**
//    * Create new transaction with items
//    */
//   async createTransactionWithItems(userId, storeId, items, ip, userAgent) {
//     // Generate transaction number
//     const count = await Transaction.countDocuments({ storeId });
//     const transactionNumber = `STR-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;

//     // Create transaction
//     const transaction = new Transaction({
//       transactionNumber,
//       storeId,
//       salesAttendantId: userId,
//       salesTimestamp: new Date(),
//       status: "PENDING",
//       salesStatus: "PENDING",
//       qrStatus: {
//         salesQRScanned: false,
//         paymentQRScanned: false,
//         releaseQRScanned: false,
//         invoiceQRScanned: false
//       }
//     });

//     await transaction.save();

//     let subtotal = 0;
//     let taxTotal = 0;
//     const addedItems = [];

//     // Process each item
//     for (const item of items) {
//       const { productId, quantity } = item;

//       if (!productId || !quantity || quantity <= 0) {
//         continue;
//       }

//       const product = await Product.findById(productId);
//       if (!product) {
//         throw new AppError(`Product ${productId} not found`, 404);
//       }

//       // Check and reserve inventory
//       await InventoryService.reserveStock(productId, storeId, quantity);

//       const taxAmount = (product.unitPrice * quantity * (product.taxRate || 0)) / 100;
//       const totalPrice = product.unitPrice * quantity;

//       // Create transaction item
//       const transactionItem = new TransactionItem({
//         transactionId: transaction._id,
//         productId: product._id,
//         sku: product.sku || "",
//         name: product.name || "Item",
//         quantity: quantity,
//         unitPrice: product.unitPrice || 0,
//         totalPrice: totalPrice,
//         taxRate: product.taxRate || 0,
//         taxAmount: taxAmount,
//         warehouseLocation: product.warehouseLocation || {},
//         discountAmount: 0,
//         discountPercentage: 0,
//       });

//       await transactionItem.save();
//       transaction.items.push(transactionItem._id);

//       subtotal += totalPrice;
//       taxTotal += taxAmount;
//       addedItems.push({
//         productId: product._id,
//         name: product.name,
//         quantity,
//         totalPrice,
//       });
//     }

//     // Update transaction totals
//     transaction.subtotal = subtotal;
//     transaction.taxTotal = taxTotal;
//     transaction.totalAmount = subtotal + taxTotal;
//     await transaction.save();

//     // Log audit
//     await this.auditLog(
//       userId,
//       "SALES_ATTENDANT",
//       "CREATE",
//       "Transaction",
//       transaction._id,
//       storeId,
//       {
//         after: transaction.toObject(),
//         metadata: { ipAddress: ip, userAgent, items: addedItems },
//       },
//     );

//     // Populate transaction
//     const populatedTransaction = await Transaction.findById(transaction._id)
//       .populate({
//         path: 'items',
//         populate: {
//           path: 'productId',
//           select: 'name sku unitPrice taxRate description category brand'
//         }
//       })
//       .populate('storeId')
//       .populate('salesAttendantId', 'firstName lastName email');

//     // ============================================================
//     // STEP 1: GENERATE SALES QR CODE
//     // ============================================================
//     const salesQRResult = await this._generateSalesQR(populatedTransaction, userId, ip, userAgent);

//     return {
//       ...populatedTransaction.toObject(),
//       salesQR: salesQRResult.salesQR,
//       salesQRGeneratedAt: salesQRResult.salesQRGeneratedAt,
//       status: salesQRResult.status,
//       qrStatus: salesQRResult.qrStatus,
//     };
//   }

//   /**
//    * Generate Sales QR (Step 1)
//    */
//   async _generateSalesQR(transaction, userId, ip, userAgent) {
//     if (transaction.items.length === 0) {
//       throw new AppError("Transaction has no items", 400);
//     }

//     const qrData = await QRService.generateQR({
//       type: "SALES",
//       transactionId: transaction._id,
//       storeId: transaction.storeId,
//       step: "SALES_QR",
//       metadata: {
//         itemCount: transaction.items.length,
//         totalAmount: transaction.totalAmount,
//         transactionNumber: transaction.transactionNumber
//       },
//     });

//     transaction.salesQR = qrData;
//     transaction.salesQRGeneratedAt = new Date();
//     transaction.salesReceiptPrinted = true;
//     transaction.status = "SALES_QR";
//     transaction.salesStatus = "SALES_QR_PRINTED";
//     transaction.qrStatus.salesQRScanned = false;
//     await transaction.save();

//     // Generate receipt data for sales
//     const receiptData = await ReceiptService.generateReceiptData(transaction, "SALES");
//     transaction.receiptData = receiptData;
//     await transaction.save();

//     await this.auditLog(
//       userId,
//       "SALES_ATTENDANT",
//       "PRINT",
//       "Transaction",
//       transaction._id,
//       transaction.storeId,
//       {
//         after: { salesQR: qrData, status: "SALES_QR" },
//         metadata: { ipAddress: ip, userAgent },
//       },
//     );

//     await NotificationService.sendTransactionNotification(transaction, "sales_qr");

//     return {
//       transaction,
//       salesQR: qrData,
//       salesQRGeneratedAt: transaction.salesQRGeneratedAt,
//       status: transaction.status,
//       qrStatus: transaction.qrStatus,
//     };
//   }

//   /**
//  * Generate Sales QR - with minimal payload
//  */
// async _generateSalesQR(transaction, userId, ip, userAgent) {
//   if (transaction.items.length === 0) {
//     throw new AppError("Transaction has no items", 400);
//   }

//   const qrData = await QRService.generateQR({
//     type: "SALES",
//     transactionId: transaction._id,
//     storeId: transaction.storeId,
//     step: "SALES_QR",
//     metadata: {
//       itemCount: Math.min(transaction.items.length, 99), // Limit to 99
//       totalAmount: Math.round(transaction.totalAmount * 100) / 100,
//       transactionNumber: transaction.transactionNumber,
//     },
//   });

//   transaction.salesQR = qrData;
//   transaction.salesQRGeneratedAt = new Date();
//   transaction.salesReceiptPrinted = true;
//   transaction.status = "SALES_QR";
//   transaction.salesStatus = "SALES_QR_PRINTED";
//   transaction.qrStatus.salesQRScanned = false;
//   await transaction.save();

//   // Generate receipt data for sales (stored in DB, not in QR)
//   const receiptData = await ReceiptService.generateReceiptData(transaction, "SALES");
//   transaction.receiptData = receiptData;
//   await transaction.save();

//   await this.auditLog(
//     userId,
//     "SALES_ATTENDANT",
//     "PRINT",
//     "Transaction",
//     transaction._id,
//     transaction.storeId,
//     {
//       after: { salesQR: qrData, status: "SALES_QR" },
//       metadata: { ipAddress: ip, userAgent },
//     },
//   );

//   await NotificationService.sendTransactionNotification(transaction, "sales_qr");

//   return {
//     transaction,
//     salesQR: qrData,
//     salesQRGeneratedAt: transaction.salesQRGeneratedAt,
//     status: transaction.status,
//     qrStatus: transaction.qrStatus,
//   };
// }

//   /**
//    * Scan Sales QR (Step 1) - Show transaction details for payment
//    */
//   async scanSalesQR(qrData, userId, ip, userAgent) {
//     const { transaction, qrType, step } = await QRService.validateAndGetTransaction(qrData);

//     if (qrType !== "SALES") {
//       throw new AppError("Invalid QR type for sales scan", 400);
//     }

//     if (transaction.status !== "SALES_QR") {
//       throw new AppError(`Transaction is not ready for payment. Current status: ${transaction.status}`, 400);
//     }

//     // Mark QR as scanned
//     transaction.qrStatus.salesQRScanned = true;
//     transaction.qrStatus.salesQRScannedAt = new Date();
//     transaction.qrStatus.salesQRScannedBy = userId;
//     await transaction.save();

//     // Get full transaction details with items
//     const fullTransaction = await Transaction.findById(transaction._id)
//       .populate({
//         path: 'items',
//         populate: {
//           path: 'productId',
//           select: 'name sku unitPrice taxRate description category brand'
//         }
//       })
//       .populate('storeId')
//       .populate('salesAttendantId', 'firstName lastName email');

//     // Generate receipt data
//     const receiptData = await ReceiptService.generateReceiptData(fullTransaction, "SALES");

//     return {
//       transaction: fullTransaction,
//       receiptData,
//       qrType,
//       step,
//       nextAction: "PROCEED_TO_PAYMENT",
//       isValid: true,
//       scannedAt: transaction.qrStatus.salesQRScannedAt,
//     };
//   }

//   /**
//    * Process Payment and generate Payment QR (Step 2)
//    */
//   async processPayment(transactionId, userId, paymentMethod, amountPaid, paymentDetails, ip, userAgent) {
//     const transaction = await Transaction.findById(transactionId)
//       .populate('items')
//       .populate('storeId');

//     if (!transaction) {
//       throw new AppError("Transaction not found", 404);
//     }

//     if (transaction.status !== "SALES_QR") {
//       throw new AppError(`Transaction not ready for payment. Current status: ${transaction.status}`, 400);
//     }

//     const totalAmount = transaction.totalAmount;
//     const change = amountPaid - totalAmount;

//     if (change < 0) {
//       throw new AppError("Insufficient payment amount", 400);
//     }

//     // Process payment via PaymentService
//     const paymentResult = await PaymentService.processPayment(
//       transactionId,
//       userId,
//       {
//         method: paymentMethod,
//         amountPaid,
//         details: paymentDetails,
//         change,
//       },
//       ip,
//       userAgent,
//     );

//     // Update transaction
//     transaction.paymentMethod = paymentMethod;
//     transaction.paymentAmount = totalAmount;
//     transaction.amountPaid = amountPaid;
//     transaction.changeAmount = change;
//     transaction.paymentTimestamp = new Date();
//     transaction.financeAttendantId = userId;
//     transaction.paymentStatus = "PAID";
//     transaction.status = "PAID";
//     await transaction.save();

//     // ============================================================
//     // STEP 2: GENERATE PAYMENT QR CODE
//     // ============================================================
//     const paymentQRData = await QRService.generateQR({
//       type: "PAYMENT",
//       transactionId: transaction._id,
//       storeId: transaction.storeId,
//       step: "PAYMENT_QR",
//       metadata: {
//         paymentMethod: paymentMethod,
//         amountPaid: amountPaid,
//         totalAmount: totalAmount,
//         changeAmount: change,
//         transactionNumber: transaction.transactionNumber
//       },
//     });

//     transaction.paymentQR = paymentQRData;
//     transaction.paymentQRGeneratedAt = new Date();
//     transaction.paymentReceiptPrinted = true;
//     transaction.status = "PAYMENT_QR";
//     transaction.qrStatus.paymentQRScanned = false;
//     await transaction.save();

//     // Generate receipt data for payment
//     const receiptData = await ReceiptService.generateReceiptData(transaction, "PAYMENT");
//     transaction.receiptData = receiptData;
//     await transaction.save();

//     await this.auditLog(
//       userId,
//       "FINANCE_CASHIER",
//       "UPDATE",
//       "Transaction",
//       transaction._id,
//       transaction.storeId,
//       {
//         after: {
//           paymentStatus: "PAID",
//           paymentMethod: paymentMethod,
//           paymentAmount: totalAmount,
//           status: "PAYMENT_QR",
//           paymentQR: paymentQRData,
//         },
//         metadata: { ipAddress: ip, userAgent },
//       },
//     );

//     await NotificationService.sendTransactionNotification(transaction, "paid");

//     return {
//       transaction,
//       payment: paymentResult.payment,
//       paymentQR: paymentQRData,
//       receiptData,
//       change,
//     };
//   }

//   /**
//  * Generate Payment QR - with minimal payload
//  */
// async _generatePaymentQR(transaction, userId, ip, userAgent) {
//   const qrData = await QRService.generateQR({
//     type: "PAYMENT",
//     transactionId: transaction._id,
//     storeId: transaction.storeId,
//     step: "PAYMENT_QR",
//     metadata: {
//       paymentMethod: transaction.paymentMethod,
//       totalAmount: Math.round(transaction.totalAmount * 100) / 100,
//       changeAmount: Math.round(transaction.changeAmount * 100) / 100,
//       transactionNumber: transaction.transactionNumber,
//     },
//   });

//   transaction.paymentQR = qrData;
//   transaction.paymentQRGeneratedAt = new Date();
//   transaction.paymentReceiptPrinted = true;
//   transaction.status = "PAYMENT_QR";
//   transaction.qrStatus.paymentQRScanned = false;
//   await transaction.save();

//   return qrData;
// }

//   /**
//    * Scan Payment QR (Step 2) - Show transaction details for warehouse release
//    */
//   async scanPaymentQR(qrData, userId, ip, userAgent) {
//     const { transaction, qrType, step } = await QRService.validateAndGetTransaction(qrData);

//     if (qrType !== "PAYMENT") {
//       throw new AppError("Invalid QR type for payment scan", 400);
//     }

//     if (transaction.status !== "PAYMENT_QR") {
//       throw new AppError(`Transaction is not ready for warehouse release. Current status: ${transaction.status}`, 400);
//     }

//     // Mark QR as scanned
//     transaction.qrStatus.paymentQRScanned = true;
//     transaction.qrStatus.paymentQRScannedAt = new Date();
//     transaction.qrStatus.paymentQRScannedBy = userId;
//     await transaction.save();

//     // Get full transaction details with items
//     const fullTransaction = await Transaction.findById(transaction._id)
//       .populate({
//         path: 'items',
//         populate: {
//           path: 'productId',
//           select: 'name sku unitPrice taxRate description category brand warehouseLocation'
//         }
//       })
//       .populate('storeId')
//       .populate('salesAttendantId', 'firstName lastName email')
//       .populate('financeAttendantId', 'firstName lastName email');

//     // Get inventory status for each item
//     const itemsWithInventory = await Promise.all(
//       fullTransaction.items.map(async (item) => {
//         const inventory = await Inventory.findOne({
//           productId: item.productId._id,
//           storeId: fullTransaction.storeId
//         });

//         return {
//           ...item.toObject(),
//           inventory: inventory ? {
//             available: inventory.quantity,
//             reserved: inventory.reservedQuantity,
//             reorderPoint: inventory.reorderPoint,
//           } : {
//             available: 0,
//             reserved: 0,
//             reorderPoint: 0,
//           }
//         };
//       })
//     );

//     // Generate receipt data for warehouse
//     const receiptData = await ReceiptService.generateReceiptData(fullTransaction, "PAYMENT");

//     return {
//       transaction: {
//         ...fullTransaction.toObject(),
//         items: itemsWithInventory,
//       },
//       receiptData,
//       qrType,
//       step,
//       nextAction: "PROCEED_TO_WAREHOUSE",
//       isValid: true,
//       scannedAt: transaction.qrStatus.paymentQRScannedAt,
//     };
//   }

//   /**
//    * Release Stock and generate Release QR (Step 3)
//    */
//   async releaseStock(transactionId, userId, releasedItems, ip, userAgent) {
//     const transaction = await Transaction.findById(transactionId)
//       .populate('items')
//       .populate('storeId');

//     if (!transaction) {
//       throw new AppError("Transaction not found", 404);
//     }

//     if (transaction.status !== "PAYMENT_QR") {
//       throw new AppError(`Transaction not ready for release. Current status: ${transaction.status}`, 400);
//     }

//     // Validate released items
//     const releaseResults = [];
//     const releaseErrors = [];

//     for (const release of releasedItems) {
//       const { productId, quantity } = release;

//       if (!productId || !quantity || quantity <= 0) {
//         releaseErrors.push({ productId, error: "Invalid quantity" });
//         continue;
//       }

//       try {
//         const result = await InventoryService.releaseStock(
//           productId,
//           transaction.storeId,
//           quantity
//         );

//         // Find the corresponding item in transaction
//         const item = transaction.items.find(
//           i => i.productId._id.toString() === productId
//         );

//         if (item) {
//           releaseResults.push({
//             productId,
//             productName: item.name || "Product",
//             sku: item.sku || "",
//             quantityReleased: quantity,
//             unitPrice: item.unitPrice || 0,
//             totalPrice: (item.unitPrice || 0) * quantity,
//             releasedBy: userId,
//             releasedAt: new Date(),
//             inventoryId: result.inventoryId,
//           });
//         } else {
//           releaseErrors.push({ productId, error: "Product not found in transaction" });
//         }
//       } catch (error) {
//         releaseErrors.push({ productId, error: error.message });
//       }
//     }

//     if (releaseResults.length === 0) {
//       throw new AppError("No items were released successfully", 400);
//     }

//     // Generate invoice number
//     const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, "0")}`;

//     // Update transaction
//     transaction.warehouseStaffId = userId;
//     transaction.releaseTimestamp = new Date();
//     transaction.warehouseStatus = "RELEASED";
//     transaction.finalInvoiceNumber = invoiceNumber;
//     transaction.itemsReleased = releaseResults;
//     transaction.status = "RELEASED";
//     await transaction.save();

//     // ============================================================
//     // STEP 3: GENERATE RELEASE QR CODE
//     // ============================================================
//     const releaseQRData = await QRService.generateQR({
//       type: "RELEASE",
//       transactionId: transaction._id,
//       storeId: transaction.storeId,
//       step: "RELEASE_QR",
//       metadata: {
//         invoiceNumber: invoiceNumber,
//         itemsReleased: releaseResults.length,
//         releaseTimestamp: new Date().toISOString(),
//         transactionNumber: transaction.transactionNumber,
//       },
//     });

//     transaction.releaseQR = releaseQRData;
//     transaction.releaseQRGeneratedAt = new Date();
//     transaction.status = "RELEASE_QR";
//     transaction.qrStatus.releaseQRScanned = false;
//     await transaction.save();

//     // Generate receipt data for release
//     const receiptData = await ReceiptService.generateReceiptData(transaction, "RELEASE");
//     transaction.receiptData = receiptData;
//     await transaction.save();

//     await this.auditLog(
//       userId,
//       "WAREHOUSE_STAFF",
//       "UPDATE",
//       "Transaction",
//       transaction._id,
//       transaction.storeId,
//       {
//         after: {
//           warehouseStatus: "RELEASED",
//           status: "RELEASE_QR",
//           invoiceNumber,
//           itemsReleased: releaseResults,
//           releaseQR: releaseQRData,
//         },
//         metadata: { ipAddress: ip, userAgent, releasedItems },
//       },
//     );

//     await NotificationService.sendTransactionNotification(transaction, "released");

//     return {
//       transaction,
//       invoiceNumber,
//       releaseQR: releaseQRData,
//       releaseResults,
//       releaseErrors,
//       receiptData,
//     };
//   }

// /**
//  * Generate Release QR - with minimal payload
//  */
// async _generateReleaseQR(transaction, userId, ip, userAgent) {
//   const qrData = await QRService.generateQR({
//     type: "RELEASE",
//     transactionId: transaction._id,
//     storeId: transaction.storeId,
//     step: "RELEASE_QR",
//     metadata: {
//       invoiceNumber: transaction.finalInvoiceNumber,
//       itemsReleased: Math.min(transaction.itemsReleased.length, 99),
//       totalAmount: Math.round(transaction.totalAmount * 100) / 100,
//       transactionNumber: transaction.transactionNumber,
//     },
//   });

//   transaction.releaseQR = qrData;
//   transaction.releaseQRGeneratedAt = new Date();
//   transaction.status = "RELEASE_QR";
//   transaction.qrStatus.releaseQRScanned = false;
//   await transaction.save();

//   return qrData;
// }

//   /**
//    * Scan Release QR (Step 3) - Show transaction details for invoice
//    */
//   async scanReleaseQR(qrData, userId, ip, userAgent) {
//     const { transaction, qrType, step } = await QRService.validateAndGetTransaction(qrData);

//     if (qrType !== "RELEASE") {
//       throw new AppError("Invalid QR type for release scan", 400);
//     }

//     if (transaction.status !== "RELEASE_QR" && transaction.status !== "RELEASED") {
//       throw new AppError(`Transaction is not ready for invoice. Current status: ${transaction.status}`, 400);
//     }

//     // Mark QR as scanned
//     transaction.qrStatus.releaseQRScanned = true;
//     transaction.qrStatus.releaseQRScannedAt = new Date();
//     transaction.qrStatus.releaseQRScannedBy = userId;
//     await transaction.save();

//     // Get full transaction details
//     const fullTransaction = await Transaction.findById(transaction._id)
//       .populate({
//         path: 'items',
//         populate: {
//           path: 'productId',
//           select: 'name sku unitPrice taxRate description category brand'
//         }
//       })
//       .populate('itemsReleased.productId')
//       .populate('storeId')
//       .populate('salesAttendantId', 'firstName lastName email')
//       .populate('financeAttendantId', 'firstName lastName email')
//       .populate('warehouseStaffId', 'firstName lastName email');

//     // Generate invoice receipt data
//     const receiptData = await ReceiptService.generateReceiptData(fullTransaction, "INVOICE");

//     // Generate Invoice QR (Step 4)
//     const invoiceQRData = await this._generateInvoiceQR(fullTransaction, userId, ip, userAgent);

//     return {
//       transaction: fullTransaction,
//       receiptData,
//       invoiceQR: invoiceQRData,
//       qrType,
//       step,
//       nextAction: "PROCEED_TO_INVOICE",
//       isValid: true,
//       scannedAt: transaction.qrStatus.releaseQRScannedAt,
//     };
//   }
// /**
//  * Generate Invoice QR - with minimal payload
//  */
// async _generateInvoiceQR(transaction, userId, ip, userAgent) {
//   const qrData = await QRService.generateQR({
//     type: "INVOICE",
//     transactionId: transaction._id,
//     storeId: transaction.storeId,
//     step: "INVOICE_QR",
//     metadata: {
//       invoiceNumber: transaction.finalInvoiceNumber,
//       totalAmount: Math.round(transaction.totalAmount * 100) / 100,
//       transactionNumber: transaction.transactionNumber,
//     },
//   });

//   transaction.invoiceQR = qrData;
//   transaction.invoiceQRGeneratedAt = new Date();
//   transaction.finalInvoicePrinted = true;
//   transaction.status = "INVOICE_QR";
//   transaction.qrStatus.invoiceQRScanned = false;
//   await transaction.save();

//   return qrData;
// }
//   /**
//    * Generate Invoice QR (Step 4)
//    */
//   async _generateInvoiceQR(transaction, userId, ip, userAgent) {
//     const invoiceQRData = await QRService.generateQR({
//       type: "INVOICE",
//       transactionId: transaction._id,
//       storeId: transaction.storeId,
//       step: "INVOICE_QR",
//       metadata: {
//         invoiceNumber: transaction.finalInvoiceNumber,
//         totalAmount: transaction.totalAmount,
//         itemsCount: transaction.items.length,
//         generatedAt: new Date().toISOString(),
//         transactionNumber: transaction.transactionNumber,
//       },
//     });

//     transaction.invoiceQR = invoiceQRData;
//     transaction.invoiceQRGeneratedAt = new Date();
//     transaction.finalInvoicePrinted = true;
//     transaction.status = "INVOICE_QR";
//     transaction.qrStatus.invoiceQRScanned = false;
//     await transaction.save();

//     // Generate final receipt data
//     const receiptData = await ReceiptService.generateReceiptData(transaction, "FINAL");
//     transaction.receiptData = receiptData;
//     await transaction.save();

//     await this.auditLog(
//       userId,
//       "WAREHOUSE_STAFF",
//       "PRINT",
//       "Transaction",
//       transaction._id,
//       transaction.storeId,
//       {
//         after: { invoiceQR: invoiceQRData, status: "INVOICE_QR" },
//         metadata: { ipAddress: ip, userAgent },
//       },
//     );

//     await NotificationService.sendTransactionNotification(transaction, "invoice");

//     return invoiceQRData;
//   }

//   /**
//    * Scan Invoice QR (Step 4) - Complete transaction
//    */
//   async scanInvoiceQR(qrData, userId, ip, userAgent) {
//     const { transaction, qrType, step } = await QRService.validateAndGetTransaction(qrData);

//     if (qrType !== "INVOICE") {
//       throw new AppError("Invalid QR type for invoice scan", 400);
//     }

//     if (transaction.status !== "INVOICE_QR") {
//       throw new AppError(`Transaction is not ready for completion. Current status: ${transaction.status}`, 400);
//     }

//     // Mark QR as scanned
//     transaction.qrStatus.invoiceQRScanned = true;
//     transaction.qrStatus.invoiceQRScannedAt = new Date();
//     transaction.qrStatus.invoiceQRScannedBy = userId;
//     await transaction.save();

//     // Complete the transaction
//     transaction.status = "COMPLETED";
//     transaction.completedAt = new Date();
//     transaction.completedBy = userId;
//     await transaction.save();

//     // Get full transaction details
//     const fullTransaction = await Transaction.findById(transaction._id)
//       .populate({
//         path: 'items',
//         populate: {
//           path: 'productId',
//           select: 'name sku unitPrice taxRate description category brand'
//         }
//       })
//       .populate('itemsReleased.productId')
//       .populate('storeId')
//       .populate('salesAttendantId', 'firstName lastName email')
//       .populate('financeAttendantId', 'firstName lastName email')
//       .populate('warehouseStaffId', 'firstName lastName email');

//     // Generate final receipt data
//     const receiptData = await ReceiptService.generateReceiptData(fullTransaction, "FINAL");
//     fullTransaction.receiptData = receiptData;
//     await fullTransaction.save();

//     await this.auditLog(
//       userId,
//       "WAREHOUSE_STAFF",
//       "UPDATE",
//       "Transaction",
//       transaction._id,
//       transaction.storeId,
//       {
//         after: { status: "COMPLETED" },
//         metadata: { ipAddress: ip, userAgent },
//       },
//     );

//     await NotificationService.sendTransactionNotification(transaction, "completed");

//     return {
//       transaction: fullTransaction,
//       receiptData,
//       qrType,
//       step,
//       nextAction: "TRANSACTION_COMPLETE",
//       isValid: true,
//       scannedAt: transaction.qrStatus.invoiceQRScannedAt,
//     };
//   }

//   /**
//    * Validate any QR and determine next action
//    */
//   async validateQRAndGetAction(qrData, user) {
//     const validation = await QRService.validateQR(qrData);

//     if (!validation.valid) {
//       return {
//         isValid: false,
//         error: validation.error || "Invalid QR code",
//       };
//     }

//     const { transaction, qrType, step } = validation;

//     // Check if user has access
//     if (user.role !== "SUPER_ADMIN" &&
//         user.role !== "ADMIN" &&
//         transaction.storeId?.toString() !== user.storeId?.toString()) {
//       return {
//         isValid: false,
//         error: "Access denied to this transaction",
//       };
//     }

//     let nextAction = null;
//     let nextStep = null;
//     let receiptData = null;

//     switch (qrType) {
//       case "SALES":
//         if (transaction.status === "SALES_QR") {
//           nextAction = "PROCEED_TO_PAYMENT";
//           nextStep = "PAYMENT";
//         }
//         break;
//       case "PAYMENT":
//         if (transaction.status === "PAYMENT_QR") {
//           nextAction = "PROCEED_TO_WAREHOUSE";
//           nextStep = "RELEASE";
//         }
//         break;
//       case "RELEASE":
//         if (transaction.status === "RELEASE_QR") {
//           nextAction = "PROCEED_TO_INVOICE";
//           nextStep = "INVOICE";
//         }
//         break;
//       case "INVOICE":
//         if (transaction.status === "INVOICE_QR") {
//           nextAction = "COMPLETE_TRANSACTION";
//           nextStep = "COMPLETE";
//         }
//         break;
//     }

//     // Get receipt data if available
//     if (transaction.receiptData) {
//       receiptData = transaction.receiptData;
//     }

//     // Get full transaction details
//     const fullTransaction = await Transaction.findById(transaction._id)
//       .populate({
//         path: 'items',
//         populate: {
//           path: 'productId',
//           select: 'name sku unitPrice taxRate description category brand'
//         }
//       })
//       .populate('itemsReleased.productId')
//       .populate('storeId')
//       .populate('salesAttendantId', 'firstName lastName email')
//       .populate('financeAttendantId', 'firstName lastName email')
//       .populate('warehouseStaffId', 'firstName lastName email');

//     return {
//       transaction: fullTransaction,
//       qrType,
//       step,
//       nextAction,
//       nextStep,
//       receiptData,
//       isValid: true,
//       status: transaction.status,
//       qrStatus: transaction.qrStatus,
//     };
//   }

//   /**
//  * Validate QR and determine next action
//  */
// async validateQRAndGetAction(qrData, user) {
//   const validation = await QRService.validateQR(qrData);

//   if (!validation.valid) {
//     return {
//       isValid: false,
//       error: validation.error || "Invalid QR code",
//     };
//   }

//   const { transaction, qrType, step } = validation;

//   // Check if user has access
//   if (user.role !== "SUPER_ADMIN" &&
//       user.role !== "ADMIN" &&
//       transaction.storeId?.toString() !== user.storeId?.toString()) {
//     return {
//       isValid: false,
//       error: "Access denied to this transaction",
//     };
//   }

//   let nextAction = null;
//   let nextStep = null;
//   let receiptData = null;

//   switch (qrType) {
//     case "SALES":
//       if (transaction.status === "SALES_QR") {
//         nextAction = "PROCEED_TO_PAYMENT";
//         nextStep = "PAYMENT";
//       }
//       break;
//     case "PAYMENT":
//       if (transaction.status === "PAYMENT_QR") {
//         nextAction = "PROCEED_TO_WAREHOUSE";
//         nextStep = "RELEASE";
//       }
//       break;
//     case "RELEASE":
//       if (transaction.status === "RELEASE_QR") {
//         nextAction = "PROCEED_TO_INVOICE";
//         nextStep = "INVOICE";
//       }
//       break;
//     case "INVOICE":
//       if (transaction.status === "INVOICE_QR") {
//         nextAction = "COMPLETE_TRANSACTION";
//         nextStep = "COMPLETE";
//       }
//       break;
//   }

//   // Get receipt data if available
//   if (transaction.receiptData) {
//     receiptData = transaction.receiptData;
//   }

//   // Get full transaction details
//   const fullTransaction = await Transaction.findById(transaction._id)
//     .populate({
//       path: 'items',
//       populate: {
//         path: 'productId',
//         select: 'name sku unitPrice taxRate'
//       }
//     })
//     .populate('storeId')
//     .populate('salesAttendantId', 'firstName lastName email')
//     .populate('financeAttendantId', 'firstName lastName email')
//     .populate('warehouseStaffId', 'firstName lastName email');

//   return {
//     transaction: fullTransaction,
//     qrType,
//     step,
//     nextAction,
//     nextStep,
//     receiptData,
//     isValid: true,
//     status: transaction.status,
//     qrStatus: transaction.qrStatus,
//   };
// }

//   /**
//    * Get all QR codes for a transaction
//    */
//   async getTransactionQRs(transactionId, user) {
//     const transaction = await this.getTransactionById(transactionId, user);

//     return {
//       salesQR: transaction.salesQR,
//       paymentQR: transaction.paymentQR,
//       releaseQR: transaction.releaseQR,
//       invoiceQR: transaction.invoiceQR,
//       salesQRGeneratedAt: transaction.salesQRGeneratedAt,
//       paymentQRGeneratedAt: transaction.paymentQRGeneratedAt,
//       releaseQRGeneratedAt: transaction.releaseQRGeneratedAt,
//       invoiceQRGeneratedAt: transaction.invoiceQRGeneratedAt,
//       qrStatus: transaction.qrStatus,
//       status: transaction.status,
//     };
//   }

//   /**
//    * Get transaction by ID with full details
//    */
//   async getTransactionById(id, user) {
//     const transaction = await Transaction.findById(id)
//       .populate("salesAttendantId", "firstName lastName email")
//       .populate("financeAttendantId", "firstName lastName email")
//       .populate("warehouseStaffId", "firstName lastName email")
//       .populate({
//         path: 'items',
//         populate: {
//           path: 'productId',
//           select: 'name sku unitPrice taxRate description category brand'
//         }
//       })
//       .populate("itemsReleased.productId")
//       .populate("itemsReleased.releasedBy", "firstName lastName")
//       .populate("storeId");

//     if (!transaction) {
//       throw new AppError("Transaction not found", 404);
//     }

//     if (user.role !== "SUPER_ADMIN" &&
//         user.role !== "ADMIN" &&
//         transaction.storeId?.toString() !== user.storeId?.toString()) {
//       throw new AppError("Access denied", 403);
//     }

//     return transaction;
//   }

//   /**
//    * Get transactions with filters
//    */
//   async getTransactions(query, user) {
//     const { page = 1, limit = 20, status, startDate, endDate, storeId } = query;

//     const filter = {};

//     if (user.role !== "SUPER_ADMIN") {
//       filter.storeId = user.storeId;
//     } else if (storeId) {
//       filter.storeId = storeId;
//     }

//     if (status) filter.status = status;

//     if (startDate || endDate) {
//       filter.createdAt = {};
//       if (startDate) filter.createdAt.$gte = new Date(startDate);
//       if (endDate) filter.createdAt.$lte = new Date(endDate);
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     const [transactions, total] = await Promise.all([
//       Transaction.find(filter)
//         .populate("salesAttendantId", "firstName lastName")
//         .populate("financeAttendantId", "firstName lastName")
//         .populate("warehouseStaffId", "firstName lastName")
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(parseInt(limit)),
//       Transaction.countDocuments(filter),
//     ]);

//     return {
//       transactions,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total,
//         pages: Math.ceil(total / parseInt(limit)),
//       },
//     };
//   }

//   /**
//    * Get transaction by QR code (for scanning)
//    */
//   async getTransactionByQR(qrData) {
//     const validation = await QRService.validateQR(qrData);

//     if (!validation.valid) {
//       throw new AppError(validation.error || "Invalid QR code", 400);
//     }

//     const transaction = await Transaction.findById(validation.data.transactionId)
//       .populate({
//         path: 'items',
//         populate: {
//           path: 'productId',
//           select: 'name sku unitPrice taxRate description category brand'
//         }
//       })
//       .populate('storeId')
//       .populate('salesAttendantId', 'firstName lastName email')
//       .populate('financeAttendantId', 'firstName lastName email')
//       .populate('warehouseStaffId', 'firstName lastName email');

//     if (!transaction) {
//       throw new AppError("Transaction not found", 404);
//     }

//     return {
//       transaction,
//       qrType: validation.data.type,
//       step: validation.data.step,
//       metadata: validation.data.metadata,
//     };
//   }
// }

// module.exports = new TransactionService();

const Transaction = require("../models/Transaction");
const TransactionItem = require("../models/TransactionItem");
const Product = require("../models/Product");
const Store = require("../models/Store");
const Inventory = require("../models/Inventory");
const BaseService = require("./baseService");
const QRService = require("./qrService");
const InventoryService = require("./inventoryService");
const PaymentService = require("./paymentService");
const ReceiptService = require("./receiptService");
const NotificationService = require("./notificationService");
const { AppError } = require("../middleware/errorHandler");

class TransactionService extends BaseService {
  // ============================================================
  // TRANSACTION CREATION
  // ============================================================

  /**
   * Create new transaction with items - generates Sales QR
   */
  async createTransactionWithItems(userId, storeId, items, ip, userAgent) {
    // Generate transaction number
    const count = await Transaction.countDocuments({ storeId });
    const transactionNumber = `STR-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;

    // Create transaction
    const transaction = new Transaction({
      transactionNumber,
      storeId,
      salesAttendantId: userId,
      salesTimestamp: new Date(),
      status: "PENDING",
      salesStatus: "PENDING",
      qrStatus: {
        salesQRScanned: false,
        paymentQRScanned: false,
        releaseQRScanned: false,
        invoiceQRScanned: false,
      },
    });

    await transaction.save();

    // Process items
    const { subtotal, taxTotal, addedItems } =
      await this.processTransactionItems(transaction, items, storeId);

    // Update transaction totals
    transaction.subtotal = subtotal;
    transaction.taxTotal = taxTotal;
    transaction.totalAmount = subtotal + taxTotal;
    await transaction.save();

    // Log audit
    await this.auditLog(
      userId,
      "SALES_ATTENDANT",
      "CREATE",
      "Transaction",
      transaction._id,
      storeId,
      {
        after: transaction.toObject(),
        metadata: { ipAddress: ip, userAgent, items: addedItems },
      },
    );

    // Populate transaction
    const populatedTransaction = await this.populateTransaction(
      transaction._id,
    );

    // Generate Sales QR
    const salesQRResult = await this.generateSalesQR(
      populatedTransaction,
      userId,
      ip,
      userAgent,
    );

    return {
      ...populatedTransaction.toObject(),
      salesQR: salesQRResult.salesQR,
      salesQRGeneratedAt: salesQRResult.salesQRGeneratedAt,
      status: salesQRResult.status,
      qrStatus: salesQRResult.qrStatus,
    };
  }

  /**
   * Process transaction items
   */
  async processTransactionItems(transaction, items, storeId) {
    let subtotal = 0;
    let taxTotal = 0;
    const addedItems = [];

    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || !quantity || quantity <= 0) continue;

      const product = await Product.findById(productId);
      if (!product) {
        throw new AppError(`Product ${productId} not found`, 404);
      }

      // Reserve inventory
      await InventoryService.reserveStock(productId, storeId, quantity);

      const taxAmount =
        (product.unitPrice * quantity * (product.taxRate || 0)) / 100;
      const totalPrice = product.unitPrice * quantity;

      // Create transaction item
      // const transactionItem = new TransactionItem({
      //   transactionId: transaction._id,
      //   productId: product._id,
      //   sku: product.sku || "",
      //   name: product.name || "Item",
      //   quantity: quantity,
      //   unitPrice: product.unitPrice || 0,
      //   totalPrice: totalPrice,
      //   taxRate: product.taxRate || 0,
      //   taxAmount: taxAmount,
      //   warehouseLocation: product.warehouseLocation || {},
      //   discountAmount: 0,
      //   discountPercentage: 0,
      // });

      const transactionItem = new TransactionItem({
        transactionId: transaction._id,
        productId: product._id,

        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category,
        subCategory: product.subCategory,
        brand: product.brand,
        barcode: product.barcode,
        imageUrl: product.imageUrl,
        unitOfMeasure: product.unitOfMeasure,

        quantity,
        unitPrice: product.unitPrice,
        totalPrice,
        taxRate: product.taxRate,
        taxAmount,
        warehouseLocation: product.warehouseLocation,
      });

      await transactionItem.save();
      transaction.items.push(transactionItem._id);

      subtotal += totalPrice;
      taxTotal += taxAmount;
      addedItems.push({
        productId: product._id,
        name: product.name,
        quantity,
        totalPrice,
      });
    }

    return { subtotal, taxTotal, addedItems };
  }

  // ============================================================
  // QR GENERATION - MINIMAL PAYLOAD
  // ============================================================

  /**
   * Generate Sales QR (Step 1)
   */
  async generateSalesQR(transaction, userId, ip, userAgent) {
    if (transaction.items.length === 0) {
      throw new AppError("Transaction has no items", 400);
    }

    const qrData = await QRService.generateQR({
      type: "SALES",
      transactionId: transaction._id,
    });

    transaction.salesQR = qrData;
    transaction.salesQRGeneratedAt = new Date();
    transaction.salesReceiptPrinted = true;
    transaction.status = "SALES_QR";
    transaction.salesStatus = "SALES_QR_PRINTED";
    transaction.qrStatus.salesQRScanned = false;
    await transaction.save();

    // Generate receipt data
    const receiptData = await ReceiptService.generateReceiptData(
      transaction,
      "SALES",
    );
    transaction.receiptData = receiptData;
    await transaction.save();

    await this.auditLog(
      userId,
      "SALES_ATTENDANT",
      "PRINT",
      "Transaction",
      transaction._id,
      transaction.storeId,
      {
        after: { salesQR: qrData, status: "SALES_QR" },
        metadata: { ipAddress: ip, userAgent },
      },
    );

    await NotificationService.sendTransactionNotification(
      transaction,
      "sales_qr",
    );

    return {
      transaction,
      salesQR: qrData,
      salesQRGeneratedAt: transaction.salesQRGeneratedAt,
      status: transaction.status,
      qrStatus: transaction.qrStatus,
    };
  }

  /**
   * Generate Payment QR (Step 2)
   */
  async generatePaymentQR(transaction, userId, ip, userAgent) {
    const qrData = await QRService.generateQR({
      type: "PAYMENT",
      transactionId: transaction._id,
    });

    transaction.paymentQR = qrData;
    transaction.paymentQRGeneratedAt = new Date();
    transaction.paymentReceiptPrinted = true;
    transaction.status = "PAYMENT_QR";
    transaction.qrStatus.paymentQRScanned = false;
    await transaction.save();

    return qrData;
  }

  /**
   * Generate Release QR (Step 3)
   */
  async generateReleaseQR(transaction, userId, ip, userAgent) {
    const qrData = await QRService.generateQR({
      type: "RELEASE",
      transactionId: transaction._id,
    });

    transaction.releaseQR = qrData;
    transaction.releaseQRGeneratedAt = new Date();
    transaction.status = "RELEASE_QR";
    transaction.qrStatus.releaseQRScanned = false;
    await transaction.save();

    return qrData;
  }

  /**
   * Generate Invoice QR (Step 4)
   */
  async generateInvoiceQR(transaction, userId, ip, userAgent) {
    const qrData = await QRService.generateQR({
      type: "INVOICE",
      transactionId: transaction._id,
    });

    transaction.invoiceQR = qrData;
    transaction.invoiceQRGeneratedAt = new Date();
    transaction.finalInvoicePrinted = true;
    transaction.status = "INVOICE_QR";
    transaction.qrStatus.invoiceQRScanned = false;
    await transaction.save();

    // Generate final receipt data
    const receiptData = await ReceiptService.generateReceiptData(
      transaction,
      "FINAL",
    );
    transaction.receiptData = receiptData;
    await transaction.save();

    await this.auditLog(
      userId,
      "WAREHOUSE_STAFF",
      "PRINT",
      "Transaction",
      transaction._id,
      transaction.storeId,
      {
        after: { invoiceQR: qrData, status: "INVOICE_QR" },
        metadata: { ipAddress: ip, userAgent },
      },
    );

    await NotificationService.sendTransactionNotification(
      transaction,
      "invoice",
    );

    return qrData;
  }

  // ============================================================
  // QR SCANNING
  // ============================================================

  /**
   * Scan Sales QR - Show transaction details for payment
   */
  async scanSalesQR(qrData, userId, ip, userAgent) {
    const { transaction, qrType } =
      await QRService.validateAndGetTransaction(qrData);

    if (qrType !== "SALES") {
      throw new AppError("Invalid QR type for sales scan", 400);
    }

    if (transaction.status !== "SALES_QR") {
      throw new AppError(
        `Transaction is not ready for payment. Current status: ${transaction.status}`,
        400,
      );
    }

    // Mark QR as scanned
    transaction.qrStatus.salesQRScanned = true;
    transaction.qrStatus.salesQRScannedAt = new Date();
    transaction.qrStatus.salesQRScannedBy = userId;
    await transaction.save();

    const fullTransaction = await this.populateTransaction(transaction._id);
    const receiptData = await ReceiptService.generateReceiptData(
      fullTransaction,
      "SALES",
    );

    return {
      transaction: fullTransaction,
      receiptData,
      qrType,
      nextAction: "PROCEED_TO_PAYMENT",
      isValid: true,
      scannedAt: transaction.qrStatus.salesQRScannedAt,
    };
  }

  /**
   * Scan Payment QR - Show transaction details for warehouse release
   */
  async scanPaymentQR(qrData, userId, ip, userAgent) {
    const { transaction, qrType } =
      await QRService.validateAndGetTransaction(qrData);

    if (qrType !== "PAYMENT") {
      throw new AppError("Invalid QR type for payment scan", 400);
    }

    if (transaction.status !== "PAYMENT_QR") {
      throw new AppError(
        `Transaction is not ready for warehouse release. Current status: ${transaction.status}`,
        400,
      );
    }

    // Mark QR as scanned
    transaction.qrStatus.paymentQRScanned = true;
    transaction.qrStatus.paymentQRScannedAt = new Date();
    transaction.qrStatus.paymentQRScannedBy = userId;
    await transaction.save();

    const fullTransaction = await this.populateTransaction(transaction._id);

    // Get inventory status for each item
    const itemsWithInventory =
      await this.getItemsWithInventory(fullTransaction);

    const receiptData = await ReceiptService.generateReceiptData(
      fullTransaction,
      "PAYMENT",
    );

    return {
      transaction: {
        ...fullTransaction.toObject(),
        items: itemsWithInventory,
      },
      receiptData,
      qrType,
      nextAction: "PROCEED_TO_WAREHOUSE",
      isValid: true,
      scannedAt: transaction.qrStatus.paymentQRScannedAt,
    };
  }

  /**
   * Scan Release QR - Show transaction details for invoice
   */
  async scanReleaseQR(qrData, userId, ip, userAgent) {
    const { transaction, qrType } =
      await QRService.validateAndGetTransaction(qrData);

    if (qrType !== "RELEASE") {
      throw new AppError("Invalid QR type for release scan", 400);
    }

    if (
      transaction.status !== "RELEASE_QR" &&
      transaction.status !== "RELEASED"
    ) {
      throw new AppError(
        `Transaction is not ready for invoice. Current status: ${transaction.status}`,
        400,
      );
    }

    // Mark QR as scanned
    transaction.qrStatus.releaseQRScanned = true;
    transaction.qrStatus.releaseQRScannedAt = new Date();
    transaction.qrStatus.releaseQRScannedBy = userId;
    await transaction.save();

    const fullTransaction = await this.populateTransaction(transaction._id);
    const receiptData = await ReceiptService.generateReceiptData(
      fullTransaction,
      "INVOICE",
    );

    // Generate Invoice QR (Step 4)
    const invoiceQR = await this.generateInvoiceQR(
      fullTransaction,
      userId,
      ip,
      userAgent,
    );

    return {
      transaction: fullTransaction,
      receiptData,
      invoiceQR,
      qrType,
      nextAction: "PROCEED_TO_INVOICE",
      isValid: true,
      scannedAt: transaction.qrStatus.releaseQRScannedAt,
    };
  }

  /**
   * Scan Invoice QR - Complete transaction
   */
  async scanInvoiceQR(qrData, userId, ip, userAgent) {
    const { transaction, qrType } =
      await QRService.validateAndGetTransaction(qrData);

    if (qrType !== "INVOICE") {
      throw new AppError("Invalid QR type for invoice scan", 400);
    }

    if (transaction.status !== "INVOICE_QR") {
      throw new AppError(
        `Transaction is not ready for completion. Current status: ${transaction.status}`,
        400,
      );
    }

    // Mark QR as scanned
    transaction.qrStatus.invoiceQRScanned = true;
    transaction.qrStatus.invoiceQRScannedAt = new Date();
    transaction.qrStatus.invoiceQRScannedBy = userId;
    await transaction.save();

    // Complete the transaction
    transaction.status = "COMPLETED";
    transaction.completedAt = new Date();
    transaction.completedBy = userId;
    await transaction.save();

    const fullTransaction = await this.populateTransaction(transaction._id);
    const receiptData = await ReceiptService.generateReceiptData(
      fullTransaction,
      "FINAL",
    );
    fullTransaction.receiptData = receiptData;
    await fullTransaction.save();

    await this.auditLog(
      userId,
      "WAREHOUSE_STAFF",
      "UPDATE",
      "Transaction",
      transaction._id,
      transaction.storeId,
      {
        after: { status: "COMPLETED" },
        metadata: { ipAddress: ip, userAgent },
      },
    );

    await NotificationService.sendTransactionNotification(
      transaction,
      "completed",
    );

    return {
      transaction: fullTransaction,
      receiptData,
      qrType,
      nextAction: "TRANSACTION_COMPLETE",
      isValid: true,
      scannedAt: transaction.qrStatus.invoiceQRScannedAt,
    };
  }

  // ============================================================
  // PAYMENT PROCESSING
  // ============================================================

  /**
   * Process Payment and generate Payment QR (Step 2)
   */
  async processPayment(
    transactionId,
    userId,
    paymentMethod,
    amountPaid,
    paymentDetails,
    ip,
    userAgent,
  ) {
    const transaction = await Transaction.findById(transactionId)
      .populate("items")
      .populate("storeId");

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    if (transaction.status !== "SALES_QR") {
      throw new AppError(
        `Transaction not ready for payment. Current status: ${transaction.status}`,
        400,
      );
    }

    const totalAmount = transaction.totalAmount;
    const change = amountPaid - totalAmount;

    if (change < 0) {
      throw new AppError("Insufficient payment amount", 400);
    }

    // Process payment via PaymentService
    const paymentResult = await PaymentService.processPayment(
      transactionId,
      userId,
      {
        method: paymentMethod,
        amountPaid,
        details: paymentDetails,
        change,
      },
      ip,
      userAgent,
    );

    // Update transaction
    transaction.paymentMethod = paymentMethod;
    transaction.paymentAmount = totalAmount;
    transaction.amountPaid = amountPaid;
    transaction.changeAmount = change;
    transaction.paymentTimestamp = new Date();
    transaction.financeAttendantId = userId;
    transaction.paymentStatus = "PAID";
    transaction.status = "PAID";
    await transaction.save();

    // Generate Payment QR
    await this.generatePaymentQR(transaction, userId, ip, userAgent);

    // Generate receipt data
    const receiptData = await ReceiptService.generateReceiptData(
      transaction,
      "PAYMENT",
    );
    transaction.receiptData = receiptData;
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
          paymentMethod: paymentMethod,
          paymentAmount: totalAmount,
          status: "PAYMENT_QR",
        },
        metadata: { ipAddress: ip, userAgent },
      },
    );

    await NotificationService.sendTransactionNotification(transaction, "paid");

    return {
      transaction,
      payment: paymentResult.payment,
      paymentQR: transaction.paymentQR,
      receiptData,
      change,
    };
  }

  // ============================================================
  // WAREHOUSE RELEASE
  // ============================================================

  /**
   * Release Stock and generate Release QR (Step 3)
   */
  async releaseStock(transactionId, userId, releasedItems, ip, userAgent) {
    const transaction = await Transaction.findById(transactionId)
      .populate("items")
      .populate("storeId");

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    if (transaction.status !== "PAYMENT_QR") {
      throw new AppError(
        `Transaction not ready for release. Current status: ${transaction.status}`,
        400,
      );
    }

    // Process releases
    const { releaseResults, releaseErrors } = await this.processReleases(
      transaction,
      releasedItems,
      userId,
    );

    if (releaseResults.length === 0) {
      throw new AppError("No items were released successfully", 400);
    }

    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, "0")}`;

    // Update transaction
    transaction.warehouseStaffId = userId;
    transaction.releaseTimestamp = new Date();
    transaction.warehouseStatus = "RELEASED";
    transaction.finalInvoiceNumber = invoiceNumber;
    transaction.itemsReleased = releaseResults;
    transaction.status = "RELEASED";
    await transaction.save();

    // Generate Release QR
    await this.generateReleaseQR(transaction, userId, ip, userAgent);

    // Generate Invoice QR
    await this.generateInvoiceQR(transaction, userId, ip, userAgent);

    // Generate receipt data
    const receiptData = await ReceiptService.generateReceiptData(
      transaction,
      "RELEASE",
    );
    transaction.receiptData = receiptData;
    await transaction.save();

    await this.auditLog(
      userId,
      "WAREHOUSE_STAFF",
      "UPDATE",
      "Transaction",
      transaction._id,
      transaction.storeId,
      {
        after: {
          warehouseStatus: "RELEASED",
          status: "RELEASE_QR",
          invoiceNumber,
          itemsReleased: releaseResults,
        },
        metadata: { ipAddress: ip, userAgent, releasedItems },
      },
    );

    await NotificationService.sendTransactionNotification(
      transaction,
      "released",
    );

    return {
      transaction,
      invoiceNumber,
      releaseQR: transaction.releaseQR,
      invoiceQR: transaction.invoiceQR,
      releaseResults,
      releaseErrors,
      receiptData,
    };
  }

  /**
   * Process individual releases
   */
  async processReleases(transaction, releasedItems, userId) {
    const releaseResults = [];
    const releaseErrors = [];

    for (const release of releasedItems) {
      const { productId, quantity } = release;

      if (!productId || !quantity || quantity <= 0) {
        releaseErrors.push({ productId, error: "Invalid quantity" });
        continue;
      }

      try {
        const result = await InventoryService.releaseStock(
          productId,
          transaction.storeId,
          quantity,
        );

        const item = transaction.items.find(
          (i) => i.productId._id.toString() === productId,
        );

        if (item) {
          releaseResults.push({
            productId,
            productName: item.name || "Product",
            sku: item.sku || "",
            quantityReleased: quantity,
            unitPrice: item.unitPrice || 0,
            totalPrice: (item.unitPrice || 0) * quantity,
            releasedBy: userId,
            releasedAt: new Date(),
            inventoryId: result.inventoryId,
          });
        } else {
          releaseErrors.push({
            productId,
            error: "Product not found in transaction",
          });
        }
      } catch (error) {
        releaseErrors.push({ productId, error: error.message });
      }
    }

    return { releaseResults, releaseErrors };
  }

  // ============================================================
  // QR VALIDATION
  // ============================================================

  /**
   * Validate any QR and determine next action
   */
  async validateQRAndGetAction(qrData, user) {
    // const validation = await QRService.validateQR(qrData);

    // if (!validation.valid) {
    //   return {
    //     isValid: false,
    //     error: validation.error || "Invalid QR code",
    //   };
    // }

    // const { transaction, qrType } = validation;
    let result;

    try {
      result = await QRService.validateAndGetTransaction(qrData);
    } catch (err) {
      return {
        isValid: false,
        error: err.message,
      };
    }

    const { transaction, qrType } = result;

    // Check access
    if (
      user.role !== "SUPER_ADMIN" &&
      user.role !== "ADMIN" &&
      transaction.storeId?.toString() !== user.storeId?.toString()
    ) {
      return {
        isValid: false,
        error: "Access denied to this transaction",
      };
    }

    let nextAction = null;
    let nextStep = null;

    switch (qrType) {
      case "SALES":
        if (transaction.status === "SALES_QR") {
          nextAction = "PROCEED_TO_PAYMENT";
          nextStep = "PAYMENT";
        }
        break;
      case "PAYMENT":
        if (transaction.status === "PAYMENT_QR") {
          nextAction = "PROCEED_TO_WAREHOUSE";
          nextStep = "RELEASE";
        }
        break;
      case "RELEASE":
        if (transaction.status === "RELEASE_QR") {
          nextAction = "PROCEED_TO_INVOICE";
          nextStep = "INVOICE";
        }
        break;
      case "INVOICE":
        if (transaction.status === "INVOICE_QR") {
          nextAction = "COMPLETE_TRANSACTION";
          nextStep = "COMPLETE";
        }
        break;
    }

    const fullTransaction = await this.populateTransaction(transaction._id);

    return {
      transaction: fullTransaction,
      qrType,
      nextAction,
      nextStep,
      receiptData: transaction.receiptData || null,
      isValid: true,
      status: transaction.status,
      qrStatus: transaction.qrStatus,
    };
  }

  // ============================================================
  // QUERY METHODS
  // ============================================================

  /**
   * Get all QR codes for a transaction
   */
  async getTransactionQRs(transactionId, user) {
    const transaction = await this.getTransactionById(transactionId, user);

    return {
      salesQR: transaction.salesQR,
      paymentQR: transaction.paymentQR,
      releaseQR: transaction.releaseQR,
      invoiceQR: transaction.invoiceQR,
      salesQRGeneratedAt: transaction.salesQRGeneratedAt,
      paymentQRGeneratedAt: transaction.paymentQRGeneratedAt,
      releaseQRGeneratedAt: transaction.releaseQRGeneratedAt,
      invoiceQRGeneratedAt: transaction.invoiceQRGeneratedAt,
      qrStatus: transaction.qrStatus,
      status: transaction.status,
    };
  }

  /**
   * Get transaction by ID with full details
   */
  async getTransactionById(id, user) {
    const transaction = await this.populateTransaction(id);

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    if (
      user.role !== "SUPER_ADMIN" &&
      user.role !== "ADMIN" &&
      transaction.storeId?.toString() !== user.storeId?.toString()
    ) {
      throw new AppError("Access denied", 403);
    }

    return transaction;
  }

  /**
   * Get transactions with filters
   */
  async getTransactions(query, user) {
    const { page = 1, limit = 20, status, startDate, endDate, storeId } = query;

    const filter = {};

    if (user.role !== "SUPER_ADMIN") {
      filter.storeId = user.storeId;
    } else if (storeId) {
      filter.storeId = storeId;
    }

    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      // Transaction.find(filter)
      //   .populate("salesAttendantId", "firstName lastName")
      //   .populate("financeAttendantId", "firstName lastName")
      //   .populate("warehouseStaffId", "firstName lastName")
      Transaction.find(filter)
        .populate({
          path: "items",
          populate: {
            path: "productId",
            select:
              "name sku description category brand unitPrice taxRate warehouseLocation",
          },
        })
        .populate("salesAttendantId", "firstName lastName")
        .populate("financeAttendantId", "firstName lastName")
        .populate("warehouseStaffId", "firstName lastName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(filter),
    ]);

    return {
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  /**
   * Get transaction by QR code (for scanning)
   */
  async getTransactionByQR(qrData) {
    const validation = await QRService.validateQR(qrData);

    if (!validation.valid) {
      throw new AppError(validation.error || "Invalid QR code", 400);
    }

    const transaction = await this.populateTransaction(
      validation.data.transactionId,
    );

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    return {
      transaction,
      qrType: validation.data.type,
      step: validation.data.step,
      metadata: validation.data.metadata,
    };
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  /**
   * Populate transaction with all related data
   */
  async populateTransaction(id) {
    return await Transaction.findById(id)
      .populate({
        path: "items",
        populate: {
          path: "productId",
          select: "name sku unitPrice taxRate description category brand",
        },
      })
      .populate("itemsReleased.productId")
      .populate("itemsReleased.releasedBy", "firstName lastName")
      .populate("storeId")
      .populate("salesAttendantId", "firstName lastName email")
      .populate("financeAttendantId", "firstName lastName email")
      .populate("warehouseStaffId", "firstName lastName email");
  }

  /**
   * Get items with inventory status
   */
  async getItemsWithInventory(transaction) {
    console.log(
      JSON.stringify(
        transaction.items.map((item) => ({
          id: item._id,
          productId: item.productId,
          name: item.name,
        })),
        null,
        2,
      ),
    );
    return await Promise.all(
      transaction.items.map(async (item) => {
        const inventory = await Inventory.findOne({
          productId: item.productId._id,
          storeId: transaction.storeId,
        });

        return {
          ...item.toObject(),
          inventory: inventory
            ? {
                available: inventory.quantity,
                reserved: inventory.reservedQuantity,
                reorderPoint: inventory.reorderPoint,
              }
            : {
                available: 0,
                reserved: 0,
                reorderPoint: 0,
              },
        };
      }),
    );
  }
}

module.exports = new TransactionService();
