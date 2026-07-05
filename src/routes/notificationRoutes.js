const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const protect = require("../middleware/auth");


router.use(protect);


router.get("/", notificationController.getNotifications);

router.get("/unread-count", notificationController.getUnreadCount);

router.put("/:id/read", notificationController.markNotificationRead);

router.put("/read-all", notificationController.markAllNotificationsRead);

router.delete("/:id", notificationController.deleteNotification);

router.delete("/", notificationController.deleteAllNotifications);

module.exports = router;
