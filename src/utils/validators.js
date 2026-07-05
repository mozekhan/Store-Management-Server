const Joi = require('joi');

const schemas = {
  // Auth schemas
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
  }),

  // User schemas
  createUser: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    phone: Joi.string().required(),
    role: Joi.string().valid(
      'SUPER_ADMIN',
      'ADMIN',
      'SALES_MANAGER',
      'SALES_ATTENDANT',
      'FINANCE_MANAGER',
      'FINANCE_CASHIER',
      'WAREHOUSE_MANAGER',
      'WAREHOUSE_STAFF'
    ).required(),
    storeId: Joi.string().required(),
    permissions: Joi.array().items(Joi.string())
  }),

  updateUser: Joi.object({
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    phone: Joi.string(),
    role: Joi.string().valid(
      'ADMIN',
      'SALES_MANAGER',
      'SALES_ATTENDANT',
      'FINANCE_MANAGER',
      'FINANCE_CASHIER',
      'WAREHOUSE_MANAGER',
      'WAREHOUSE_STAFF'
    ),
    storeId: Joi.string(),
    permissions: Joi.array().items(Joi.string()),
    isActive: Joi.boolean()
  }),

  // Product schemas
  createProduct: Joi.object({
    sku: Joi.string().uppercase().required(),
    name: Joi.string().required(),
    description: Joi.string().allow(''),
    category: Joi.string().required(),
    subCategory: Joi.string().allow(''),
    brand: Joi.string().allow(''),
    unitPrice: Joi.number().positive().required(),
    costPrice: Joi.number().positive(),
    taxRate: Joi.number().min(0).max(100).default(0),
    warehouseLocation: Joi.object({
      aisle: Joi.string(),
      shelf: Joi.string(),
      bin: Joi.string()
    }),
    barcode: Joi.string(),
    minStockLevel: Joi.number().integer().min(0).default(5),
    maxStockLevel: Joi.number().integer().min(0),
    unitOfMeasure: Joi.string().default('each')
  }),

  updateProduct: Joi.object({
    sku: Joi.string().uppercase(),
    name: Joi.string(),
    description: Joi.string().allow(''),
    category: Joi.string(),
    subCategory: Joi.string().allow(''),
    brand: Joi.string().allow(''),
    unitPrice: Joi.number().positive(),
    costPrice: Joi.number().positive(),
    taxRate: Joi.number().min(0).max(100),
    warehouseLocation: Joi.object({
      aisle: Joi.string(),
      shelf: Joi.string(),
      bin: Joi.string()
    }),
    barcode: Joi.string(),
    minStockLevel: Joi.number().integer().min(0),
    maxStockLevel: Joi.number().integer().min(0),
    unitOfMeasure: Joi.string(),
    isActive: Joi.boolean()
  }),

  // Transaction schemas
  createTransaction: Joi.object({
    storeId: Joi.string()
  }),

  addTransactionItem: Joi.object({
    productId: Joi.string().required(),
    quantity: Joi.number().integer().positive().required()
  }),

  processPayment: Joi.object({
    paymentMethod: Joi.string().valid('CASH', 'CARD', 'TRANSFER', 'CREDIT', 'MOBILE_MONEY').required(),
    amountPaid: Joi.number().positive().required(),
    reference: Joi.string().allow(''),
    details: Joi.object({
      cardDetails: Joi.object({
        last4: Joi.string().length(4),
        cardType: Joi.string(),
        expiryMonth: Joi.string().length(2),
        expiryYear: Joi.string().length(4)
      }),
      transferDetails: Joi.object({
        bankName: Joi.string(),
        accountNumber: Joi.string(),
        reference: Joi.string()
      }),
      mobileMoneyDetails: Joi.object({
        provider: Joi.string(),
        phoneNumber: Joi.string(),
        transactionId: Joi.string()
      })
    })
  }),

  // Inventory schemas
  adjustStock: Joi.object({
    productId: Joi.string().required(),
    quantity: Joi.number().integer().required(),
    reason: Joi.string().required()
  }),

  bulkAdjustStock: Joi.object({
    adjustments: Joi.array().items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().integer().required(),
        reason: Joi.string().required()
      })
    ).min(1).required()
  }),

  // Warehouse schemas
  releaseStock: Joi.object({
    releasedItems: Joi.array().items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().integer().positive().required()
      })
    ).min(1).required()
  }),

  // Store schemas
  createStore: Joi.object({
    name: Joi.string().required(),
    code: Joi.string().uppercase().required(),
    address: Joi.object({
      street: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      country: Joi.string(),
      zipCode: Joi.string()
    }),
    phone: Joi.string(),
    email: Joi.string().email(),
    taxRate: Joi.number().min(0).max(100).default(0),
    currency: Joi.string().default('USD'),
    timezone: Joi.string().default('UTC'),
    receiptFooter: Joi.string().allow('')
  }),

  updateStore: Joi.object({
    name: Joi.string(),
    code: Joi.string().uppercase(),
    address: Joi.object({
      street: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      country: Joi.string(),
      zipCode: Joi.string()
    }),
    phone: Joi.string(),
    email: Joi.string().email(),
    taxRate: Joi.number().min(0).max(100),
    currency: Joi.string(),
    timezone: Joi.string(),
    receiptFooter: Joi.string().allow(''),
    isActive: Joi.boolean()
  }),

  // Report schemas
  reportQuery: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
    storeId: Joi.string()
  }),

  // QR validation
  validateQR: Joi.object({
    qrData: Joi.string().required()
  })
};

// Middleware to validate request
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errors
      });
    }

    req[property] = value;
    next();
  };
};

// Validation for query parameters
const validateQuery = (schema) => {
  return validate(schema, 'query');
};

// Validation for URL parameters
const validateParams = (schema) => {
  return validate(schema, 'params');
};

module.exports = {
  schemas,
  validate,
  validateQuery,
  validateParams
};