// src/routes/reports.routes.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller'); 

// Route pour obtenir le rapport journalier agrégé
router.get('/', reportController.getReports);

// Route pour obtenir le rapport détaillé d'un marchand
router.get('/detailed', reportController.getDetailedReport);

// Route pour traiter les frais de stockage
router.post('/process-storage', reportController.processStorage);

// Route pour forcer le recalcul d'un rapport journalier
router.post('/recalculate-report', reportController.recalculateReport);

// NOUVELLE ROUTE : Exportation PDF
router.get('/export-pdf', reportController.exportPdf);

module.exports = router;
