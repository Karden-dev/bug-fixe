// src/routes/rider.routes.js
const express = require('express');
const router = express.Router();
const riderController = require('../controllers/rider.controller');
const { verifyToken, isRider } = require('../middleware/auth.middleware');

router.get('/orders', verifyToken, isRider, riderController.getRiderOrders);
router.get('/cash-owed/:riderId', verifyToken, isRider, riderController.getRiderOwedAmount);
router.get('/cash-transactions/:riderId', verifyToken, isRider, riderController.getRiderCashTransactions);
router.post('/remittance', verifyToken, isRider, riderController.submitRemittance);
router.get('/counts', verifyToken, isRider, riderController.getOrdersCounts);

module.exports = router;