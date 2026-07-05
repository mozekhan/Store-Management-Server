
// const express = require('express');
// const router = express.Router();
// const storeController = require('../controllers/storeController');
// const protect = require('../middleware/auth');
// const rbacMiddleware = require("../middleware/rbac");
// const rateLimiters = require("../middleware/rateLimit");

// router.use(protect);

// router.get('/options', storeController.getStoreOptions);
// router.get('/:code/by-code', storeController.getStoreByCode);
// router.get('/', storeController.getStores);
// router.get('/:id', storeController.getStoreById);
// router.get('/:id/stats', storeController.getStoreStats);
// router.post('/', storeController.createStore);
// router.put('/:id', storeController.updateStore);
// router.delete('/:id', storeController.deleteStore);

// module.exports = router;





















const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const protect = require('../middleware/auth');
const rbacMiddleware = require("../middleware/rbac");
const rateLimiters = require("../middleware/rateLimit");

router.use(protect);

router.get('/options', storeController.getStoreOptions);
router.get('/:code/by-code', storeController.getStoreByCode);
router.get('/', storeController.getStores);
router.get('/:id', storeController.getStoreById);
router.get('/:id/stats', storeController.getStoreStats);
router.post('/', rbacMiddleware(["store:manage"]), storeController.createStore);
router.put('/:id', rbacMiddleware(["store:manage"]), storeController.updateStore);
router.delete('/:id', rbacMiddleware(["store:manage"]), storeController.deleteStore);

module.exports = router;