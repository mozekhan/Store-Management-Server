const express = require("express");
const router = express.Router();
const warehouseController = require("../controllers/warehouseController");
const protect = require("../middleware/auth");
const rbacMiddleware = require("../middleware/rbac");

router.use(protect);

router.get(
  "/stats",
  rbacMiddleware(["inventory:read"]),
  warehouseController.getWarehouseStats,
);
router.get(
  "/transactions",
  rbacMiddleware(["inventory:read"]),
  warehouseController.getWarehouseTransactions,
);
router.get(
  "/transactions/:id",
  rbacMiddleware(["inventory:read"]),
  warehouseController.getTransactionForWarehouse,
);
router.get(
  "/inventory/:productId",
  rbacMiddleware(["inventory:read"]),
  warehouseController.getWarehouseInventoryItem,
);
router.post(
  "/transactions/:id/release",
  rbacMiddleware(["inventory:release"]),
  warehouseController.releaseStock,
);
router.post(
  "/transactions/:id/complete",
  rbacMiddleware(["inventory:release"]),
  warehouseController.completeTransaction,
);
router.put(
  "/inventory/locations",
  rbacMiddleware(["inventory:adjust"]),
  warehouseController.bulkUpdateLocations,
);

module.exports = router;
