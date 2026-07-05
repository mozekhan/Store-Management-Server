const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  reservedQuantity: {
    type: Number,
    default: 0
  },
  warehouseLocation: {
    aisle: String,
    shelf: String,
    bin: String
  },
  lastCounted: Date,
  reorderPoint: {
    type: Number,
    default: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

inventorySchema.index({ productId: 1, storeId: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);