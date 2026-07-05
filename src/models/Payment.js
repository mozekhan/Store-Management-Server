const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
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
  paymentNumber: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  amountPaid: {
    type: Number,
    required: true,
    min: 0
  },
  change: {
    type: Number,
    default: 0,
    min: 0
  },
  method: {
    type: String,
    enum: ['CASH', 'CARD', 'TRANSFER', 'CREDIT', 'MOBILE_MONEY'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  reference: String,
  cardDetails: {
    last4: String,
    cardType: String,
    expiryMonth: String,
    expiryYear: String
  },
  transferDetails: {
    bankName: String,
    accountNumber: String,
    reference: String
  },
  mobileMoneyDetails: {
    provider: String,
    phoneNumber: String,
    transactionId: String
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  processedAt: {
    type: Date,
    default: Date.now
  },
  refundedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  refundedAt: Date,
  refundReason: String,
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

paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ processedAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);