const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const protect = require("../middleware/auth");
const rbacMiddleware = require("../middleware/rbac");

router.use(protect);


router.get(
  "/",
  paymentController.getPayments,
);
router.get(
  "/transaction/:transactionId",
  paymentController.getPaymentsByTransaction,
);
router.get("/stats", paymentController.getPaymentStats);
router.post(
  "/process/:id",
  rbacMiddleware(["payment:process"]),
  paymentController.processPayment,
);
router.post(
  "/refund/:paymentId",
  rbacMiddleware(["payment:refund"]),
  paymentController.refundPayment,
);

module.exports = router;
