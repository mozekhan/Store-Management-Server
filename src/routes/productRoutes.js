const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const protect = require("../middleware/auth");
const rbacMiddleware = require("../middleware/rbac");

router.use(protect);

router.get(
  "/categories",
  rbacMiddleware(["inventory:read"]),
  productController.getProductCategories,
);
router.get(
  "/",
  rbacMiddleware(["inventory:read"]),
  productController.getProducts,
);
router.get(
  "/:id",
  rbacMiddleware(["inventory:read"]),
  productController.getProductById,
);
router.post(
  "/",
  rbacMiddleware(["inventory:adjust"]),
  productController.createProduct,
);
router.post(
  "/bulk",
  rbacMiddleware(["inventory:adjust"]),
  productController.bulkCreateProducts,
);
router.put(
  "/:id",
  rbacMiddleware(["inventory:adjust"]),
  productController.updateProduct,
);
router.delete(
  "/:id",
  rbacMiddleware(["inventory:adjust"]),
  productController.deleteProduct,
);

module.exports = router;
