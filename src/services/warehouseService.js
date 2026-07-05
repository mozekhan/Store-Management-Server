// ============================================================
// services/warehouseService.js - Warehouse management service
// ============================================================

const Transaction = require('../models/Transaction');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const BaseService = require('./baseService');
const NotificationService = require('./notificationService');
const { AppError } = require('../middleware/errorHandler');

class WarehouseService extends BaseService {
  /**
   * Release stock for a transaction
   */
  async releaseStock(transactionId, userId, releasedItems, ip, userAgent) {
    const transaction = await Transaction.findById(transactionId)
      .populate('items.productId');

    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    if (transaction.status !== 'PAYMENT_QR') {
      throw new AppError('Transaction not ready for release', 400);
    }

    // Validate and process each item release
    const releaseResults = [];
    for (const release of releasedItems) {
      const result = await this._processItemRelease(
        release.productId,
        release.quantity,
        transaction.storeId,
        userId
      );
      releaseResults.push(result);
    }

    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;

    // Update transaction
    transaction.warehouseStaffId = userId;
    transaction.releaseTimestamp = new Date();
    transaction.warehouseStatus = 'RELEASED';
    transaction.status = 'RELEASED';
    transaction.finalInvoiceNumber = invoiceNumber;
    transaction.itemsReleased = releaseResults.map(r => ({
      productId: r.productId,
      quantityReleased: r.quantity,
      releasedBy: userId,
      inventoryId: r.inventoryId
    }));
    await transaction.save();

    // Log audit
    await this.auditLog(
      userId,
      'WAREHOUSE_STAFF',
      'UPDATE',
      'Transaction',
      transaction._id,
      transaction.storeId,
      {
        after: {
          warehouseStatus: 'RELEASED',
          status: 'RELEASED',
          invoiceNumber,
          itemsReleased: transaction.itemsReleased
        },
        metadata: {
          ipAddress: ip,
          userAgent,
          releasedItems
        }
      },
      'INFO'
    );

    // Send notification
    await NotificationService.sendTransactionNotification(transaction, 'released');

    return {
      transaction,
      invoiceNumber,
      releaseResults
    };
  }

  /**
   * Process individual item release
   */
  async _processItemRelease(productId, quantity, storeId, userId) {
    const inventory = await Inventory.findOne({
      productId,
      storeId
    });

    if (!inventory) {
      throw new AppError(`Inventory not found for product ${productId}`, 404);
    }

    if (inventory.quantity < quantity) {
      throw new AppError(`Insufficient stock for product ${productId}. Available: ${inventory.quantity}`, 400);
    }

    // Deduct stock
    const beforeQuantity = inventory.quantity;
    inventory.quantity -= quantity;
    inventory.reservedQuantity -= quantity;
    await inventory.save();

    // Log inventory movement
    await this.auditLog(
      userId,
      'WAREHOUSE_STAFF',
      'UPDATE',
      'Inventory',
      inventory._id,
      storeId,
      {
        before: { quantity: beforeQuantity },
        after: { quantity: inventory.quantity },
        metadata: {
          action: 'RELEASE_STOCK',
          productId,
          quantityReleased: quantity
        }
      },
      'INFO'
    );

    // Check low stock
    if (inventory.quantity <= inventory.reorderPoint) {
      const product = await Product.findById(productId);
      await NotificationService.sendLowStockNotification(product, inventory);
    }

    return {
      productId,
      quantity,
      inventoryId: inventory._id,
      newQuantity: inventory.quantity
    };
  }

  /**
   * Complete transaction (mark as completed)
   */
  async completeTransaction(transactionId, userId, ip, userAgent) {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    if (transaction.status !== 'RELEASED') {
      throw new AppError('Transaction not ready for completion', 400);
    }

    transaction.finalInvoicePrinted = true;
    transaction.status = 'COMPLETED';
    transaction.completedAt = new Date();
    transaction.completedBy = userId;
    await transaction.save();

    await this.auditLog(
      userId,
      'WAREHOUSE_STAFF',
      'UPDATE',
      'Transaction',
      transaction._id,
      transaction.storeId,
      {
        after: { status: 'COMPLETED' },
        metadata: { ipAddress: ip, userAgent }
      },
      'INFO'
    );

    await NotificationService.sendTransactionNotification(transaction, 'completed');

    return transaction;
  }

