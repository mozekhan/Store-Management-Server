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
    // transaction.status = "INVOICE_QR";
    // transaction.qrStatus.invoiceQRScanned = false;
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
  // async scanInvoiceQR(qrData, userId, ip, userAgent) {
  //   const { transaction, qrType } =
  //     await QRService.validateAndGetTransaction(qrData);

  //   if (qrType !== "INVOICE") {
  //     throw new AppError("Invalid QR type for invoice scan", 400);
  //   }

  //   if (transaction.status !== "INVOICE_QR") {
  //     throw new AppError(
  //       `Transaction is not ready for completion. Current status: ${transaction.status}`,
  //       400,
  //     );
  //   }

  //   // Mark QR as scanned
  //   transaction.qrStatus.invoiceQRScanned = true;
  //   transaction.qrStatus.invoiceQRScannedAt = new Date();
  //   transaction.qrStatus.invoiceQRScannedBy = userId;
  //   await transaction.save();

  //   // Complete the transaction
  //   transaction.status = "COMPLETED";
  //   transaction.completedAt = new Date();
  //   transaction.completedBy = userId;
  //   await transaction.save();

  //   const fullTransaction = await this.populateTransaction(transaction._id);
  //   const receiptData = await ReceiptService.generateReceiptData(
  //     fullTransaction,
  //     "FINAL",
  //   );
  //   fullTransaction.receiptData = receiptData;
  //   await fullTransaction.save();

  //   await this.auditLog(
  //     userId,
  //     "WAREHOUSE_STAFF",
  //     "UPDATE",
  //     "Transaction",
  //     transaction._id,
  //     transaction.storeId,
  //     {
  //       after: { status: "COMPLETED" },
  //       metadata: { ipAddress: ip, userAgent },
  //     },
  //   );

  //   await NotificationService.sendTransactionNotification(
  //     transaction,
  //     "completed",
  //   );

  //   return {
  //     transaction: fullTransaction,
  //     receiptData,
  //     qrType,
  //     nextAction: "TRANSACTION_COMPLETE",
  //     isValid: true,
  //     scannedAt: transaction.qrStatus.invoiceQRScannedAt,
  //   };
  // }

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
    // Warehouse release
    transaction.warehouseStaffId = userId;
    transaction.releaseTimestamp = new Date();
    transaction.warehouseStatus = "RELEASED";
    transaction.finalInvoiceNumber = invoiceNumber;
    transaction.itemsReleased = releaseResults;

    await transaction.save();

    // transaction.warehouseStaffId = userId;
    // transaction.releaseTimestamp = new Date();
    // transaction.warehouseStatus = "RELEASED";
    // transaction.finalInvoiceNumber = invoiceNumber;
    // transaction.itemsReleased = releaseResults;
    // transaction.status = "RELEASED";
    // await transaction.save();

    // Generate Release QR
    await this.generateReleaseQR(transaction, userId, ip, userAgent);

    // Generate Invoice QR
    await this.generateInvoiceQR(transaction, userId, ip, userAgent);

    transaction.status = "COMPLETED";
    transaction.completedAt = new Date();
    transaction.completedBy = userId;

    await transaction.save();

    // Generate receipt data
    const receiptData = await ReceiptService.generateReceiptData(
      transaction,
      "FINAL",
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
      "completed",
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

    const transactionStoreId = transaction.storeId._id || transaction.storeId;
    const userStoreId = user.storeId._id || user.storeId;

    if (
      user.role !== "SUPER_ADMIN" &&
      user.role !== "ADMIN" &&
      !transactionStoreId.equals(userStoreId)
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
          nextAction = "COMPLETE_TRANSACTION";
          nextStep = "COMPLETE";
        }
        break;
      // case "INVOICE":
      //   if (transaction.status === "INVOICE_QR") {
      //     nextAction = "COMPLETE_TRANSACTION";
      //     nextStep = "COMPLETE";
      //   }
      //   break;
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

    const transactionStoreId = transaction.storeId._id || transaction.storeId;
    const userStoreId = user.storeId._id || user.storeId;

    if (
      user.role !== "SUPER_ADMIN" &&
      user.role !== "ADMIN" &&
      !transactionStoreId.equals(userStoreId)
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

    const userStoreId = user.storeId?._id || user.storeId;

    if (user.role === "SUPER_ADMIN") {
      // Super Admin can optionally filter by store
      if (storeId) {
        filter.storeId = storeId;
      }
    } else {
      // Everyone else is restricted to their own store
      filter.storeId = userStoreId;

      // Sales attendants only see their own transactions
      if (user.role === "SALES_ATTENDANT") {
        // filter.salesAttendantId = user._id;
      }

      // Finance cashier only sees payments they processed
      if (user.role === "FINANCE_CASHIER") {
        // filter.financeAttendantId = user._id;
      }

      // Warehouse staff only sees releases they handled
      if (user.role === "WAREHOUSE_STAFF") {
        // filter.warehouseStaffId = user._id;
      }
    }

    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) filter.createdAt.$gte = new Date(startDate);

      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
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
        .limit(Number(limit)),

      Transaction.countDocuments(filter),
    ]);

    return {
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
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
