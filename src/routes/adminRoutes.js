const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const protect = require("../middleware/auth");
const rbacMiddleware = require("../middleware/rbac");
const rateLimiters = require('../middleware/rateLimit');

router.use(protect);
router.use(rbacMiddleware(["store:manage"]));

router.get("/stats", adminController.getSystemStats);

router.get("/stats/store/:storeId", adminController.getStoreStats);

router.get("/logs", rateLimiters.sensitive, adminController.getActivityLogs);

router.get("/integrity", rateLimiters.sensitive, adminController.verifySystemIntegrity);

router.get("/user/:userId/activity", adminController.getUserActivity);

module.exports = router;
