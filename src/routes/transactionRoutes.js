// const express = require("express");
// const router = express.Router();
// const transactionController = require("../controllers/transactionController");
// const protect = require("../middleware/auth");
// const rbacMiddleware = require("../middleware/rbac");
// const rateLimiters = require("../middleware/rateLimit");

// router.use(protect);

// router.get(
//   "/",
//   rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
//   transactionController.getTransactions,
// );
// router.get(
//   "/:id",
//   rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
//   transactionController.getTransactionById,
// );
// router.post(
//   "/",
//   rbacMiddleware(["transaction:create"]),
//   transactionController.createTransaction,
// );
// router.post(
//   "/:id/items",
//   rbacMiddleware(["transaction:create"]),
//   transactionController.addItem,
// );
// router.post(
//   "/:id/sales-qr",
//   rbacMiddleware(["transaction:create"]),
//   transactionController.generateSalesQR,
// );
// router.post(
//   "/:id/payment",
//   rbacMiddleware(["payment:process"]),
//   transactionController.processPayment,
// );
// router.post(
//   "/:id/release",
//   rbacMiddleware(["inventory:release"]),
//   transactionController.releaseStock,
// );
// router.post(
//   "/:id/complete",
//   rbacMiddleware(["inventory:release"]),
//   transactionController.completeTransaction,
// );
// router.post(
//   "/validate-qr",
//   rateLimiters.scan,
//   transactionController.validateQR,
// );

// module.exports = router;




















// // routes/transactionRoutes.js
// const express = require("express");
// const router = express.Router();
// const transactionController = require("../controllers/transactionController");
// const protect = require("../middleware/auth");
// const rbacMiddleware = require("../middleware/rbac");
// const rateLimiters = require("../middleware/rateLimit");

// router.use(protect);

// // Transaction CRUD
// router.get(
//   "/",
//   rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
//   transactionController.getTransactions,
// );
// router.get(
//   "/:id",
//   rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
//   transactionController.getTransactionById,
// );
// router.get(
//   "/:id/qrs",
//   rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
//   transactionController.getTransactionQRs,
// );

// // Sales Phase
// router.post(
//   "/",
//   rbacMiddleware(["transaction:create"]),
//   transactionController.createTransaction,
// );
// router.post(
//   "/:id/items",
//   rbacMiddleware(["transaction:create"]),
//   transactionController.addItem,
// );

// router.post(
//   "/:id/items/batch",
//   rbacMiddleware(["transaction:create"]),
//   transactionController.addBatchItems,
// );
// router.post(
//   "/with-items",
//   rbacMiddleware(["transaction:create"]),
//   transactionController.createTransactionWithItems,
// );
// router.post(
//   "/:id/sales-qr",
//   rbacMiddleware(["transaction:create"]),
//   transactionController.generateSalesQR,
// );

// // Payment Phase
// router.post(
//   "/:id/payment",
//   rbacMiddleware(["payment:process"]),
//   transactionController.processPayment,
// );

// // Warehouse Phase
// router.post(
//   "/:id/release",
//   rbacMiddleware(["inventory:release"]),
//   transactionController.releaseStock,
// );
// router.post(
//   "/:id/complete",
//   rbacMiddleware(["inventory:release"]),
//   transactionController.completeTransaction,
// );

// // QR Validation
// router.post(
//   "/validate-qr",
//   rateLimiters.scan,
//   transactionController.validateQR,
// );

// // Receipt
// router.get(
//   "/:id/receipt",
//   rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
//   transactionController.getReceipt,
// );
// router.get(
//   "/:id/receipt/print",
//   rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
//   transactionController.printReceipt,
// );

// module.exports = router;




























const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");
const protect = require("../middleware/auth");
const rbacMiddleware = require("../middleware/rbac");
const rateLimiters = require("../middleware/rateLimit");

router.use(protect);

// Transaction CRUD
router.get(
  "/",
  rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
  transactionController.getTransactions,
);
router.get(
  "/:id",
  rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
  transactionController.getTransactionById,
);
router.get(
  "/:id/qrs",
  rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
  transactionController.getTransactionQRs,
);

// Create transaction with items (generates Sales QR)
router.post(
  "/with-items",
  rbacMiddleware(["transaction:create"]),
  rateLimiters.sensitive,
  transactionController.createTransactionWithItems,
);

// QR Scanning endpoints (each step has its own scan)
router.post(
  "/scan/sales",
  rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
  rateLimiters.scan,
  transactionController.scanSalesQR,
);
router.post(
  "/scan/payment",
  rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
  rateLimiters.scan,
  transactionController.scanPaymentQR,
);
router.post(
  "/scan/release",
  rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
  rateLimiters.scan,
  transactionController.scanReleaseQR,
);
router.post(
  "/scan/invoice",
  rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
  rateLimiters.scan,
  transactionController.scanInvoiceQR,
);

// Validate any QR (generic)
router.post(
  "/validate-qr",
  rateLimiters.scan,
  transactionController.validateQR,
);

// Sales Phase
router.post(
  "/:id/items",
  rbacMiddleware(["transaction:create"]),
  transactionController.addItem,
);
router.post(
  "/:id/sales-qr",
  rbacMiddleware(["transaction:create"]),
  transactionController.generateSalesQR,
);

// Payment Phase
router.post(
  "/:id/payment",
  rbacMiddleware(["payment:process"]),
  transactionController.processPayment,
);

// Warehouse Phase
router.post(
  "/:id/release",
  rbacMiddleware(["inventory:release"]),
  transactionController.releaseStock,
);

module.exports = router;