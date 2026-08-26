const express = require('express');
const router = express.Router();
const { create, getAll, getById, getByCustomer, updateStatus, exportCSV, resyncShipeaso, getUnsyncedOrders, syncAllUnsynced } = require('../controllers/orderController');
const { auth } = require('../middlewares/auth.js');

router.post('/createOrder', create);
router.get('/getAllOrders',  auth, getAll);
router.get('/exportCSV',     auth, exportCSV);
router.get('/getById/:id',   getById);
router.get('/getByCustomer/:customerId', getByCustomer);
router.put('/updateStatus/:id', auth, updateStatus);
router.post('/resyncShipeaso/:id', auth, resyncShipeaso);
router.get('/getUnsyncedOrders',  auth, getUnsyncedOrders);
router.post('/syncAllUnsynced',   auth, syncAllUnsynced);

module.exports = router;
