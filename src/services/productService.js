const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const Transaction = require("../models/Transaction");
const BaseService = require("./baseService");
const { AppError } = require("../middleware/errorHandler");
const AuditLog = require("../models/AuditLog");

class ProductService extends BaseService {
  /**
   * Create a new product
   */
  async createProduct(productData, userId, storeId, ip, userAgent) {
    const {
      sku,
      name,
      description,
      category,
      subCategory,
      brand,
      unitPrice,
      costPrice,
      taxRate,
      warehouseLocation,
      barcode,
      minStockLevel,
      maxStockLevel,
      unitOfMeasure,
      initialQuantity = 0, // ← NEW: Initial quantity parameter
    } = productData;

    // Validate
    const sanitizedSku = sku.toUpperCase().trim();
    const sanitizedName = this.sanitize(name);
    const sanitizedDescription = description ? this.sanitize(description) : "";

    if (unitPrice <= 0) {
      throw new AppError("Unit price must be greater than 0", 400);
    }

    // Validate initial quantity is not negative
    if (initialQuantity < 0) {
      throw new AppError("Initial quantity cannot be negative", 400);
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({
      sku: sanitizedSku,
      storeId,
    });
    if (existingProduct) {
      throw new AppError(
        "Product with this SKU already exists in this store",
        400,
      );
    }

    const product = new Product({
      sku: sanitizedSku,
      name: sanitizedName,
      description: sanitizedDescription,
      category,
      subCategory: subCategory || "",
      brand: brand || "",
      unitPrice,
      costPrice: costPrice || 0,
      taxRate: taxRate || 0,
      storeId,
      warehouseLocation: warehouseLocation || {},
      barcode: barcode || sanitizedSku,
      minStockLevel: minStockLevel || 5,
      maxStockLevel: maxStockLevel || 100,
      unitOfMeasure: unitOfMeasure || "each",
      isActive: true,
    });

    await product.save();

    // Create initial inventory with the provided quantity
    const inventory = new Inventory({
      productId: product._id,
      storeId,
      quantity: initialQuantity, // ← NEW: Use initialQuantity instead of 0
      reservedQuantity: 0,
      reorderPoint: minStockLevel || 5,
      warehouseLocation: warehouseLocation || {},
      lastCounted: initialQuantity > 0 ? new Date() : null, // ← NEW: Set lastCounted if quantity > 0
    });
    await inventory.save();

    // Log audit
    await this.auditLog(
      userId,
      null,
      "CREATE",
      "Product",
      product._id,
      storeId,
      {
        after: {
          sku: product.sku,
          name: product.name,
          category: product.category,
          unitPrice: product.unitPrice,
          initialQuantity: initialQuantity, // ← NEW: Log initial quantity
        },
        metadata: {
          ipAddress: ip,
          userAgent,
          initialQuantity, // ← NEW: Include in metadata
        },
      },
      "INFO",
    );

    // If initial quantity was added, log an inventory adjustment
    if (initialQuantity > 0) {
      await this.auditLog(
        userId,
        null,
        "UPDATE",
        "Inventory",
        inventory._id,
        storeId,
        {
          before: { quantity: 0 },
          after: { quantity: initialQuantity },
          metadata: {
            ipAddress: ip,
            userAgent,
            reason: "Initial stock on product creation",
            adjustment: initialQuantity,
            productName: product.name,
            productSku: product.sku,
          },
        },
        "INFO",
      );
    }

    return { product, inventory };
  }

  /**
   * Get products with filters
   */
  async getProducts(query, user) {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      isActive,
      minPrice,
      maxPrice,
      inStock,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const filter = {};

    if (user.role !== "SUPER_ADMIN") {
      filter.storeId = user.storeId;
    }

    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (minPrice) filter.unitPrice = { $gte: parseFloat(minPrice) };
    if (maxPrice) {
      filter.unitPrice = filter.unitPrice || {};
      filter.unitPrice.$lte = parseFloat(maxPrice);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    let products = await Product.find(filter)
      .populate("storeId", "name code")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get inventory for each product
    const productIds = products.map((p) => p._id);
    let inventoryData = [];

    if (productIds.length > 0) {
      const inventoryQuery = {
        productId: { $in: productIds },
        storeId: user.storeId,
      };
      inventoryData = await Inventory.find(inventoryQuery);
    }

    // Filter by stock status
    if (inStock === "true") {
      products = products.filter((product) => {
        const inventory = inventoryData.find(
          (inv) => inv.productId.toString() === product._id.toString(),
        );
        return inventory && inventory.quantity > 0;
      });
    }

    const productsWithInventory = products.map((product) => {
      const inventory = inventoryData.find(
        (inv) => inv.productId.toString() === product._id.toString(),
      );
      return {
        ...product.toObject(),
        inventory: inventory || { quantity: 0, reservedQuantity: 0 },
      };
    });

    const total = await Product.countDocuments(filter);

    return {
      products: productsWithInventory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  /**
   * Get product by ID
   */
  async getProductById(productId, user) {
    const product = await Product.findById(productId).populate(
      "storeId",
      "name code",
    );
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const productStoreId = product.storeId._id || product.storeId;
    const userStoreId = user.storeId._id || user.storeId;

    if (user.role !== "SUPER_ADMIN" && !productStoreId.equals(userStoreId)) {
      throw new AppError("Access denied", 403);
    }

    const inventory = await Inventory.findOne({
      productId: product._id,
      storeId: user.storeId,
    });

    // Get stock movement history
    const movements = await this._getProductMovements(productId, user.storeId);

    return {
      ...product.toObject(),
      inventory: inventory || { quantity: 0, reservedQuantity: 0 },
      movements,
    };
  }

  /**
   * Update product
   */
  async updateProduct(productId, updateData, userId, user, ip, userAgent) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    // Check access
    if (
      user.role !== "SUPER_ADMIN" &&
      product.storeId.toString() !== user.storeId?.toString()
    ) {
      throw new AppError("Access denied", 403);
    }

    const before = product.toObject();

    // Update fields
    const allowedUpdates = [
      "name",
      "description",
      "category",
      "subCategory",
      "brand",
      "unitPrice",
      "costPrice",
      "taxRate",
      "warehouseLocation",
      "barcode",
      "minStockLevel",
      "maxStockLevel",
      "unitOfMeasure",
    ];

    allowedUpdates.forEach((field) => {
      if (updateData[field] !== undefined) {
        if (field === "name" || field === "description") {
          product[field] = this.sanitize(updateData[field]);
        } else {
          product[field] = updateData[field];
        }
      }
    });

    // Update SKU
    if (updateData.sku) {
      const newSku = updateData.sku.toUpperCase().trim();
      const existingProduct = await Product.findOne({
        sku: newSku,
        storeId: product.storeId,
        _id: { $ne: productId },
      });
      if (existingProduct) {
        throw new AppError(
          "Product with this SKU already exists in this store",
          400,
        );
      }
      product.sku = newSku;
    }

    await product.save();

    // Update inventory reorder point
    if (updateData.minStockLevel) {
      await Inventory.findOneAndUpdate(
        { productId: product._id, storeId: user.storeId },
        {
          reorderPoint: updateData.minStockLevel,
          warehouseLocation:
            updateData.warehouseLocation || product.warehouseLocation,
        },
      );
    }

    // Log audit
    await this.auditLog(
      userId,
      null,
      "UPDATE",
      "Product",
      product._id,
      product.storeId,
      {
        before: {
          name: before.name,
          sku: before.sku,
          unitPrice: before.unitPrice,
          taxRate: before.taxRate,
          isActive: before.isActive,
        },
        after: {
          name: product.name,
          sku: product.sku,
          unitPrice: product.unitPrice,
          taxRate: product.taxRate,
          isActive: product.isActive,
        },
        metadata: { ipAddress: ip, userAgent },
      },
      "INFO",
    );

    return product;
  }

  /**
   * Delete (deactivate) product
   */
  async deleteProduct(productId, userId, user, ip, userAgent) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    // Check access
    if (
      user.role !== "SUPER_ADMIN" &&
      product.storeId.toString() !== user.storeId?.toString()
    ) {
      throw new AppError("Access denied", 403);
    }

    // Check if product has transactions
    const hasTransactions = await Transaction.exists({
      "items.productId": product._id,
    });

    if (hasTransactions) {
      throw new AppError("Cannot delete product with transaction history", 400);
    }

    const before = product.toObject();
    product.isActive = false;
    await product.save();

    // Log audit
    await this.auditLog(
      userId,
      null,
      "DELETE",
      "Product",
      product._id,
      product.storeId,
      {
        before: {
          name: before.name,
          sku: before.sku,
          isActive: before.isActive,
        },
        after: { isActive: false },
        metadata: { ipAddress: ip, userAgent },
      },
      "WARNING",
    );

    return product;
  }

  /**
   * Get product categories
   */
  async getProductCategories(user) {
    const query = {};
    if (user.role !== "SUPER_ADMIN") {
      query.storeId = user.storeId;
    }

    const categories = await Product.distinct("category", query);

    const categoryData = await Promise.all(
      categories.map(async (category) => {
        const subCategories = await Product.distinct("subCategory", {
          ...query,
          category,
        });
        return {
          category,
          subCategories: subCategories.filter((sc) => sc && sc.length > 0),
        };
      }),
    );

    return categoryData;
  }

  /**
   * Get product movements
   */
  async _getProductMovements(productId, storeId) {
    const inventory = await Inventory.findOne({ productId, storeId });
    if (!inventory) {
      return [];
    }

    return await AuditLog.find({
      resourceType: "Inventory",
      resourceId: inventory._id,
    })
      .sort({ timestamp: -1 })
      .limit(50)
      .populate("actorId", "firstName lastName");
  }

  /**
   * Bulk create products
   */
  async bulkCreateProducts(products, userId, storeId, ip, userAgent) {
    if (!Array.isArray(products) || products.length === 0) {
      throw new AppError("Products array is required", 400);
    }

    const results = [];
    const errors = [];

    for (const productData of products) {
      try {
        const result = await this.createProduct(
          productData,
          userId,
          storeId,
          ip,
          userAgent,
        );
        results.push({
          product: result.product,
          inventory: result.inventory,
          success: true,
        });
      } catch (error) {
        errors.push({
          sku: productData.sku,
          name: productData.name,
          error: error.message,
        });
      }
    }

    return {
      results,
      errors,
      totalProcessed: results.length,
      totalErrors: errors.length,
    };
  }
}

module.exports = new ProductService();
