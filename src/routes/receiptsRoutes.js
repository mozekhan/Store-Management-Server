// const express = require("express");
// const router = express.Router();
// const receiptController = require("../controllers/receiptController");
// const protect = require("../middleware/auth");
// const rbacMiddleware = require("../middleware/rbac");

// router.use(protect);

// router.get(
//   "/:id",
//   rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
//   receiptController.getReceiptById,
// );
// router.get(
//   "/transaction/:transactionId",
//   rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
//   receiptController.getReceiptsByTransaction,
// );
// router.post("/:id/generate", receiptController.generateReceiptPDF);
// router.post("/:id/print", receiptController.markReceiptPrinted);
// router.get("/:id/download", receiptController.downloadReceipt);

// module.exports = router;























// routes/receiptRoutes.js
const express = require("express");
const router = express.Router();
const receiptController = require("../controllers/receiptController");
const protect = require("../middleware/auth");
const rbacMiddleware = require("../middleware/rbac");

router.use(protect);

// Get all receipts with pagination
router.get(
  "/",
  rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
  receiptController.getReceipts,
);

// Get receipt by ID
router.get(
  "/:id",
  rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
  receiptController.getReceiptById,
);

// Get receipt preview with formatted data
router.get(
  "/:id/preview",
  rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
  receiptController.getReceiptPreview,
);

// Get receipts by transaction
router.get(
  "/transaction/:transactionId",
  rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
  receiptController.getReceiptsByTransaction,
);

// Generate receipt
router.post(
  "/generate",
  // rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
  receiptController.generateReceipt,
);

// Mark receipt as printed
router.post(
  "/:id/print",
  rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
  receiptController.markReceiptPrinted,
);

// Download receipt
router.get(
  "/:id/download",
  rbacMiddleware(["transaction:read:own", "transaction:read:all"]),
  receiptController.downloadReceipt,
);

module.exports = router;