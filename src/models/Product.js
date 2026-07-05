const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  category: {
    type: String,
    required: true
  },
  subCategory: String,
  brand: String,
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  costPrice: {
    type: Number,
    min: 0
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  warehouseLocation: {
    aisle: String,
    shelf: String,
    bin: String
  },
  barcode: String,
  imageUrl: String,
  minStockLevel: {
    type: Number,
    default: 5
  },
  maxStockLevel: Number,
  unitOfMeasure: {
    type: String,
    default: 'each'
  },
  isActive: {
    type: Boolean,
    default: true
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

module.exports = mongoose.model('Product', productSchema);