const WarehouseService = require('../services/warehouseService');

/**
 * Release stock for a transaction
 */
exports.releaseStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { releasedItems } = req.body;

    if (!releasedItems || !Array.isArray(releasedItems) || releasedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Released items array is required'
      });
    }

    const result = await WarehouseService.releaseStock(
      id,
      req.user._id,
      releasedItems,
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      data: result,
      message: 'Stock released successfully'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Complete transaction
 */
exports.completeTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await WarehouseService.completeTransaction(
      id,
      req.user._id,
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      data: transaction,
      message: 'Transaction completed successfully'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

// warehouseController.js - Add getReleaseQueue method

/**
 * Get release queue for warehouse
 */
exports.getReleaseQueue = async (req, res) => {
  try {
    const storeId = req.user.role === 'SUPER_ADMIN' 
      ? req.query.storeId 
      : req.user.storeId;

    const limit = parseInt(req.query.limit) || 20;
    
    const queue = await WarehouseService.getReleaseQueue(storeId, limit);

    res.json({
      success: true,
      data: queue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get warehouse dashboard stats
 */
exports.getWarehouseStats = async (req, res) => {
  try {
    const storeId = req.user.role === 'SUPER_ADMIN' 
      ? req.query.storeId 
      : req.user.storeId;

    const stats = await WarehouseService.getWarehouseStats(storeId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get transaction for warehouse processing
 */
exports.getTransactionForWarehouse = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await WarehouseService.getTransactionForWarehouse(
      id,
      req.user
    );

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get warehouse transactions
 */
exports.getWarehouseTransactions = async (req, res) => {
  try {
    const result = await WarehouseService.getWarehouseTransactions(
      req.query,
      req.user
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get inventory item for warehouse
 */
exports.getWarehouseInventoryItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const storeId = req.user.role === 'SUPER_ADMIN'
      ? req.query.storeId
      : req.user.storeId;

    const inventory = await WarehouseService.getWarehouseInventoryItem(
      productId,
      storeId,
      req.user
    );

    res.json({
      success: true,
      data: inventory
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Bulk update inventory locations
 */
exports.bulkUpdateLocations = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required'
      });
    }

    const storeId = req.user.role === 'SUPER_ADMIN'
      ? req.query.storeId
      : req.user.storeId;

    const result = await WarehouseService.bulkUpdateLocations(
      updates,
      req.user._id,
      storeId,
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};