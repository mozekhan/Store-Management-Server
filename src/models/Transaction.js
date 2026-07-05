// const mongoose = require('mongoose');

// const transactionSchema = new mongoose.Schema({
//   transactionNumber: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   storeId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Store',
//     required: true
//   },
  
//   // Sales Phase
//   salesAttendantId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   },
//   items: [{
//     productId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Product'
//     },
//     sku: String,
//     name: String,
//     quantity: Number,
//     unitPrice: Number,
//     totalPrice: Number,
//     warehouseLocation: String,
//     taxAmount: Number
//   }],
//   subtotal: {
//     type: Number,
//     default: 0
//   },
//   taxTotal: {
//     type: Number,
//     default: 0
//   },
//   totalAmount: {
//     type: Number,
//     default: 0
//   },
//   salesTimestamp: Date,
//   salesReceiptQR: String,
//   salesReceiptPrinted: {
//     type: Boolean,
//     default: false
//   },
//   salesStatus: {
//     type: String,
//     enum: ['PENDING', 'SALES_QR_PRINTED', 'CANCELLED'],
//     default: 'PENDING'
//   },
  
//   // Finance Phase
//   financeAttendantId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   },
//   paymentMethod: {
//     type: String,
//     enum: ['CASH', 'CARD', 'TRANSFER', 'CREDIT']
//   },
//   paymentAmount: Number,
//   amountPaid: Number,
//   changeAmount: Number,
//   paymentTimestamp: Date,
//   paymentReceiptQR: String,
//   paymentReceiptPrinted: {
//     type: Boolean,
//     default: false
//   },
//   paymentStatus: {
//     type: String,
//     enum: ['PENDING', 'PAID', 'REFUNDED'],
//     default: 'PENDING'
//   },
  
//   // Warehouse Phase
//   warehouseStaffId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   },
//   releaseTimestamp: Date,
//   itemsReleased: [{
//     productId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Product'
//     },
//     quantityReleased: Number,
//     releasedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User'
//     }
//   }],
//   finalInvoiceNumber: String,
//   finalInvoicePrinted: {
//     type: Boolean,
//     default: false
//   },
//   warehouseStatus: {
//     type: String,
//     enum: ['PENDING', 'RELEASED', 'PARTIAL'],
//     default: 'PENDING'
//   },
  
//   // Workflow State
//   status: {
//     type: String,
//     enum: [
//       'PENDING',
//       'SALES_QR',
//       'PAID',
//       'PAYMENT_QR',
//       'RELEASED',
//       'INVOICED',
//       'COMPLETED',
//       'CANCELLED',
//       'REFUNDED'
//     ],
//     default: 'PENDING'
//   },
  
//   // Audit
//   auditTrail: [{
//     action: String,
//     actorId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User'
//     },
//     actorRole: String,
//     timestamp: {
//       type: Date,
//       default: Date.now
//     },
//     details: Object,
//     ipAddress: String,
//     deviceInfo: String
//   }]
// }, {
//   timestamps: true
// });

// transactionSchema.index({ storeId: 1, status: 1 });
// transactionSchema.index({ salesTimestamp: -1 });

// module.exports = mongoose.model('Transaction', transactionSchema);
























// // models/Transaction.js
// const mongoose = require('mongoose');

// const transactionSchema = new mongoose.Schema({
//   transactionNumber: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   storeId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Store',
//     required: true
//   },
  
//   // Sales Phase
//   salesAttendantId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   },
//   items: [{
//     productId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Product'
//     },
//     sku: String,
//     name: String,
//     quantity: Number,
//     unitPrice: Number,
//     totalPrice: Number,
//     warehouseLocation: String,
//     taxAmount: Number,
//     discountAmount: Number,
//     discountPercentage: Number
//   }],
//   subtotal: {
//     type: Number,
//     default: 0
//   },
//   taxTotal: {
//     type: Number,
//     default: 0
//   },
//   discountTotal: {
//     type: Number,
//     default: 0
//   },
//   totalAmount: {
//     type: Number,
//     default: 0
//   },
//   salesTimestamp: Date,
  
