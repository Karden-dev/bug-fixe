// src/routes/remittances.routes.js
const express = require('express');
const router = express.Router();
const remittancesController = require('../controllers/remittances.controller');

// Affiche la liste des versements
router.get('/', remittancesController.getRemittances);

// Déclenche le paiement pour un versement spécifique
router.post('/pay/:remittanceId', remittancesController.payRemittance);

// --- Autres routes de support ---
router.get('/details/:shopId', remittancesController.getRemittanceDetails);
router.put('/shop-details/:shopId', remittancesController.updateShopPaymentDetails);
router.get('/export-pdf', remittancesController.exportPdf);


module.exports = router;