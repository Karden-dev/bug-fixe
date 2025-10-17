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
router.get('/notifications', verifyToken, isRider, riderController.getRiderNotifications);

// --- NOUVELLE ROUTE AJOUTÉE POUR LA PAGE DE CAISSE DÉDIÉE ---
// Cette route renvoie le résumé et la liste détaillée des transactions pour le livreur connecté
router.get('/cash-details', verifyToken, isRider, riderController.getRiderCashPageDetails);


module.exports = router;