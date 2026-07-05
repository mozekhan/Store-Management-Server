const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },

  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  type: {
    type: String,
    enum: ['SALES', 'PAYMENT', 'RELEASE', 'INVOICE', 'FINAL'],
    required: true
  },
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },
  // QR Code Data
  qrCode: {
    type: String,
    required: true
  },

qrPayload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
},
  // Receipt Data Cache (full transaction data)
  receiptData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // File Storage
  filePath: String,
  fileSize: Number,
  fileType: {
    type: String,
    enum: ['PDF', 'HTML', 'TEXT'],
    default: 'PDF'
  },
  // Printing
  printed: {
    type: Boolean,
    default: false
  },
  printedAt: Date,
  printedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  printCount: {
    type: Number,
    default: 0
  },
  // Email
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  emailRecipient: String,
  // Additional
  notes: String,
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

receiptSchema.index({ transactionId: 1 });
receiptSchema.index({ type: 1 });
// receiptSchema.index({ receiptNumber: 1 });
receiptSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Receipt', receiptSchema);