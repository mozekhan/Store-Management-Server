const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");
const protect = require("../middleware/auth");
const rbacMiddleware = require("../middleware/rbac");
const rateLimiters = require("../middleware/rateLimit");

router.use(protect);

router.get(
  "/low-stock",
  rbacMiddleware(["inventory:read"]),
  inventoryController.getLowStockItems,
);
router.get(
  "/summary",
  rbacMiddleware(["inventory:read"]),
  inventoryController.getInventorySummary,
);
router.get(
  "/product/:productId",
  rbacMiddleware(["inventory:read"]),
  inventoryController.getInventoryByProduct,
);
router.get(
  "/",
  rbacMiddleware(["inventory:read"]),
  inventoryController.getInventory,
);
router.post(
  "/adjust",
  rbacMiddleware(["inventory:adjust"]),
  rateLimiters.sensitive,
  inventoryController.adjustStock,
);
router.post(
  "/bulk-adjust",
  rbacMiddleware(["inventory:adjust"]),
  rateLimiters.sensitive,
  inventoryController.bulkAdjustStock,
);

module.exports = router;