//   // QR Codes
//   salesQR: String,           // QR after item selection
//   salesQRGeneratedAt: Date,
//   paymentQR: String,         // QR after payment
//   paymentQRGeneratedAt: Date,
//   releaseQR: String,         // QR after warehouse release
//   releaseQRGeneratedAt: Date,
//   invoiceQR: String,         // QR for final invoice
//   invoiceQRGeneratedAt: Date,
  
//   salesReceiptPrinted: {
//     type: Boolean,
//     default: false
//   },
//   salesStatus: {
//     type: String,
//     enum: ['PENDING', 'SALES_QR_PRINTED', 'CANCELLED'],
//     default: 'PENDING'
//   },
  
//   // Finance Phase
//   financeAttendantId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   },
//   paymentMethod: {
//     type: String,
//     enum: ['CASH', 'CARD', 'TRANSFER', 'CREDIT', 'MOBILE_MONEY']
//   },
//   paymentAmount: Number,
//   amountPaid: Number,
//   changeAmount: Number,
//   paymentTimestamp: Date,
//   paymentReceiptPrinted: {
//     type: Boolean,
//     default: false
//   },
//   paymentStatus: {
//     type: String,
//     enum: ['PENDING', 'PAID', 'REFUNDED'],
//     default: 'PENDING'
//   },
  
//   // Warehouse Phase
//   warehouseStaffId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   },
//   releaseTimestamp: Date,
//   itemsReleased: [{
//     productId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Product'
//     },
//     productName: String,
//     sku: String,
//     quantityReleased: Number,
//     unitPrice: Number,
//     totalPrice: Number,
//     releasedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User'
//     },
//     releasedAt: {
//       type: Date,
//       default: Date.now
//     }
//   }],
//   finalInvoiceNumber: String,
//   finalInvoicePrinted: {
//     type: Boolean,
//     default: false
//   },
//   warehouseStatus: {
//     type: String,
//     enum: ['PENDING', 'RELEASED', 'PARTIAL'],
//     default: 'PENDING'
//   },
  
//   // Workflow State
//   status: {
//     type: String,
//     enum: [
//       'PENDING',
//       'SALES_QR',
//       'PAID',
//       'PAYMENT_QR',
//       'RELEASED',
//       'RELEASE_QR',
//       'INVOICED',
//       'INVOICE_QR',
//       'COMPLETED',
//       'CANCELLED',
//       'REFUNDED'
//     ],
//     default: 'PENDING'
//   },
  
//   // Audit
//   auditTrail: [{
//     action: String,
//     actorId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User'
//     },
//     actorRole: String,
//     timestamp: {
//       type: Date,
//       default: Date.now
//     },
//     details: Object,
//     ipAddress: String,
//     deviceInfo: String
//   }],
  
//   // Receipt Data Cache
//   receiptData: {
//     type: mongoose.Schema.Types.Mixed,
//     default: null
//   }
// }, {
//   timestamps: true
// });

// transactionSchema.index({ storeId: 1, status: 1 });
// transactionSchema.index({ salesTimestamp: -1 });
// transactionSchema.index({ finalInvoiceNumber: 1 });

// module.exports = mongoose.model('Transaction', transactionSchema);


























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
  // items: [{
  //   productId: {
  //     type: mongoose.Schema.Types.ObjectId,
  //     ref: 'Product'
  //   },
  //   sku: String,
  //   name: String,
  //   quantity: Number,
  //   unitPrice: Number,
  //   totalPrice: Number,
  //   warehouseLocation: String,
  //   taxAmount: Number,
  //   discountAmount: Number,
  //   discountPercentage: Number,
  //   isReleased: {
  //     type: Boolean,
  //     default: false
  //   },
  //   releasedQuantity: {
  //     type: Number,
  //     default: 0
  //   }
  // }],
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
      'PAID',
      'SALES_QR',          // Sales QR generated - ready for payment scan
      'PAYMENT_QR',        // Payment QR generated - ready for warehouse scan
      'RELEASE_QR',        // Release QR generated - ready for invoice
      'RELEASED',
      'INVOICE_QR',        // Invoice QR generated - ready for completion
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