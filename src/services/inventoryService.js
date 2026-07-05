
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const BaseService = require('./baseService');
const NotificationService = require('./notificationService');
const { AppError } = require('../middleware/errorHandler');
const AuditLog = require('../models/AuditLog');

class InventoryService extends BaseService {
  /**
   * Check stock availability
   */
  async checkStock(productId, storeId, quantity) {
    const inventory = await Inventory.findOne({ productId, storeId });
    if (!inventory) {
      throw new AppError('Product not found in inventory', 404);
    }

    const available = inventory.quantity - inventory.reservedQuantity;
    if (available < quantity) {
      throw new AppError(`Insufficient stock. Available: ${available}, Requested: ${quantity}`, 400);
    }

    return { available, inventory, sufficient: available >= quantity };
  }

  /**
   * Reserve stock
   */
  async reserveStock(productId, storeId, quantity) {
    const inventory = await Inventory.findOne({ productId, storeId });
    if (!inventory) {
      throw new AppError('Product not found in inventory', 404);
    }

    const available = inventory.quantity - inventory.reservedQuantity;
    if (available < quantity) {
      throw new AppError(`Insufficient stock to reserve. Available: ${available}`, 400);
    }

    inventory.reservedQuantity += quantity;
    await inventory.save();

    return inventory;
  }

  /**
   * Release stock (deduct from inventory)
   */
  async releaseStock(productId, storeId, quantity) {
    const inventory = await Inventory.findOne({ productId, storeId });
    if (!inventory) {
      throw new AppError('Product not found in inventory', 404);
    }

    if (inventory.quantity < quantity) {
      throw new AppError(`Insufficient stock to release. Available: ${inventory.quantity}`, 400);
    }

    inventory.quantity -= quantity;
    inventory.reservedQuantity -= quantity;
    await inventory.save();

    // Check low stock
    if (inventory.quantity <= inventory.reorderPoint) {
      const product = await Product.findById(productId);
      await NotificationService.sendLowStockNotification(product, inventory);
    }

    return inventory;
  }

  /**
   * Adjust stock (positive or negative)
   */
  async adjustStock(productId, storeId, quantity, reason, userId, ip, userAgent) {
    if (quantity === 0) {
      throw new AppError('Adjustment quantity cannot be zero', 400);
    }

    const inventory = await Inventory.findOne({ productId, storeId }).populate('productId');
    if (!inventory) {
      throw new AppError('Inventory not found', 404);
    }

    const beforeQuantity = inventory.quantity;
    const newQuantity = inventory.quantity + quantity;

    if (newQuantity < 0) {
      throw new AppError(`Insufficient stock. Current quantity: ${inventory.quantity}`, 400);
    }

    inventory.quantity = newQuantity;
    inventory.lastCounted = new Date();
    await inventory.save();

    await this.auditLog(
      userId,
      null,
      'UPDATE',
      'Inventory',
      inventory._id,
      storeId,
      {
        before: { quantity: beforeQuantity },
        after: { quantity: inventory.quantity },
        metadata: {
          ipAddress: ip,
          userAgent,
          reason,
          adjustment: quantity,
          productName: inventory.productId?.name,
          productSku: inventory.productId?.sku
        }
      },
      quantity < 0 ? 'WARNING' : 'INFO'
    );

    // Check low stock
    if (inventory.quantity <= inventory.reorderPoint && inventory.quantity > 0) {
      const product = await Product.findById(productId);
      await NotificationService.sendLowStockNotification(product, inventory);
    }

    return {
      inventory,
      adjustment: quantity,
      reason,
      previousQuantity: beforeQuantity,
      newQuantity: inventory.quantity
    };
  }