  /**
   * Get warehouse dashboard stats
   */
  async getWarehouseStats(storeId) {
    const [
      pendingReleases,
      totalProducts,
      totalInventory,
      lowStockItems,
      recentTransactions
    ] = await Promise.all([
      Transaction.countDocuments({
        storeId,
        status: 'PAYMENT_QR'
      }),
      Product.countDocuments({ storeId, isActive: true }),
      Inventory.aggregate([
        { $match: { storeId } },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]),
      Inventory.countDocuments({
        storeId,
        $expr: { $lte: ['$quantity', '$reorderPoint'] }
      }),
      Transaction.find({
        storeId,
        status: { $in: ['RELEASED', 'COMPLETED'] }
      })
        .sort({ releaseTimestamp: -1 })
        .limit(10)
        .populate('salesAttendantId', 'firstName lastName')
        .populate('warehouseStaffId', 'firstName lastName')
    ]);

    return {
      pendingReleases,
      totalProducts,
      totalInventory: totalInventory[0]?.total || 0,
      lowStockItems,
      recentTransactions
    };
  }

  /**
   * Get transaction for warehouse processing
   */
  async getTransactionForWarehouse(transactionId, user) {
    const transaction = await Transaction.findById(transactionId)
      .populate('items.productId')
      .populate('salesAttendantId', 'firstName lastName email')
      .populate('financeAttendantId', 'firstName lastName email');

    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    // Check access
    if (user.role !== 'SUPER_ADMIN' &&
        user.role !== 'ADMIN' &&
        transaction.storeId?.toString() !== user.storeId?.toString()) {
      throw new AppError('Access denied', 403);
    }

    // Get inventory status for each item
    const itemsWithInventory = await Promise.all(
      transaction.items.map(async (item) => {
        const inventory = await Inventory.findOne({
          productId: item.productId._id,
          storeId: transaction.storeId
        });

        return {
          ...item.toObject(),
          inventory: inventory ? {
            available: inventory.quantity,
            reserved: inventory.reservedQuantity,
            reorderPoint: inventory.reorderPoint
          } : {
            available: 0,
            reserved: 0,
            reorderPoint: 0
          }
        };
      })
    );

    return {
      ...transaction.toObject(),
      items: itemsWithInventory
    };
  }

  /**
   * Get warehouse transactions with filters
   */
  async getWarehouseTransactions(query, user) {
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate
    } = query;

    const filter = {};

    if (user.role !== 'SUPER_ADMIN') {
      filter.storeId = user.storeId;
    }

    // Only warehouse-related statuses
    filter.status = status || {
      $in: ['PAYMENT_QR', 'RELEASED', 'COMPLETED']
    };

    if (startDate || endDate) {
      filter.releaseTimestamp = {};
      if (startDate) filter.releaseTimestamp.$gte = new Date(startDate);
      if (endDate) filter.releaseTimestamp.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('salesAttendantId', 'firstName lastName')
        .populate('financeAttendantId', 'firstName lastName')
        .populate('warehouseStaffId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(filter)
    ]);

    return {
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  /**
   * Get inventory item details for warehouse
   */
  async getWarehouseInventoryItem(productId, storeId, user) {
    if (user.role !== 'SUPER_ADMIN' &&
        user.role !== 'ADMIN' &&
        storeId?.toString() !== user.storeId?.toString()) {
      throw new AppError('Access denied', 403);
    }

    const inventory = await Inventory.findOne({ productId, storeId })
      .populate('productId');

    if (!inventory) {
      throw new AppError('Inventory not found', 404);
    }

    // Get location details
    const location = inventory.warehouseLocation || {};

    return {
      ...inventory.toObject(),
      locationDetails: {
        aisle: location.aisle || 'N/A',
        shelf: location.shelf || 'N/A',
        bin: location.bin || 'N/A'
      }
    };
  }

  /**
   * Bulk update inventory locations
   */
  async bulkUpdateLocations(updates, userId, storeId, ip, userAgent) {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new AppError('Updates array is required', 400);
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { productId, location } = update;

        const inventory = await Inventory.findOne({ productId, storeId });
        if (!inventory) {
          errors.push({
            productId,
            error: 'Inventory not found'
          });
          continue;
        }

        const before = inventory.toObject();
        inventory.warehouseLocation = {
          aisle: location?.aisle || inventory.warehouseLocation?.aisle || '',
          shelf: location?.shelf || inventory.warehouseLocation?.shelf || '',
          bin: location?.bin || inventory.warehouseLocation?.bin || ''
        };
        await inventory.save();

        await this.auditLog(
          userId,
          'WAREHOUSE_STAFF',
          'UPDATE',
          'Inventory',
          inventory._id,
          storeId,
          {
            before: { warehouseLocation: before.warehouseLocation },
            after: { warehouseLocation: inventory.warehouseLocation },
            metadata: { ipAddress: ip, userAgent }
          },
          'INFO'
        );

        results.push({
          productId,
          location: inventory.warehouseLocation,
          success: true
        });
      } catch (error) {
        errors.push({
          productId: update.productId,
          error: error.message
        });
      }
    }

    return {
      results,
      errors,
      totalProcessed: results.length,
      totalErrors: errors.length
    };
  }
}

module.exports = new WarehouseService();