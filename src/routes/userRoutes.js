// const express = require("express");
// const router = express.Router();
// const userController = require("../controllers/userController");
// const protect = require("../middleware/auth");
// const rbacMiddleware = require("../middleware/rbac");
// const rateLimiters = require("../middleware/rateLimit");

// router.use(protect);

// router.get(
//   "/",
//   rbacMiddleware(["user:create", "user:update"]),
//   userController.getUsers,
// );
// router.get(
//   "/:id",
//   rbacMiddleware(["user:create", "user:update"]),
//   userController.getUserById,
// );
// router.post(
//   "/",
//   rbacMiddleware(["user:create"]),
//   rateLimiters.sensitive,
//   userController.createUser,
// );
// router.put("/:id", rbacMiddleware(["user:update"]), userController.updateUser);

// router.delete(
//   "/:id",
//   rbacMiddleware(["user:create"]),
//   userController.deleteUser,
// );

// module.exports = router;


















const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const protect = require("../middleware/auth");
const rbacMiddleware = require("../middleware/rbac");
const rateLimiters = require("../middleware/rateLimit");

router.use(protect);

// Get current user with store context
router.get("/me", userController.getCurrentUserWithStore);

// Get user's accessible stores
router.get("/stores", userController.getUserStores);

// Switch current store
router.post("/switch-store", userController.switchStore);

router.get(
  "/",
  rbacMiddleware(["user:create", "user:update"]),
  userController.getUsers,
);
router.get(
  "/:id",
  rbacMiddleware(["user:create", "user:update"]),
  userController.getUserById,
);
router.post(
  "/",
  rbacMiddleware(["user:create"]),
  rateLimiters.sensitive,
  userController.createUser,
);
router.put("/:id", rbacMiddleware(["user:update"]), userController.updateUser);

router.delete(
  "/:id",
  rbacMiddleware(["user:create"]),
  userController.deleteUser,
);

module.exports = router;