const mongoose = require("mongoose");

const transactionItemSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transaction",
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  sku: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  description: {
    type: String,
    default: "",
  },

  category: String,

  subCategory: String,

  brand: String,

  barcode: String,

  imageUrl: String,

  unitOfMeasure: String,
  warehouseLocation: {
    aisle: String,
    shelf: String,
    bin: String,
  },
  isReleased: {
    type: Boolean,
    default: false,
  },
  releasedQuantity: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

transactionItemSchema.index({ transactionId: 1 });
transactionItemSchema.index({ productId: 1 });

module.exports = mongoose.model("TransactionItem", transactionItemSchema);
