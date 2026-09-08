const express = require('express');
const router = express.Router();
const {
    create,
    getAll,
    getById,
    getByCustomer,
    updateStatus,
    exportCSV,
    resyncShipeaso,
    getUnsyncedOrders,
    syncAllUnsynced,
    validateMobile,
    deleteOrdersPreview,
    bulkDeleteOrders
} = require('../controllers/orderController');
const { auth } = require('../middlewares/auth.js');

router.post('/createOrder', create);
router.all('/validateMobile', validateMobile);
router.get('/getAllOrders',  auth, getAll);
router.get('/exportCSV',     auth, exportCSV);
router.get('/getById/:id',   getById);
router.get('/getByCustomer/:customerId', getByCustomer);
router.put('/updateStatus/:id', auth, updateStatus);
router.post('/resyncShipeaso/:id', auth, resyncShipeaso);
router.get('/getUnsyncedOrders',  auth, getUnsyncedOrders);
router.post('/syncAllUnsynced',   auth, syncAllUnsynced);

// Permanent bulk delete by date range (admin only)
router.get('/deleteOrdersPreview', auth, deleteOrdersPreview);
router.post('/bulkDeleteOrders',   auth, bulkDeleteOrders);

module.exports = router;
