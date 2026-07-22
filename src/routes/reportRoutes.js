
// // routes/reportRoutes.js
// const express = require("express");
// const router = express.Router();
// const reportController = require("../controllers/reportController");
// const protect = require("../middleware/auth");
// const rbacMiddleware = require("../middleware/rbac");
// const rateLimiters = require("../middleware/rateLimit");

// router.use(protect);

// // Sales Report - with PDF export and advanced filters
// router.get(
//   "/sales",
//   rbacMiddleware(["report:generate"]),
//   // rateLimiters.reports,
//   reportController.salesReport
// );

// // Inventory Report - with PDF export
// router.get(
//   "/inventory",
//   rbacMiddleware(["report:generate"]),
//   // rateLimiters.reports,
//   reportController.inventoryReport
// );

// // Financial Report - with PDF export
// router.get(
//   "/financial",
//   rbacMiddleware(["report:generate"]),
//   // rateLimiters.reports,
//   reportController.financialReport
// );

// // Audit Report - with PDF export
// router.get(
//   "/audit",
//   rbacMiddleware(["report:generate", "audit:read"]),
//   // rateLimiters.reports,
//   reportController.auditReport
// );

// // User Performance Report
// router.get(
//   "/user-performance",
//   rbacMiddleware(["report:generate"]),
//   // rateLimiters.reports,
//   reportController.userPerformanceReport
// );

// // Product Performance Report
// router.get(
//   "/product-performance",
//   rbacMiddleware(["report:generate"]),
//   // rateLimiters.reports,
//   reportController.productPerformanceReport
// );

// // Store Comparison Report
// router.get(
//   "/store-comparison",
//   rbacMiddleware(["report:generate"]),
//   reportController.storeComparisonReport
// );

// module.exports = router;















// routes/reportRoutes.js
const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const protect = require("../middleware/auth");
const rbacMiddleware = require("../middleware/rbac");
const rateLimiters = require("../middleware/rateLimit");

router.use(protect);

// Sales Report - with PDF export and advanced filters
router.get(
  "/sales",
  rbacMiddleware(["report:generate"]),
  // rateLimiters.reports,
  reportController.salesReport
);

// Sales Report Download (PDF)
router.get(
  "/sales/download",
  rbacMiddleware(["report:generate"]),
  // rateLimiters.reports,
  reportController.downloadSalesReport
);

// Inventory Report - with PDF export
router.get(
  "/inventory",
  rbacMiddleware(["report:generate"]),
  // rateLimiters.reports,
  reportController.inventoryReport
);

// Inventory Report Download (PDF)
router.get(
  "/inventory/download",
  rbacMiddleware(["report:generate"]),
  // rateLimiters.reports,
  reportController.downloadInventoryReport
);

// Financial Report - with PDF export
router.get(
  "/financial",
  rbacMiddleware(["report:generate"]),
  // rateLimiters.reports,
  reportController.financialReport
);

// Financial Report Download (PDF)
router.get(
  "/financial/download",
  rbacMiddleware(["report:generate"]),
  // rateLimiters.reports,
  reportController.downloadFinancialReport
);

// Audit Report - with PDF export
router.get(
  "/audit",
  rbacMiddleware(["report:generate", "audit:read"]),
  // rateLimiters.reports,
  reportController.auditReport
);

// Audit Report Download (PDF)
router.get(
  "/audit/download",
  rbacMiddleware(["report:generate", "audit:read"]),
  // rateLimiters.reports,
  reportController.downloadAuditReport
);

// User Performance Report
router.get(
  "/user-performance",
  rbacMiddleware(["report:generate"]),
  // rateLimiters.reports,
  reportController.userPerformanceReport
);

// User Performance Report Download (PDF)
router.get(
  "/user-performance/download",
  rbacMiddleware(["report:generate"]),
  // rateLimiters.reports,
  reportController.downloadUserPerformanceReport
);

// Product Performance Report
router.get(
  "/product-performance",
  rbacMiddleware(["report:generate"]),
  // rateLimiters.reports,
  reportController.productPerformanceReport
);

// Product Performance Report Download (PDF)
router.get(
  "/product-performance/download",
  rbacMiddleware(["report:generate"]),
  // rateLimiters.reports,
  reportController.downloadProductPerformanceReport
);

// Store Comparison Report
router.get(
  "/store-comparison",
  rbacMiddleware(["report:generate"]),
  reportController.storeComparisonReport
);

// Store Comparison Report Download (PDF)
router.get(
  "/store-comparison/download",
  rbacMiddleware(["report:generate"]),
  // rateLimiters.reports,
  reportController.downloadStoreComparisonReport
);

module.exports = router;