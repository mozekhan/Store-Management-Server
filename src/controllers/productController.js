
const ProductService = require('../services/productService');

/**
 * Create product
 */
exports.createProduct = async (req, res) => {
  try {
    const result = await ProductService.createProduct(
      req.body,
      req.user._id,
      req.user.storeId,
      req.ip,
      req.headers['user-agent']
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'Product created successfully'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get products
 */
exports.getProducts = async (req, res) => {
  try {
    const result = await ProductService.getProducts(req.query, req.user);

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
 * Get product by ID
 */
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await ProductService.getProductById(id, req.user);

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update product
 */
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await ProductService.updateProduct(
      id,
      req.body,
      req.user._id,
      req.user,
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete product
 */
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await ProductService.deleteProduct(
      id,
      req.user._id,
      req.user,
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      message: 'Product deactivated successfully'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get product categories
 */
exports.getProductCategories = async (req, res) => {
  try {
    const categories = await ProductService.getProductCategories(req.user);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Bulk create products
 */
exports.bulkCreateProducts = async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Products array is required'
      });
    }

    const result = await ProductService.bulkCreateProducts(
      products,
      req.user._id,
      req.user.storeId,
      req.ip,
      req.headers['user-agent']
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'Bulk product creation completed'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};