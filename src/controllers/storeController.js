// ============================================================
// controllers/storeController.js - Store management controller
// ============================================================

const StoreService = require('../services/storeService');
const { AppError } = require('../middleware/errorHandler');

/**
 * Create a new store
 */
exports.createStore = async (req, res) => {
  try {
    const store = await StoreService.createStore(
      req.body,
      req.user._id,
      req.ip,
      req.headers['user-agent']
    );

    res.status(201).json({
      success: true,
      data: store,
      message: 'Store created successfully'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get stores list
 */
exports.getStores = async (req, res) => {
  try {
    const result = await StoreService.getStores(req.query, req.user);

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
 * Get store by ID
 */
exports.getStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await StoreService.getStoreById(id, req.user);

    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update store
 */
exports.updateStore = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await StoreService.updateStore(
      id,
      req.body,
      req.user._id,
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      data: store,
      message: 'Store updated successfully'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete (deactivate) store
 */
exports.deleteStore = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await StoreService.deleteStore(
      id,
      req.user._id,
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      data: store,
      message: 'Store deactivated successfully'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get store statistics
 */
exports.getStoreStats = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check access
    await StoreService.validateStoreAccess(id, req.user);
    
    // const stats = await StoreService.getStoreStats(id);
    const stats = await StoreService.getStoreStats(id, req.user);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get store options for dropdowns
 */
exports.getStoreOptions = async (req, res) => {
  try {
    const options = await StoreService.getStoreOptions(req.user);

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get store by code
 */
exports.getStoreByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const store = await StoreService.getStoreByCode(code);

    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};