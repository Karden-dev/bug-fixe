// src/routes/deliverymanRemittances.routes.js
const express = require('express');
const router = express.Router();
const deliverymanRemittancesController = require('../controllers/deliverymanRemittances.controller');
const { isAuthenticated, isCashier } = require('../middleware/auth.middleware'); // Assumons ces middlewares

// Assurez-vous que seul un caissier ou un administrateur peut accéder à ces routes
// router.use(isAuthenticated, isCashier); 

// GET /api/deliveryman-remittances/summary
// Résumé journalier des versements des livreurs (pour le tableau principal)
router.get('/summary', deliverymanRemittancesController.getDailySummary);

// GET /api/deliveryman-remittances/details/:deliverymanId
// Détail des commandes pour un livreur (pour la modale d'action)
router.get('/details/:deliverymanId', deliverymanRemittancesController.getDeliverymanDetails);

// POST /api/deliveryman-remittances/confirm (à implémenter pour la confirmation)
// router.post('/confirm', deliverymanRemittancesController.confirmRemittance);

module.exports = router;