const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const protect = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getCurrentUser);
router.put('/change-password', protect, authController.changePassword);
router.post('/reset-password', authController.resetPassword);


module.exports = router;