  /**
   * Bulk adjust stock
   */
  async bulkAdjustStock(adjustments, userId, storeId, ip, userAgent) {
    if (!Array.isArray(adjustments) || adjustments.length === 0) {
      throw new AppError('Adjustments array is required', 400);
    }

    const results = [];
    const errors = [];

    for (const adjustment of adjustments) {
      try {
        const { productId, quantity, reason } = adjustment;

        if (!reason) {
          errors.push({ productId, error: 'Reason is required' });
          continue;
        }

        const result = await this.adjustStock(
          productId,
          storeId,
          quantity,
          reason,
          userId,
          ip,
          userAgent
        );

        results.push({
          productId,
          productName: result.inventory.productId?.name || 'Unknown',
          previousQuantity: result.previousQuantity,
          newQuantity: result.newQuantity,
          adjustment: result.adjustment
        });
      } catch (error) {
        errors.push({ productId: adjustment.productId, error: error.message });
      }
    }

    return { results, errors, totalProcessed: results.length, totalErrors: errors.length };
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(storeId) {
    return await Inventory.find({
      storeId,
      $expr: { $lte: ['$quantity', '$reorderPoint'] }
    }).populate('productId');
  }

  /**
   * Get inventory summary
   */
  async getInventorySummary(storeId) {
    const stats = await Inventory.aggregate([
      { $match: { storeId } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: '$quantity' },
          totalReserved: { $sum: '$reservedQuantity' },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$quantity', '$reorderPoint'] }, 1, 0]
            }
          },
          outOfStockCount: {
            $sum: {
              $cond: [{ $eq: ['$quantity', 0] }, 1, 0]
            }
          }
        }
      }
    ]);

    return stats[0] || {
      totalItems: 0,
      totalReserved: 0,
      lowStockCount: 0,
      outOfStockCount: 0
    };
  }

  /**
   * Get inventory with filters
   */
  async getInventory(query, user) {
    const {
      page = 1,
      limit = 20,
      lowStock,
      outOfStock,
      search,
      category,
      sortBy = 'quantity',
      sortOrder = 'asc'
    } = query;

    const storeId = user.role === 'SUPER_ADMIN' ? query.storeId : user.storeId;

    const filter = { storeId };

    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$quantity', '$reorderPoint'] };
    }
    if (outOfStock === 'true') {
      filter.quantity = 0;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let inventoryQuery = Inventory.find(filter)
      .populate({
        path: 'productId',
        match: { isActive: true },
        populate: { path: 'storeId', select: 'name code' }
      })
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit));

    let inventory = await inventoryQuery;
    inventory = inventory.filter(item => item.productId !== null);

    if (search) {
      inventory = inventory.filter(item =>
        item.productId.name.toLowerCase().includes(search.toLowerCase()) ||
        item.productId.sku.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (category) {
      inventory = inventory.filter(item => item.productId.category === category);
    }

    const total = await Inventory.countDocuments(filter);
    const stats = await this.getInventorySummary(storeId);

    return {
      inventory,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  async getInventoryByProduct(productId, storeId) {
    if (!productId) {
      throw new AppError('Product ID is required', 400);
    }

    // Find inventory for this product and store
    let inventory = await Inventory.findOne({ 
      productId, 
      storeId 
    }).populate({
      path: 'productId',
      select: 'name sku category unitPrice costPrice minStockLevel maxStockLevel'
    });

    // If no inventory found, create one
    if (!inventory) {
      const product = await Product.findById(productId).select('name sku unitPrice');
      if (!product) {
        throw new AppError('Product not found', 404);
      }

      // Create initial inventory record
      inventory = await Inventory.create({
        productId,
        storeId,
        quantity: 0,
        reservedQuantity: 0,
        reorderPoint: 5,
        minStockLevel: 5,
        maxStockLevel: 100,
        lastCounted: new Date(),
        movements: [],
        auditLog: []
      });

      // Populate product details
      inventory = await Inventory.findById(inventory._id).populate({
        path: 'productId',
        select: 'name sku category unitPrice costPrice minStockLevel maxStockLevel'
      });
    }

    // Get recent movements (last 50)
    const recentMovements = await this.getRecentMovements(productId, storeId, 50);

    // Get audit log (last 20)
    const auditLog = await AuditLog(productId, storeId, 20);

    // Return enriched inventory data
    return {
      _id: inventory._id,
      productId: inventory.productId._id,
      quantity: inventory.quantity || 0,
      reservedQuantity: inventory.reservedQuantity || 0,
      reorderPoint: inventory.reorderPoint || 5,
      minStockLevel: inventory.minStockLevel || 5,
      maxStockLevel: inventory.maxStockLevel || 100,
      warehouseLocation: inventory.warehouseLocation || {
        aisle: '',
        shelf: '',
        bin: ''
      },
      lastCounted: inventory.lastCounted || null,
      movements: recentMovements,
      auditLog: auditLog,
      product: inventory.productId
    };
  }

  /**
   * Get recent movements for a product
   */
  async getRecentMovements(productId, storeId, limit = 50) {
    try {
      // This would typically query a movements collection
      // For now, we'll return sample data or empty array
      // You can implement this based on your schema
      const movements = [];
      
      // If you have a Movement model, you would query it here:
      // const Movement = require('../models/Movement');
      // const movements = await Movement.find({ productId, storeId })
      //   .sort({ timestamp: -1 })
      //   .limit(limit)
      //   .populate('actorId', 'firstName lastName');
      
      return movements;
    } catch (error) {
      console.error('Error fetching movements:', error);
      return [];
    }
  }
}

module.exports = new InventoryService();