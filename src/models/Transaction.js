const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionNumber: {
    type: String,
    required: true,
    unique: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  
  // Sales Phase
  salesAttendantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  items: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TransactionItem",
  },
],
  subtotal: {
    type: Number,
    default: 0
  },
  taxTotal: {
    type: Number,
    default: 0
  },
  discountTotal: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  salesTimestamp: Date,
  
  // QR Codes - Each step has its own QR
  salesQR: String,           // QR after item selection (Step 1)
  salesQRGeneratedAt: Date,
  paymentQR: String,         // QR after payment (Step 2)
  paymentQRGeneratedAt: Date,
  releaseQR: String,         // QR after warehouse release (Step 3)
  releaseQRGeneratedAt: Date,
  invoiceQR: String,         // QR for final invoice (Step 4)
  invoiceQRGeneratedAt: Date,
  
  // QR Status Tracking
  qrStatus: {
    salesQRScanned: {
      type: Boolean,
      default: false
    },
    salesQRScannedAt: Date,
    salesQRScannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    paymentQRScanned: {
      type: Boolean,
      default: false
    },
    paymentQRScannedAt: Date,
    paymentQRScannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    releaseQRScanned: {
      type: Boolean,
      default: false
    },
    releaseQRScannedAt: Date,
    releaseQRScannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    invoiceQRScanned: {
      type: Boolean,
      default: false
    },
    invoiceQRScannedAt: Date,
    invoiceQRScannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  salesReceiptPrinted: {
    type: Boolean,
    default: false
  },
  salesStatus: {
    type: String,
    enum: ['PENDING', 'SALES_QR_PRINTED', 'CANCELLED'],
    default: 'PENDING'
  },
  
  // Finance Phase
  financeAttendantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'CARD', 'TRANSFER', 'CREDIT', 'MOBILE_MONEY']
  },
  paymentAmount: Number,
  amountPaid: Number,
  changeAmount: Number,
  paymentTimestamp: Date,
  paymentReceiptPrinted: {
    type: Boolean,
    default: false
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'REFUNDED'],
    default: 'PENDING'
  },
  
  // Warehouse Phase
  warehouseStaffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  releaseTimestamp: Date,
  itemsReleased: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: String,
    sku: String,
    quantityReleased: Number,
    unitPrice: Number,
    totalPrice: Number,
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    releasedAt: {
      type: Date,
      default: Date.now
    }
  }],
  finalInvoiceNumber: String,
  finalInvoicePrinted: {
    type: Boolean,
    default: false
  },
  warehouseStatus: {
    type: String,
    enum: ['PENDING', 'RELEASED', 'PARTIAL'],
    default: 'PENDING'
  },
  
  // Workflow State
  status: {
    type: String,
    enum: [
      'PENDING',           // Initial state
      'SALES_QR', 
      'PAID',         
      'PAYMENT_QR',        // Payment QR generated - ready for warehouse scan
      'RELEASE_QR',        // Release QR generated - ready for invoice
      'INVOICE_QR',        
      'COMPLETED',         // Transaction complete
      'CANCELLED',
      'REFUNDED'
    ],
    default: 'PENDING'
  },
  
  // Receipt Data Cache
  receiptData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Audit
  auditTrail: [{
    action: String,
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    actorRole: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: Object,
    ipAddress: String,
    deviceInfo: String
  }]
}, {
  timestamps: true
});

transactionSchema.index({ storeId: 1, status: 1 });
transactionSchema.index({ salesTimestamp: -1 });
transactionSchema.index({ finalInvoiceNumber: 1 });
// transactionSchema.index({ transactionNumber: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);