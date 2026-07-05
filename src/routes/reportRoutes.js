const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const protect = require("../middleware/auth");
const rbacMiddleware = require("../middleware/rbac");
const rateLimiters = require("../middleware/rateLimit");

router.use(protect);

router.get(
  "/sales",
  rbacMiddleware(["report:generate"]),
  rateLimiters.reports,
  reportController.salesReport,
);
router.get(
  "/inventory",
  rbacMiddleware(["report:generate"]),
  rateLimiters.reports,
  reportController.inventoryReport,
);
router.get(
  "/financial",
  rbacMiddleware(["report:generate"]),
  rateLimiters.reports,
  reportController.financialReport,
);
router.get(
  "/user-performance",
  rbacMiddleware(["report:generate"]),
  rateLimiters.reports,
  reportController.userPerformanceReport,
);
router.get(
  "/product-performance",
  rbacMiddleware(["report:generate"]),
  rateLimiters.reports,
  reportController.productPerformanceReport,
);
router.get(
  "/store-comparison",
  reportController.storeComparisonReport,
);

module.exports = router;
